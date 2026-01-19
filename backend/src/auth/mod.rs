//! Authentication module

pub mod jwt;
pub mod oauth;
pub mod middleware;

use axum::{
    routing::{get, post},
    Router,
};

pub fn routes() -> Router {
    Router::new()
        // OAuth routes
        .route("/google", get(oauth::google_auth))
        .route("/google/callback", get(oauth::google_callback))
        .route("/apple", get(oauth::apple_auth))
        .route("/apple/callback", post(oauth::apple_callback))
        // Token routes
        .route("/refresh", post(jwt::refresh_token))
        .route("/logout", post(jwt::logout))
        // User info
        .route("/me", get(get_me))
}

use axum::{Extension, Json};
use crate::{AppState, error::ApiResult, models::UserProfile};

async fn get_me(
    Extension(state): Extension<AppState>,
    claims: middleware::AuthUser,
) -> ApiResult<Json<UserProfile>> {
    let user = sqlx::query_as::<_, crate::models::User>(
        r#"SELECT id, email, name, avatar_url, 
           provider, provider_id,
           cloud_sync_enabled, created_at, updated_at 
           FROM users WHERE id = $1"#,
    )
    .bind(claims.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(crate::error::ApiError::NotFound)?;

    Ok(Json(user.into()))
}
