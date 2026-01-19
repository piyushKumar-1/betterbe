//! Sharing models for collaborative goals

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "share_role", rename_all = "lowercase")]
pub enum ShareRole {
    Owner,
    Collaborator,
    Viewer,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "invite_status", rename_all = "lowercase")]
pub enum InviteStatus {
    Pending,
    Accepted,
    Declined,
    Expired,
}

/// A shared goal between multiple users
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SharedGoal {
    pub id: Uuid,
    pub goal_id: Uuid,
    pub created_by: Uuid,
    pub invite_code: String,
    pub max_participants: i32,
    pub created_at: DateTime<Utc>,
}

/// Participant in a shared goal
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GoalParticipant {
    pub id: Uuid,
    pub shared_goal_id: Uuid,
    pub user_id: Uuid,
    pub role: ShareRole,
    pub joined_at: DateTime<Utc>,
}

/// Invitation to join a shared goal
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GoalInvite {
    pub id: Uuid,
    pub shared_goal_id: Uuid,
    pub inviter_id: Uuid,
    pub invitee_email: String,
    pub status: InviteStatus,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

// Request/Response DTOs

#[derive(Debug, Deserialize)]
pub struct CreateSharedGoalRequest {
    pub goal_id: Uuid,
    pub max_participants: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct SharedGoalResponse {
    pub id: Uuid,
    pub goal: super::Goal,
    pub invite_code: String,
    pub participants: Vec<ParticipantInfo>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ParticipantInfo {
    pub user_id: Uuid,
    pub name: Option<String>,
    pub avatar_url: Option<String>,
    pub role: ShareRole,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct InviteUserRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct JoinByCodeRequest {
    pub invite_code: String,
}

#[derive(Debug, Serialize)]
pub struct InviteResponse {
    pub invite_id: Uuid,
    pub status: InviteStatus,
}

/// Activity feed item for shared goals
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SharedActivity {
    pub id: Uuid,
    pub shared_goal_id: Uuid,
    pub user_id: Uuid,
    pub activity_type: ActivityType,
    pub habit_id: Option<Uuid>,
    pub check_in_id: Option<Uuid>,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "activity_type", rename_all = "snake_case")]
pub enum ActivityType {
    CheckIn,
    StreakMilestone,
    GoalProgress,
    JoinedGoal,
    Encouragement,
}

#[derive(Debug, Serialize)]
pub struct ActivityFeedItem {
    pub id: Uuid,
    pub user_name: Option<String>,
    pub user_avatar: Option<String>,
    pub activity_type: ActivityType,
    pub habit_name: Option<String>,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}

