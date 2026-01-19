//! Goals API

use axum::{
    extract::Path,
    routing::get,
    Extension, Json, Router,
};
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::{ApiError, ApiResult},
    models::*,
    AppState,
};

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_goals).post(create_goal))
        .route("/:id", get(get_goal).put(update_goal).delete(delete_goal))
        .route("/:id/habits", get(get_goal_habits).post(link_habit))
        .route("/:id/habits/:habit_id", axum::routing::delete(unlink_habit))
}

async fn list_goals(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<Vec<Goal>>> {
    let goals = sqlx::query_as::<_, Goal>(
        r#"SELECT id, user_id, name, description, deadline,
           status, is_shared, created_at, updated_at
           FROM goals WHERE user_id = $1
           ORDER BY deadline ASC"#,
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(goals))
}

async fn create_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Json(body): Json<CreateGoalRequest>,
) -> ApiResult<Json<Goal>> {
    let mut tx = state.db.begin().await?;

    let goal = sqlx::query_as::<_, Goal>(
        r#"INSERT INTO goals (id, user_id, name, description, deadline, status, is_shared, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'active', false, NOW(), NOW())
           RETURNING id, user_id, name, description, deadline,
                     status, is_shared, created_at, updated_at"#,
    )
    .bind(Uuid::new_v4())
    .bind(user.user_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(body.deadline)
    .fetch_one(&mut *tx)
    .await?;

    // Link habits if provided
    for habit_id in &body.habit_ids {
        sqlx::query("INSERT INTO goal_habits (id, goal_id, habit_id, weight) VALUES ($1, $2, $3, 1.0)")
            .bind(Uuid::new_v4())
            .bind(goal.id)
            .bind(habit_id)
            .execute(&mut *tx)
            .await?;
    }

    tx.commit().await?;

    Ok(Json(goal))
}

async fn get_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Goal>> {
    let goal = sqlx::query_as::<_, Goal>(
        r#"SELECT id, user_id, name, description, deadline,
           status, is_shared, created_at, updated_at
           FROM goals WHERE id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(goal))
}

async fn update_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateGoalRequest>,
) -> ApiResult<Json<Goal>> {
    let goal = sqlx::query_as::<_, Goal>(
        r#"UPDATE goals SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           deadline = COALESCE($5, deadline),
           status = COALESCE($6, status),
           updated_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING id, user_id, name, description, deadline,
                     status, is_shared, created_at, updated_at"#,
    )
    .bind(id)
    .bind(user.user_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(body.deadline)
    .bind(&body.status)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    Ok(Json(goal))
}

async fn delete_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let result = sqlx::query("DELETE FROM goals WHERE id = $1 AND user_id = $2")
        .bind(id)
        .bind(user.user_id)
        .execute(&state.db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::NotFound);
    }

    Ok(Json(serde_json::json!({ "deleted": true })))
}

async fn get_goal_habits(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(goal_id): Path<Uuid>,
) -> ApiResult<Json<Vec<GoalHabit>>> {
    // Verify ownership
    let _: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM goals WHERE id = $1 AND user_id = $2")
        .bind(goal_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await?;

    let goal_habits = sqlx::query_as::<_, GoalHabit>(
        "SELECT id, goal_id, habit_id, weight FROM goal_habits WHERE goal_id = $1",
    )
    .bind(goal_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(goal_habits))
}

async fn link_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(goal_id): Path<Uuid>,
    Json(body): Json<LinkHabitRequest>,
) -> ApiResult<Json<GoalHabit>> {
    // Verify goal and habit ownership
    let goal_exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM goals WHERE id = $1 AND user_id = $2")
        .bind(goal_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await?;
    
    if goal_exists.is_none() {
        return Err(ApiError::NotFound);
    }

    let habit_exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM habits WHERE id = $1 AND user_id = $2")
        .bind(body.habit_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await?;
    
    if habit_exists.is_none() {
        return Err(ApiError::NotFound);
    }

    let goal_habit = sqlx::query_as::<_, GoalHabit>(
        r#"INSERT INTO goal_habits (id, goal_id, habit_id, weight)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (goal_id, habit_id) DO UPDATE SET weight = EXCLUDED.weight
           RETURNING id, goal_id, habit_id, weight"#,
    )
    .bind(Uuid::new_v4())
    .bind(goal_id)
    .bind(body.habit_id)
    .bind(body.weight.unwrap_or(1.0))
    .fetch_one(&state.db)
    .await?;

    Ok(Json(goal_habit))
}

async fn unlink_habit(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path((goal_id, habit_id)): Path<(Uuid, Uuid)>,
) -> ApiResult<Json<serde_json::Value>> {
    // Verify goal ownership
    let goal_exists: Option<(Uuid,)> = sqlx::query_as("SELECT id FROM goals WHERE id = $1 AND user_id = $2")
        .bind(goal_id)
        .bind(user.user_id)
        .fetch_optional(&state.db)
        .await?;
    
    if goal_exists.is_none() {
        return Err(ApiError::NotFound);
    }

    sqlx::query("DELETE FROM goal_habits WHERE goal_id = $1 AND habit_id = $2")
        .bind(goal_id)
        .bind(habit_id)
        .execute(&state.db)
        .await?;

    Ok(Json(serde_json::json!({ "unlinked": true })))
}
