//! Data sync API for cloud storage opt-in users

use axum::{
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::{ApiError, ApiResult},
    AppState,
};

pub fn routes() -> Router {
    Router::new()
        .route("/status", get(sync_status))
        .route("/enable", post(enable_cloud_sync))
        .route("/disable", post(disable_cloud_sync))
        .route("/push", post(push_data))
        .route("/pull", get(pull_data))
}

#[derive(Debug, Serialize)]
pub struct SyncStatus {
    pub enabled: bool,
    pub last_sync: Option<DateTime<Utc>>,
    pub habits_count: i64,
    pub checkins_count: i64,
    pub goals_count: i64,
}

#[derive(Debug, FromRow)]
struct UserSyncStatus {
    cloud_sync_enabled: bool,
}

async fn sync_status(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<SyncStatus>> {
    let user_record: UserSyncStatus = sqlx::query_as(
        "SELECT cloud_sync_enabled FROM users WHERE id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    let habits_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM habits WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    let checkins_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM check_ins WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    let goals_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM goals WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(SyncStatus {
        enabled: user_record.cloud_sync_enabled,
        last_sync: None, // TODO: Track last sync time
        habits_count: habits_count.0,
        checkins_count: checkins_count.0,
        goals_count: goals_count.0,
    }))
}

#[derive(Debug, Serialize)]
pub struct CloudSyncResponse {
    pub enabled: bool,
    pub message: String,
}

async fn enable_cloud_sync(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<CloudSyncResponse>> {
    sqlx::query("UPDATE users SET cloud_sync_enabled = true, updated_at = NOW() WHERE id = $1")
        .bind(user.user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(CloudSyncResponse {
        enabled: true,
        message: "Cloud sync enabled. Your data will now be securely backed up.".to_string(),
    }))
}

async fn disable_cloud_sync(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<CloudSyncResponse>> {
    sqlx::query("UPDATE users SET cloud_sync_enabled = false, updated_at = NOW() WHERE id = $1")
        .bind(user.user_id)
        .execute(&state.db)
        .await?;

    Ok(Json(CloudSyncResponse {
        enabled: false,
        message: "Cloud sync disabled. Your data remains on your device.".to_string(),
    }))
}

/// Full data export for sync
#[derive(Debug, Serialize, Deserialize)]
pub struct SyncData {
    pub habits: Vec<HabitSyncData>,
    pub check_ins: Vec<CheckInSyncData>,
    pub goals: Vec<GoalSyncData>,
    pub goal_habits: Vec<GoalHabitSyncData>,
    pub synced_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HabitSyncData {
    pub local_id: String,
    pub name: String,
    pub description: Option<String>,
    pub habit_type: String,
    pub unit: Option<String>,
    pub target_value: Option<i32>,
    pub target_direction: String,
    pub archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CheckInSyncData {
    pub local_id: String,
    pub habit_local_id: String,
    pub value: i32,
    pub note: Option<String>,
    pub effective_date: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GoalSyncData {
    pub local_id: String,
    pub name: String,
    pub description: Option<String>,
    pub deadline: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GoalHabitSyncData {
    pub goal_local_id: String,
    pub habit_local_id: String,
    pub weight: f32,
}

/// Push local data to cloud
async fn push_data(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Json(data): Json<SyncData>,
) -> ApiResult<Json<SyncResult>> {
    // Verify cloud sync is enabled
    let user_record: UserSyncStatus = sqlx::query_as(
        "SELECT cloud_sync_enabled FROM users WHERE id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    if !user_record.cloud_sync_enabled {
        return Err(ApiError::BadRequest("Cloud sync is not enabled".to_string()));
    }

    let mut tx = state.db.begin().await?;
    let mut synced_habits = 0;
    let mut synced_checkins = 0;
    let mut synced_goals = 0;

    // Map local IDs to server IDs
    let mut habit_id_map: std::collections::HashMap<String, Uuid> = std::collections::HashMap::new();
    let mut goal_id_map: std::collections::HashMap<String, Uuid> = std::collections::HashMap::new();

    // Sync habits
    for habit in &data.habits {
        let server_id = Uuid::new_v4();
        
        sqlx::query(
            r#"INSERT INTO habits (id, user_id, name, description, habit_type, unit, target_value, target_direction, archived, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5::habit_type, $6, $7, $8::target_direction, $9, $10, $11)
               ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   description = EXCLUDED.description,
                   unit = EXCLUDED.unit,
                   target_value = EXCLUDED.target_value,
                   target_direction = EXCLUDED.target_direction,
                   archived = EXCLUDED.archived,
                   updated_at = EXCLUDED.updated_at"#,
        )
        .bind(server_id)
        .bind(user.user_id)
        .bind(&habit.name)
        .bind(&habit.description)
        .bind(&habit.habit_type)
        .bind(&habit.unit)
        .bind(habit.target_value)
        .bind(&habit.target_direction)
        .bind(habit.archived)
        .bind(habit.created_at)
        .bind(habit.updated_at)
        .execute(&mut *tx)
        .await?;

        habit_id_map.insert(habit.local_id.clone(), server_id);
        synced_habits += 1;
    }

    // Sync check-ins
    for checkin in &data.check_ins {
        if let Some(&habit_id) = habit_id_map.get(&checkin.habit_local_id) {
            let effective_date = checkin.effective_date.parse::<NaiveDate>()
                .map_err(|_| ApiError::BadRequest("Invalid date format".to_string()))?;

            sqlx::query(
                r#"INSERT INTO check_ins (id, habit_id, user_id, value, note, effective_date, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   ON CONFLICT (habit_id, effective_date) DO UPDATE SET
                       value = EXCLUDED.value,
                       note = COALESCE(EXCLUDED.note, check_ins.note)"#,
            )
            .bind(Uuid::new_v4())
            .bind(habit_id)
            .bind(user.user_id)
            .bind(checkin.value)
            .bind(&checkin.note)
            .bind(effective_date)
            .bind(checkin.created_at)
            .execute(&mut *tx)
            .await?;

            synced_checkins += 1;
        }
    }

    // Sync goals
    for goal in &data.goals {
        let server_id = Uuid::new_v4();
        let deadline = goal.deadline.parse::<NaiveDate>()
            .map_err(|_| ApiError::BadRequest("Invalid date format".to_string()))?;

        sqlx::query(
            r#"INSERT INTO goals (id, user_id, name, description, deadline, status, is_shared, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6::goal_status, false, $7, $8)
               ON CONFLICT (id) DO UPDATE SET
                   name = EXCLUDED.name,
                   description = EXCLUDED.description,
                   deadline = EXCLUDED.deadline,
                   status = EXCLUDED.status,
                   updated_at = EXCLUDED.updated_at"#,
        )
        .bind(server_id)
        .bind(user.user_id)
        .bind(&goal.name)
        .bind(&goal.description)
        .bind(deadline)
        .bind(&goal.status)
        .bind(goal.created_at)
        .bind(goal.updated_at)
        .execute(&mut *tx)
        .await?;

        goal_id_map.insert(goal.local_id.clone(), server_id);
        synced_goals += 1;
    }

    // Sync goal-habit links
    for gh in &data.goal_habits {
        if let (Some(&goal_id), Some(&habit_id)) = (goal_id_map.get(&gh.goal_local_id), habit_id_map.get(&gh.habit_local_id)) {
            sqlx::query(
                r#"INSERT INTO goal_habits (id, goal_id, habit_id, weight)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (goal_id, habit_id) DO UPDATE SET weight = EXCLUDED.weight"#,
            )
            .bind(Uuid::new_v4())
            .bind(goal_id)
            .bind(habit_id)
            .bind(gh.weight)
            .execute(&mut *tx)
            .await?;
        }
    }

    tx.commit().await?;

    Ok(Json(SyncResult {
        success: true,
        synced_habits,
        synced_checkins,
        synced_goals,
        synced_at: Utc::now(),
    }))
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub synced_habits: i32,
    pub synced_checkins: i32,
    pub synced_goals: i32,
    pub synced_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct HabitRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    habit_type: String,
    unit: Option<String>,
    target_value: Option<i32>,
    target_direction: String,
    archived: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct CheckInRow {
    id: Uuid,
    habit_id: Uuid,
    value: i32,
    note: Option<String>,
    effective_date: NaiveDate,
    created_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct GoalRow {
    id: Uuid,
    name: String,
    description: Option<String>,
    deadline: NaiveDate,
    status: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
struct GoalHabitRow {
    goal_id: Uuid,
    habit_id: Uuid,
    weight: f32,
}

/// Pull cloud data to local
async fn pull_data(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<SyncData>> {
    // Verify cloud sync is enabled
    let user_record: UserSyncStatus = sqlx::query_as(
        "SELECT cloud_sync_enabled FROM users WHERE id = $1",
    )
    .bind(user.user_id)
    .fetch_one(&state.db)
    .await?;

    if !user_record.cloud_sync_enabled {
        return Err(ApiError::BadRequest("Cloud sync is not enabled".to_string()));
    }

    // Fetch all user data
    let habits: Vec<HabitRow> = sqlx::query_as(
        r#"SELECT id, name, description, habit_type::text, unit, target_value, target_direction::text, archived, created_at, updated_at
           FROM habits WHERE user_id = $1"#,
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    let habit_data: Vec<HabitSyncData> = habits
        .into_iter()
        .map(|h| HabitSyncData {
            local_id: h.id.to_string(),
            name: h.name,
            description: h.description,
            habit_type: h.habit_type,
            unit: h.unit,
            target_value: h.target_value,
            target_direction: h.target_direction,
            archived: h.archived,
            created_at: h.created_at,
            updated_at: h.updated_at,
        })
        .collect();

    let checkins: Vec<CheckInRow> = sqlx::query_as(
        "SELECT id, habit_id, value, note, effective_date, created_at FROM check_ins WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    let checkin_data: Vec<CheckInSyncData> = checkins
        .into_iter()
        .map(|c| CheckInSyncData {
            local_id: c.id.to_string(),
            habit_local_id: c.habit_id.to_string(),
            value: c.value,
            note: c.note,
            effective_date: c.effective_date.to_string(),
            created_at: c.created_at,
        })
        .collect();

    let goals: Vec<GoalRow> = sqlx::query_as(
        "SELECT id, name, description, deadline, status::text, created_at, updated_at FROM goals WHERE user_id = $1",
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    let goal_data: Vec<GoalSyncData> = goals
        .into_iter()
        .map(|g| GoalSyncData {
            local_id: g.id.to_string(),
            name: g.name,
            description: g.description,
            deadline: g.deadline.to_string(),
            status: g.status,
            created_at: g.created_at,
            updated_at: g.updated_at,
        })
        .collect();

    let goal_habits: Vec<GoalHabitRow> = sqlx::query_as(
        "SELECT gh.goal_id, gh.habit_id, gh.weight FROM goal_habits gh JOIN goals g ON g.id = gh.goal_id WHERE g.user_id = $1",
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    let goal_habit_data: Vec<GoalHabitSyncData> = goal_habits
        .into_iter()
        .map(|gh| GoalHabitSyncData {
            goal_local_id: gh.goal_id.to_string(),
            habit_local_id: gh.habit_id.to_string(),
            weight: gh.weight,
        })
        .collect();

    Ok(Json(SyncData {
        habits: habit_data,
        check_ins: checkin_data,
        goals: goal_data,
        goal_habits: goal_habit_data,
        synced_at: Utc::now(),
    }))
}
