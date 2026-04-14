-- ====================================================================
-- Activity Logs Table
-- Run this once against your database.
-- ====================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED        NOT NULL,
    user_name   VARCHAR(255)        NOT NULL DEFAULT '',
    role        VARCHAR(50)         NOT NULL DEFAULT '',
    action      VARCHAR(100)        NOT NULL,
    target_type VARCHAR(50)         DEFAULT NULL,
    target_id   INT UNSIGNED        DEFAULT NULL,
    description TEXT                DEFAULT NULL,
    created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action      (action),
    INDEX idx_user_id     (user_id),
    INDEX idx_created_at  (created_at),
    INDEX idx_target      (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
