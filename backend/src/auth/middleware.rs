//! Authentication middleware

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, HeaderMap},
    Extension,
};
use uuid::Uuid;

use crate::{AppState, error::ApiError};
use super::jwt;

/// Extractor for authenticated users
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Get AppState
        let Extension(app_state) = Extension::<AppState>::from_request_parts(parts, state)
            .await
            .map_err(|_| ApiError::Internal(anyhow::anyhow!("Missing app state")))?;

        // Extract token from Authorization header
        let token = extract_bearer_token(&parts.headers)?;

        // Validate token
        let claims = jwt::validate_token(&token, &app_state.jwt_secret)?;

        Ok(AuthUser {
            user_id: claims.sub,
            email: claims.email,
        })
    }
}

/// Optional auth - doesn't fail if no token
#[derive(Debug, Clone)]
pub struct OptionalAuthUser(pub Option<AuthUser>);

#[async_trait]
impl<S> FromRequestParts<S> for OptionalAuthUser
where
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(OptionalAuthUser(Some(user))),
            Err(_) => Ok(OptionalAuthUser(None)),
        }
    }
}

fn extract_bearer_token(headers: &HeaderMap) -> Result<String, ApiError> {
    let auth_header = headers
        .get("Authorization")
        .ok_or(ApiError::Unauthorized)?
        .to_str()
        .map_err(|_| ApiError::Unauthorized)?;

    if !auth_header.starts_with("Bearer ") {
        return Err(ApiError::Unauthorized);
    }

    Ok(auth_header[7..].to_string())
}

