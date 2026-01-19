//! Habit CRUD API

use axum::{
    extract::Path,
    routing::get,
    Extension, Json, Router,
};
use sqlx::Row;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::{ApiError, ApiResult},
    models::*,
    AppState,
};

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_habits).post(create_habit))
        .route("/:id", get(get_habit).put(update_habit).delete(delete_habit))
        .route("/:id/reminder", axum::routing::put(update_reminder))
}

async fn list_habits(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<Vec<Habit>>> {
    let habits = sqlx::query_as::<_, Habit>(
        r#"SELECT id, user_id, name, description, 
           habit_type, unit, target_value,
           target_direction,
           archived, created_at, updated_at
           FROM habits WHERE user_id = $1 AND archived = false
           ORDER BY created_at DESC"#,
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(habits))
}

async fn create_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Json(body): Json<CreateHabitRequest>,
) -> ApiResult<Json<Habit>> {
    let habit = sqlx::query_as::<_, Habit>(
        r#"INSERT INTO habits (id, user_id, name, description, habit_type, unit, target_value, target_direction, archived, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
           RETURNING id, user_id, name, description,
                     habit_type, unit, target_value,
                     target_direction,
                     archived, created_at, updated_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(user.user_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.habit_type)
    .bind(&body.unit)
    .bind(body.target_value)
    .bind(body.target_direction.as_ref().unwrap_or(&TargetDirection::AtLeast))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(habit))
}

async fn get_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Habit>> {
    let habit = sqlx::query_as::<_, Habit>(
        r#"SELECT id, user_id, name, description,
           habit_type, unit, target_value,
           target_direction,
           archived, created_at, updated_at
           FROM habits WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(habit))
}

async fn update_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateHabitRequest>,
) -> ApiResult<Json<Habit>> {
    let habit = sqlx::query_as::<_, Habit>(
        r#"UPDATE habits SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           unit = COALESCE($5, unit),
           target_value = COALESCE($6, target_value),
           target_direction = COALESCE($7, target_direction),
           archived = COALESCE($8, archived),
           updated_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING id, user_id, name, description,
                     habit_type, unit, target_value,
                     target_direction,
                     archived, created_at, updated_at"#,
    )
    .bind(id)
    .bind(user.user_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.unit)
    .bind(body.target_value)
    .bind(&body.target_direction)
    .bind(body.archived)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(habit))
}

async fn delete_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let result = sqlx::query("DELETE FROM habits WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}

async fn update_reminder(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(habit_id): Path<Uuid>,
    Json(body): Json<HabitReminder>,
) -> ApiResult<Json<HabitReminder>> {
    // Verify habit ownership
    let _habit: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM habits WHERE id = $1 AND user_id = $2")
        .bind(habit_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await?;
    
    if _habit.is_none() {
        return Err(ApiError::NotFound);
    }

    let reminder = sqlx::query_as::<_, HabitReminder>(
        r#"INSERT INTO habit_reminders (id, habit_id, enabled, reminder_type, interval_hours, daily_time, random_window_start, random_window_end, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (habit_id) DO UPDATE SET
               enabled = EXCLUDED.enabled,
               reminder_type = EXCLUDED.reminder_type,
               interval_hours = EXCLUDED.interval_hours,
               daily_time = EXCLUDED.daily_time,
               random_window_start = EXCLUDED.random_window_start,
               random_window_end = EXCLUDED.random_window_end,
               updated_at = NOW()
           RETURNING id, habit_id, enabled, 
                     reminder_type,
                     interval_hours, daily_time, random_window_start, random_window_end,
                     created_at, updated_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(habit_id)
    .bind(body.enabled)
    .bind(&body.reminder_type)
    .bind(body.interval_hours)
    .bind(&body.daily_time)
    .bind(&body.random_window_start)
    .bind(&body.random_window_end)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(reminder))
}
