//! OAuth provider implementations

use axum::{
    extract::Query,
    response::Redirect,
    Extension, Json,
};
use oauth2::{
    basic::BasicClient, AuthUrl, ClientId, ClientSecret, CsrfToken,
    RedirectUrl, Scope, TokenUrl, AuthorizationCode, TokenResponse,
    reqwest::async_http_client,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{AppState, error::{ApiError, ApiResult}, models::*};
use super::jwt;

/// OAuth client configuration
#[derive(Clone)]
pub struct OAuthClients {
    pub google: Option<BasicClient>,
    pub apple: Option<AppleOAuthConfig>,
}

#[derive(Clone)]
pub struct AppleOAuthConfig {
    pub client_id: String,
    pub team_id: String,
    pub key_id: String,
    pub private_key: String,
    pub redirect_uri: String,
}

impl OAuthClients {
    pub fn new() -> anyhow::Result<Self> {
        // Google OAuth
        let google = if let (Ok(client_id), Ok(client_secret)) = (
            std::env::var("GOOGLE_CLIENT_ID"),
            std::env::var("GOOGLE_CLIENT_SECRET"),
        ) {
            let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:5173/auth/google/callback".to_string());

            Some(BasicClient::new(
                ClientId::new(client_id),
                Some(ClientSecret::new(client_secret)),
                AuthUrl::new("https://accounts.google.com/o/oauth2/v2/auth".to_string())?,
                Some(TokenUrl::new("https://oauth2.googleapis.com/token".to_string())?),
            )
            .set_redirect_uri(RedirectUrl::new(redirect_uri)?))
        } else {
            tracing::warn!("Google OAuth not configured");
            None
        };

        // Apple Sign In
        let apple = if let (Ok(client_id), Ok(team_id), Ok(key_id), Ok(private_key)) = (
            std::env::var("APPLE_CLIENT_ID"),
            std::env::var("APPLE_TEAM_ID"),
            std::env::var("APPLE_KEY_ID"),
            std::env::var("APPLE_PRIVATE_KEY"),
        ) {
            let redirect_uri = std::env::var("APPLE_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:3000/auth/apple/callback".to_string());

            Some(AppleOAuthConfig {
                client_id,
                team_id,
                key_id,
                private_key,
                redirect_uri,
            })
        } else {
            tracing::warn!("Apple Sign In not configured");
            None
        };

        Ok(Self { google, apple })
    }
}

// ============ Google OAuth ============

#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: String,
    pub state: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfo {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub picture: Option<String>,
}

/// Initiate Google OAuth flow
pub async fn google_auth(
    Extension(state): Extension<AppState>,
) -> ApiResult<Redirect> {
    let client = state.oauth.google
        .as_ref()
        .ok_or_else(|| ApiError::OAuth("Google OAuth not configured".to_string()))?;

    let (auth_url, _csrf_token) = client
        .authorize_url(CsrfToken::new_random)
        .add_scope(Scope::new("email".to_string()))
        .add_scope(Scope::new("profile".to_string()))
        .url();

    Ok(Redirect::to(auth_url.as_str()))
}

/// Handle Google OAuth callback
pub async fn google_callback(
    Extension(state): Extension<AppState>,
    Query(query): Query<OAuthCallbackQuery>,
) -> ApiResult<Json<AuthResponse>> {
    let client = state.oauth.google
        .as_ref()
        .ok_or_else(|| ApiError::OAuth("Google OAuth not configured".to_string()))?;

    // Exchange code for token
    let token = client
        .exchange_code(AuthorizationCode::new(query.code))
        .request_async(async_http_client)
        .await
        .map_err(|e| ApiError::OAuth(format!("Token exchange failed: {}", e)))?;

    // Fetch user info
    let user_info: GoogleUserInfo = reqwest::Client::new()
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(token.access_token().secret())
        .send()
        .await
        .map_err(|e| ApiError::OAuth(format!("Failed to fetch user info: {}", e)))?
        .json()
        .await
        .map_err(|e| ApiError::OAuth(format!("Failed to parse user info: {}", e)))?;

    // Create or update user
    let user = upsert_user(
        &state.db,
        &user_info.email,
        user_info.name.as_deref(),
        user_info.picture.as_deref(),
        AuthProvider::Google,
        &user_info.id,
    ).await?;

    // Generate tokens
    let (access_token, refresh_token) = jwt::generate_tokens(&user, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: user.into(),
    }))
}

// ============ Apple Sign In ============

#[derive(Debug, Deserialize)]
pub struct AppleCallbackBody {
    pub code: String,
    pub id_token: Option<String>,
    pub user: Option<String>, // JSON string with user info on first sign in
}

#[derive(Debug, Deserialize)]
struct AppleUserInfo {
    pub name: Option<AppleNameInfo>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AppleNameInfo {
    #[serde(rename = "firstName")]
    pub first_name: Option<String>,
    #[serde(rename = "lastName")]
    pub last_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AppleIdTokenClaims {
    pub sub: String,
    pub email: Option<String>,
}

/// Initiate Apple Sign In (returns config for client-side)
pub async fn apple_auth(
    Extension(state): Extension<AppState>,
) -> ApiResult<Json<AppleAuthConfig>> {
    let config = state.oauth.apple
        .as_ref()
        .ok_or_else(|| ApiError::OAuth("Apple Sign In not configured".to_string()))?;

    Ok(Json(AppleAuthConfig {
        client_id: config.client_id.clone(),
        redirect_uri: config.redirect_uri.clone(),
    }))
}

#[derive(Debug, Serialize)]
pub struct AppleAuthConfig {
    pub client_id: String,
    pub redirect_uri: String,
}

/// Handle Apple Sign In callback
pub async fn apple_callback(
    Extension(state): Extension<AppState>,
    Json(body): Json<AppleCallbackBody>,
) -> ApiResult<Json<AuthResponse>> {
    let _config = state.oauth.apple
        .as_ref()
        .ok_or_else(|| ApiError::OAuth("Apple Sign In not configured".to_string()))?;

    // Decode ID token to get user info
    let id_token = body.id_token
        .ok_or_else(|| ApiError::OAuth("Missing id_token".to_string()))?;

    // Decode without verification for now (in production, verify with Apple's public keys)
    let token_parts: Vec<&str> = id_token.split('.').collect();
    if token_parts.len() != 3 {
        return Err(ApiError::OAuth("Invalid id_token format".to_string()));
    }

    let claims_json = base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        token_parts[1]
    ).map_err(|_| ApiError::OAuth("Failed to decode id_token".to_string()))?;

    let claims: AppleIdTokenClaims = serde_json::from_slice(&claims_json)
        .map_err(|_| ApiError::OAuth("Failed to parse id_token claims".to_string()))?;

    // Parse user info if provided (only on first sign in)
    let (name, email) = if let Some(user_json) = body.user {
        let user_info: AppleUserInfo = serde_json::from_str(&user_json)
            .unwrap_or(AppleUserInfo { name: None, email: None });
        
        let full_name = user_info.name.map(|n| {
            format!("{} {}", 
                n.first_name.unwrap_or_default(), 
                n.last_name.unwrap_or_default()
            ).trim().to_string()
        });

        (full_name, user_info.email.or(claims.email))
    } else {
        (None, claims.email)
    };

    let email = email.ok_or_else(|| ApiError::OAuth("Email not provided".to_string()))?;

    // Create or update user
    let user = upsert_user(
        &state.db,
        &email,
        name.as_deref(),
        None, // Apple doesn't provide avatar
        AuthProvider::Apple,
        &claims.sub,
    ).await?;

    // Generate tokens
    let (access_token, refresh_token) = jwt::generate_tokens(&user, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: user.into(),
    }))
}

// ============ Helper Functions ============

async fn upsert_user(
    db: &sqlx::PgPool,
    email: &str,
    name: Option<&str>,
    avatar_url: Option<&str>,
    provider: AuthProvider,
    provider_id: &str,
) -> ApiResult<User> {
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (id, email, name, avatar_url, provider, provider_id, cloud_sync_enabled, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW(), NOW())
        ON CONFLICT (provider, provider_id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, users.name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
            updated_at = NOW()
        RETURNING id, email, name, avatar_url, 
                  provider, provider_id,
                  cloud_sync_enabled, created_at, updated_at
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(email)
    .bind(name)
    .bind(avatar_url)
    .bind(&provider)
    .bind(provider_id)
    .fetch_one(db)
    .await?;

    Ok(user)
}
