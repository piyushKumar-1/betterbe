//! Database module
//! 
//! This module re-exports database types and provides helper functions.

// Re-export commonly used types
pub use sqlx::PgPool;

/// Check database connection health
pub async fn health_check(pool: &PgPool) -> bool {
    sqlx::query("SELECT 1")
        .execute(pool)
        .await
        .is_ok()
}

