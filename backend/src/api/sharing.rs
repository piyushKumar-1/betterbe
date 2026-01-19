//! Shared goals API

use axum::{
    extract::Path,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::middleware::AuthUser,
    error::{ApiError, ApiResult},
    models::*,
    AppState,
};

pub fn routes() -> Router {
    Router::new()
        .route("/goals", get(list_shared_goals))
        .route("/goals/:goal_id/share", post(share_goal))
        .route("/goals/:id", get(get_shared_goal).delete(unshare_goal))
        .route("/goals/:id/invite", post(invite_user))
        .route("/join", post(join_by_code))
        .route("/goals/:id/leave", post(leave_shared_goal))
        .route("/goals/:id/activity", get(get_activity_feed))
}

#[derive(Debug, FromRow)]
struct SharedGoalRow {
    id: Uuid,
    goal_id: Uuid,
    invite_code: String,
    max_participants: i32,
    created_at: DateTime<Utc>,
    name: String,
    description: Option<String>,
    deadline: chrono::NaiveDate,
    status: GoalStatus,
    user_id: Uuid,
    updated_at: DateTime<Utc>,
}

async fn list_shared_goals(
    Extension(state): Extension<AppState>,
    user: AuthUser,
) -> ApiResult<Json<Vec<SharedGoalResponse>>> {
    let shared_goals = sqlx::query_as::<_, SharedGoalRow>(
        r#"SELECT sg.id, sg.goal_id, sg.invite_code, sg.max_participants, sg.created_at,
                  g.name, g.description, g.deadline, g.status, g.user_id, g.updated_at
           FROM shared_goals sg
           JOIN goals g ON g.id = sg.goal_id
           JOIN goal_participants gp ON gp.shared_goal_id = sg.id
           WHERE gp.user_id = $1
           ORDER BY sg.created_at DESC"#,
    )
    .bind(user.user_id)
    .fetch_all(&state.db)
    .await?;

    let mut responses = Vec::new();
    for sg in shared_goals {
        let participants = get_participants(&state.db, sg.id).await?;
        
        responses.push(SharedGoalResponse {
            id: sg.id,
            goal: Goal {
                id: sg.goal_id,
                user_id: sg.user_id,
                name: sg.name,
                description: sg.description,
                deadline: sg.deadline,
                status: sg.status,
                is_shared: true,
                created_at: sg.created_at,
                updated_at: sg.updated_at,
            },
            invite_code: sg.invite_code,
            participants,
            created_at: sg.created_at,
        });
    }

    Ok(Json(responses))
}

async fn share_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(_goal_id): Path<Uuid>,
    Json(body): Json<CreateSharedGoalRequest>,
) -> ApiResult<Json<SharedGoalResponse>> {
    // Verify goal ownership
    let goal = sqlx::query_as::<_, Goal>(
        r#"SELECT id, user_id, name, description, deadline,
           status, is_shared, created_at, updated_at
           FROM goals WHERE id = $1 AND user_id = $2"#,
    )
    .bind(body.goal_id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    // Check if already shared
    if goal.is_shared {
        return Err(ApiError::Conflict("Goal is already shared".to_string()));
    }

    let mut tx = state.db.begin().await?;

    // Generate invite code
    let invite_code = generate_invite_code();
    let shared_goal_id = Uuid::new_v4();

    // Create shared goal
    sqlx::query(
        r#"INSERT INTO shared_goals (id, goal_id, created_by, invite_code, max_participants, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())"#,
    )
    .bind(shared_goal_id)
    .bind(goal.id)
    .bind(user.user_id)
    .bind(&invite_code)
    .bind(body.max_participants.unwrap_or(10))
    .execute(&mut *tx)
    .await?;

    // Add owner as participant
    sqlx::query(
        r#"INSERT INTO goal_participants (id, shared_goal_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, 'owner', NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(shared_goal_id)
    .bind(user.user_id)
    .execute(&mut *tx)
    .await?;

    // Mark goal as shared
    sqlx::query("UPDATE goals SET is_shared = true WHERE id = $1")
        .bind(goal.id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let created_at = chrono::Utc::now();
    let participants = vec![ParticipantInfo {
        user_id: user.user_id,
        name: None,
        avatar_url: None,
        role: ShareRole::Owner,
        joined_at: created_at,
    }];

    Ok(Json(SharedGoalResponse {
        id: shared_goal_id,
        goal: Goal { is_shared: true, ..goal },
        invite_code,
        participants,
        created_at,
    }))
}

async fn get_shared_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<SharedGoalResponse>> {
    // Verify user is a participant
    let participant_exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    if participant_exists.is_none() {
        return Err(ApiError::Forbidden);
    }

    let sg = sqlx::query_as::<_, SharedGoalRow>(
        r#"SELECT sg.id, sg.goal_id, sg.invite_code, sg.max_participants, sg.created_at,
                  g.user_id, g.name, g.description, g.deadline, g.status, g.updated_at
           FROM shared_goals sg
           JOIN goals g ON g.id = sg.goal_id
           WHERE sg.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or(ApiError::NotFound)?;

    let participants = get_participants(&state.db, id).await?;

    Ok(Json(SharedGoalResponse {
        id: sg.id,
        goal: Goal {
            id: sg.goal_id,
            user_id: sg.user_id,
            name: sg.name,
            description: sg.description,
            deadline: sg.deadline,
            status: sg.status,
            is_shared: true,
            created_at: sg.created_at,
            updated_at: sg.updated_at,
        },
        invite_code: sg.invite_code,
        participants,
        created_at: sg.created_at,
    }))
}

async fn unshare_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    // Verify user is owner
    let participant: Option<ParticipantRow> = sqlx::query_as(
        r#"SELECT id, user_id, role, joined_at FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    let participant = participant.ok_or(ApiError::Forbidden)?;

    if participant.role != ShareRole::Owner {
        return Err(ApiError::Forbidden);
    }

    let mut tx = state.db.begin().await?;

    // Get goal_id before deleting
    let sg: Option<(Uuid,)> = sqlx::query_as("SELECT goal_id FROM shared_goals WHERE id = $1")
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?;
    
    let sg = sg.ok_or(ApiError::NotFound)?;

    // Delete shared goal (cascades to participants)
    sqlx::query("DELETE FROM shared_goals WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await?;

    // Mark goal as not shared
    sqlx::query("UPDATE goals SET is_shared = false WHERE id = $1")
        .bind(sg.0)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(Json(serde_json::json!({ "unshared": true })))
}

#[derive(Debug, FromRow)]
struct ParticipantRow {
    id: Uuid,
    user_id: Uuid,
    role: ShareRole,
    joined_at: DateTime<Utc>,
}

async fn invite_user(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(body): Json<InviteUserRequest>,
) -> ApiResult<Json<InviteResponse>> {
    // Verify user can invite (owner or collaborator)
    let participant: Option<ParticipantRow> = sqlx::query_as(
        r#"SELECT id, user_id, role, joined_at FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    let participant = participant.ok_or(ApiError::Forbidden)?;

    if participant.role == ShareRole::Viewer {
        return Err(ApiError::Forbidden);
    }

    let invite_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO goal_invites (id, shared_goal_id, inviter_id, invitee_email, status, created_at, expires_at)
           VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW() + INTERVAL '7 days')"#,
    )
    .bind(invite_id)
    .bind(id)
    .bind(user.user_id)
    .bind(&body.email)
    .execute(&state.db)
    .await?;

    Ok(Json(InviteResponse {
        invite_id,
        status: InviteStatus::Pending,
    }))
}

#[derive(Debug, FromRow)]
struct SharedGoalBasic {
    id: Uuid,
    goal_id: Uuid,
    invite_code: String,
    max_participants: i32,
    created_at: DateTime<Utc>,
}

async fn join_by_code(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Json(body): Json<JoinByCodeRequest>,
) -> ApiResult<Json<SharedGoalResponse>> {
    let shared_goal: Option<SharedGoalBasic> = sqlx::query_as(
        "SELECT id, goal_id, invite_code, max_participants, created_at FROM shared_goals WHERE invite_code = $1",
    )
    .bind(&body.invite_code)
    .fetch_optional(&state.db)
    .await?;

    let shared_goal = shared_goal.ok_or(ApiError::NotFound)?;

    // Check if already a participant
    let existing: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2",
    )
    .bind(shared_goal.id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    if existing.is_some() {
        return Err(ApiError::Conflict("Already a participant".to_string()));
    }

    // Check participant limit
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM goal_participants WHERE shared_goal_id = $1",
    )
    .bind(shared_goal.id)
    .fetch_one(&state.db)
    .await?;

    if count.0 >= shared_goal.max_participants as i64 {
        return Err(ApiError::Conflict("Goal has reached maximum participants".to_string()));
    }

    // Add as collaborator
    sqlx::query(
        r#"INSERT INTO goal_participants (id, shared_goal_id, user_id, role, joined_at)
           VALUES ($1, $2, $3, 'collaborator', NOW())"#,
    )
    .bind(Uuid::new_v4())
    .bind(shared_goal.id)
    .bind(user.user_id)
    .execute(&state.db)
    .await?;

    // Return the shared goal
    get_shared_goal(Extension(state), user, Path(shared_goal.id)).await
}

async fn leave_shared_goal(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<serde_json::Value>> {
    let participant: Option<ParticipantRow> = sqlx::query_as(
        r#"SELECT id, user_id, role, joined_at FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2"#,
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    let participant = participant.ok_or(ApiError::NotFound)?;

    // Owner cannot leave, must unshare
    if participant.role == ShareRole::Owner {
        return Err(ApiError::BadRequest("Owner cannot leave. Use unshare instead.".to_string()));
    }

    sqlx::query(
        "DELETE FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.user_id)
    .execute(&state.db)
    .await?;

    Ok(Json(serde_json::json!({ "left": true })))
}

#[derive(Debug, FromRow)]
struct ActivityRow {
    id: Uuid,
    activity_type: ActivityType,
    message: Option<String>,
    created_at: DateTime<Utc>,
    user_name: Option<String>,
    user_avatar: Option<String>,
    habit_name: Option<String>,
}

async fn get_activity_feed(
    Extension(state): Extension<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> ApiResult<Json<Vec<ActivityFeedItem>>> {
    // Verify user is a participant
    let participant_exists: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM goal_participants WHERE shared_goal_id = $1 AND user_id = $2",
    )
    .bind(id)
    .bind(user.user_id)
    .fetch_optional(&state.db)
    .await?;

    if participant_exists.is_none() {
        return Err(ApiError::Forbidden);
    }

    let activities: Vec<ActivityRow> = sqlx::query_as(
        r#"SELECT sa.id, sa.activity_type, sa.message, sa.created_at,
                  u.name as user_name, u.avatar_url as user_avatar,
                  h.name as habit_name
           FROM shared_activities sa
           JOIN users u ON u.id = sa.user_id
           LEFT JOIN habits h ON h.id = sa.habit_id
           WHERE sa.shared_goal_id = $1
           ORDER BY sa.created_at DESC
           LIMIT 50"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let feed: Vec<ActivityFeedItem> = activities
        .into_iter()
        .map(|a| ActivityFeedItem {
            id: a.id,
            user_name: a.user_name,
            user_avatar: a.user_avatar,
            activity_type: a.activity_type,
            habit_name: a.habit_name,
            message: a.message,
            created_at: a.created_at,
        })
        .collect();

    Ok(Json(feed))
}

// Helper functions

#[derive(Debug, FromRow)]
struct ParticipantInfoRow {
    user_id: Uuid,
    role: ShareRole,
    joined_at: DateTime<Utc>,
    name: Option<String>,
    avatar_url: Option<String>,
}

async fn get_participants(db: &sqlx::PgPool, shared_goal_id: Uuid) -> ApiResult<Vec<ParticipantInfo>> {
    let participants: Vec<ParticipantInfoRow> = sqlx::query_as(
        r#"SELECT gp.user_id, gp.role, gp.joined_at, u.name, u.avatar_url
           FROM goal_participants gp
           JOIN users u ON u.id = gp.user_id
           WHERE gp.shared_goal_id = $1
           ORDER BY gp.joined_at ASC"#,
    )
    .bind(shared_goal_id)
    .fetch_all(db)
    .await?;

    Ok(participants
        .into_iter()
        .map(|p| ParticipantInfo {
            user_id: p.user_id,
            name: p.name,
            avatar_url: p.avatar_url,
            role: p.role,
            joined_at: p.joined_at,
        })
        .collect())
}

fn generate_invite_code() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars().collect();
    (0..8)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect()
}
