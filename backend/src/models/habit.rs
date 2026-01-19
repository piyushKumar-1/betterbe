//! Habit models

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "habit_type", rename_all = "lowercase")]
pub enum HabitType {
    Binary,
    Numeric,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "target_direction", rename_all = "snake_case")]
pub enum TargetDirection {
    AtLeast,
    AtMost,
    Exactly,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Habit {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub habit_type: HabitType,
    pub unit: Option<String>,
    pub target_value: Option<i32>,
    pub target_direction: TargetDirection,
    pub archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHabitRequest {
    pub name: String,
    pub description: Option<String>,
    pub habit_type: HabitType,
    pub unit: Option<String>,
    pub target_value: Option<i32>,
    pub target_direction: Option<TargetDirection>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHabitRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub target_value: Option<i32>,
    pub target_direction: Option<TargetDirection>,
    pub archived: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CheckIn {
    pub id: Uuid,
    pub habit_id: Uuid,
    pub user_id: Uuid,
    pub value: i32,
    pub note: Option<String>,
    pub effective_date: NaiveDate,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCheckInRequest {
    pub habit_id: Uuid,
    pub value: i32,
    pub note: Option<String>,
    pub effective_date: NaiveDate,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCheckInRequest {
    pub value: Option<i32>,
    pub note: Option<String>,
}

/// Reminder settings
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "reminder_type", rename_all = "lowercase")]
pub enum ReminderType {
    Interval,
    Daily,
    Random,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HabitReminder {
    pub id: Uuid,
    pub habit_id: Uuid,
    pub enabled: bool,
    pub reminder_type: ReminderType,
    pub interval_hours: Option<i32>,
    pub daily_time: Option<String>,
    pub random_window_start: Option<String>,
    pub random_window_end: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

