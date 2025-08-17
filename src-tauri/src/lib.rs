use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PasswordEntry {
    pub id: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub website: Option<String>,
    pub email: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePasswordEntry {
    pub title: String,
    pub username: String,
    pub password: String,
    pub website: Option<String>,
    pub email: Option<String>,
}

#[tauri::command]
fn generate_id() -> String {
    Uuid::new_v4().to_string()
}

#[tauri::command]
fn get_current_time() -> String {
    Utc::now().to_rfc3339()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|_app| {
            if cfg!(debug_assertions) {
                _app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            generate_id,
            get_current_time
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}