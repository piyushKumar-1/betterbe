//! Check-in API

use axum::{
    extract::{Path, Query},
    routing::get,
    Extension, Json, Router,
};
use chrono::NaiveDate;
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::{ApiError, ApiResult},
    models::*,
    AppState,
};

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_checkins).post(create_checkin))
        .route("/:id", axum::routing::put(update_checkin).delete(delete_checkin))
        .route("/date/:date", get(get_checkins_for_date))
}

#[derive(Debug, Deserialize)]
pub struct CheckInQuery {
    pub habit_id: Option<Uuid>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
}

async fn list_checkins(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Query(query): Query<CheckInQuery>,
) -> ApiResult<Json<Vec<CheckIn>>> {
    let checkins = sqlx::query_as::<_, CheckIn>(
        r#"SELECT c.id, c.habit_id, c.user_id, c.value, c.note, c.effective_date, c.created_at
           FROM check_ins c
           JOIN habits h ON h.id = c.habit_id
           WHERE c.user_id = $1
             AND ($2::uuid IS NULL OR c.habit_id = $2)
             AND ($3::date IS NULL OR c.effective_date >= $3)
             AND ($4::date IS NULL OR c.effective_date <= $4)
           ORDER BY c.effective_date DESC, c.created_at DESC"#,
    )
    .bind(user.user_id)
    .bind(query.habit_id)
    .bind(query.start_date)
    .bind(query.end_date)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(checkins))
}

async fn get_checkins_for_date(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(date): Path<NaiveDate>,
) -> ApiResult<Json<Vec<CheckIn>>> {
    let checkins = sqlx::query_as::<_, CheckIn>(
        r#"SELECT id, habit_id, user_id, value, note, effective_date, created_at
           FROM check_ins
           WHERE user_id = $1 AND effective_date = $2
           ORDER BY created_at DESC"#,
    )
    .bind(user.user_id)
    .bind(date)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(checkins))
}

async fn create_checkin(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Json(body): Json<CreateCheckInRequest>,
) -> ApiResult<Json<CheckIn>> {
    // Verify habit ownership
    let habit_exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM habits WHERE id = $1 AND user_id = $2",
    )
    .bind(body.habit_id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;
    
    if habit_exists.is_none() {
        return Err(ApiError::NotFound);
    }

    // Upsert check-in (one per habit per day)
    let checkin = sqlx::query_as::<_, CheckIn>(
        r#"INSERT INTO check_ins (id, habit_id, user_id, value, note, effective_date, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (habit_id, effective_date) DO UPDATE SET
               value = EXCLUDED.value,
               note = COALESCE(EXCLUDED.note, check_ins.note)
           RETURNING id, habit_id, user_id, value, note, effective_date, created_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(body.habit_id)
    .bind(user.user_id)
    .bind(body.value)
    .bind(&body.note)
    .bind(body.effective_date)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(checkin))
}

async fn update_checkin(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateCheckInRequest>,
) -> ApiResult<Json<CheckIn>> {
    let checkin = sqlx::query_as::<_, CheckIn>(
        r#"UPDATE check_ins SET
           value = COALESCE($3, value),
           note = COALESCE($4, note)
           WHERE id = $1 AND user_id = $2
           RETURNING id, habit_id, user_id, value, note, effective_date, created_at"#,
    )
    .bind(id)
    .bind(user.user_id)
    .bind(body.value)
    .bind(&body.note)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(checkin))
}

async fn delete_checkin(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let result = sqlx::query("DELETE FROM check_ins WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}
