/** Central keys for SecureStore / AsyncStorage (auth + background location). */
export const STORAGE = {
  REMEMBER_KEY: 'promap_remember_me',
  TOKEN_KEY: 'promap_user_token',
  USER_KEY: 'promap_user_data',
  /** JWT mirrored while a work session is active so the background task can send pings when “Remember me” is off. */
  BG_TOKEN_KEY: 'promap_bg_auth_token',
  WORK_SESSION_START: 'promap_work_session_started_at',
  SUGGESTION_HISTORY: 'promap_suggestion_history',
  OFFLINE_WORK_QUEUE: 'promap_offline_work_queue',
} as const;
