//! Goal models

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "goal_status", rename_all = "lowercase")]
pub enum GoalStatus {
    Active,
    Achieved,
    Failed,
    Abandoned,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Goal {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub deadline: NaiveDate,
    pub status: GoalStatus,
    pub is_shared: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateGoalRequest {
    pub name: String,
    pub description: Option<String>,
    pub deadline: NaiveDate,
    pub habit_ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateGoalRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub deadline: Option<NaiveDate>,
    pub status: Option<GoalStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GoalHabit {
    pub id: Uuid,
    pub goal_id: Uuid,
    pub habit_id: Uuid,
    pub weight: f32,
}

#[derive(Debug, Deserialize)]
pub struct LinkHabitRequest {
    pub habit_id: Uuid,
    pub weight: Option<f32>,
}

