//! JWT token handling

use axum::{Extension, Json};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};

use crate::{AppState, error::{ApiError, ApiResult}, models::*};

const ACCESS_TOKEN_EXPIRY_HOURS: i64 = 24;
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 30;

/// Generate access and refresh tokens for a user
pub fn generate_tokens(user: &User, secret: &str) -> ApiResult<(String, String)> {
    let now = Utc::now();
    
    // Access token
    let access_claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        exp: (now + Duration::hours(ACCESS_TOKEN_EXPIRY_HOURS)).timestamp(),
        iat: now.timestamp(),
    };

    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    // Refresh token (longer expiry)
    let refresh_claims = Claims {
        sub: user.id,
        email: user.email.clone(),
        exp: (now + Duration::days(REFRESH_TOKEN_EXPIRY_DAYS)).timestamp(),
        iat: now.timestamp(),
    };

    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok((access_token, refresh_token))
}

/// Validate a JWT token and extract claims
pub fn validate_token(token: &str, secret: &str) -> ApiResult<Claims> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;

    Ok(token_data.claims)
}

/// Refresh access token endpoint
pub async fn refresh_token(
    Extension(state): Extension<AppState>,
    Json(body): Json<RefreshTokenRequest>,
) -> ApiResult<Json<AuthResponse>> {
    // Validate refresh token
    let claims = validate_token(&body.refresh_token, &state.jwt_secret)?;

    // Fetch user
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, email, name, avatar_url, 
           provider, provider_id,
           cloud_sync_enabled, created_at, updated_at 
           FROM users WHERE id = $1"#,
    )
    .bind(claims.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::Unauthorized)?;

    // Generate new tokens
    let (access_token, refresh_token) = generate_tokens(&user, &state.jwt_secret)?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        user: user.into(),
    }))
}

/// Logout endpoint (client should discard tokens)
pub async fn logout() -> ApiResult<Json<serde_json::Value>> {
    // In a more robust implementation, you'd invalidate the refresh token
    // by storing it in a blacklist or removing it from a whitelist
    Ok(Json(serde_json::json!({ "success": true })))
}
