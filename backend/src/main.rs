//! BetterBe API Server
//! 
//! A Rust backend for habit tracking with social auth and sharing features.

mod api;
mod auth;
mod db;
mod error;
mod models;

use axum::{Router, Extension};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "betterbe_api=debug,tower_http=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database connection
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    tracing::info!("Database migrations completed");

    // Build OAuth clients
    let oauth_clients = auth::oauth::OAuthClients::new()?;

    // Build application state
    let app_state = AppState {
        db: pool,
        oauth: oauth_clients,
        jwt_secret: std::env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", axum::routing::get(health_check))
        .nest("/api", api::routes())
        .nest("/auth", auth::routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .layer(Extension(app_state));

    // Start server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    tracing::info!("Server listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

/// Health check endpoint for Docker/K8s
async fn health_check() -> &'static str {
    "OK"
}

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub oauth: auth::oauth::OAuthClients,
    pub jwt_secret: String,
}
