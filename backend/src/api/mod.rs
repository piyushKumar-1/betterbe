//! API routes

mod habits;
mod goals;
mod checkins;
mod sharing;
mod sync;

use axum::Router;

pub fn routes() -> Router {
    Router::new()
        .nest("/habits", habits::routes())
        .nest("/goals", goals::routes())
        .nest("/checkins", checkins::routes())
        .nest("/sharing", sharing::routes())
        .nest("/sync", sync::routes())
}

