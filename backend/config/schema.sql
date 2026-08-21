-- WellWisher Database Schema (Enhanced for JARVIS AI Persistence)

CREATE DATABASE IF NOT EXISTS wellwisher;
USE wellwisher;

-- ============================================================================
-- 1. CORE APPLICATION TABLES (SOURCE OF TRUTH)
-- ============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Routines / Schedule Table (Authoritative Single Source of Truth for Schedules)
CREATE TABLE IF NOT EXISTS routines (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming',
    date DATE NOT NULL,
    reminder_enabled TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_routines_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Screen Care Settings Table
CREATE TABLE IF NOT EXISTS screen_care_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    break_interval_minutes INT DEFAULT 30,
    break_duration_seconds INT DEFAULT 20,
    eye_care_enabled TINYINT(1) DEFAULT 1,
    daily_screen_limit_minutes INT DEFAULT 480,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    member_name VARCHAR(100) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'connected',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_family_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Hydration Logs Table
CREATE TABLE IF NOT EXISTS hydration_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount_ml INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hydration_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Sleep & Mood Logs Table
CREATE TABLE IF NOT EXISTS sleep_mood_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sleep_hours DECIMAL(4,1) NOT NULL,
    bedtime VARCHAR(20),
    wake_time VARCHAR(20),
    mood_rating VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sleep_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Medications Table
CREATE TABLE IF NOT EXISTS medications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    schedule_time VARCHAR(20) NOT NULL,
    total_pills INT DEFAULT 30,
    remaining_pills INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_medications_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Family Nudges Table
CREATE TABLE IF NOT EXISTS family_nudges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_user_name VARCHAR(100) NOT NULL,
    to_user_name VARCHAR(100) NOT NULL,
    nudge_type VARCHAR(50) NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Health Vitals Logs Table
CREATE TABLE IF NOT EXISTS vitals_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    systolic INT NULL,
    diastolic INT NULL,
    heart_rate INT NULL,
    blood_glucose INT NULL,
    spo2 INT NULL,
    weight_kg DECIMAL(5,2) NULL,
    notes VARCHAR(255) NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_vitals_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. AI Mood & Symptom Journal Logs Table
CREATE TABLE IF NOT EXISTS journal_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    journal_text TEXT NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    mood_score INT DEFAULT 5,
    caregiver_flag TINYINT(1) DEFAULT 0,
    ai_feedback TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_journal_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Cognitive Brain Training Scores Table
CREATE TABLE IF NOT EXISTS cognitive_game_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    duration_seconds INT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cognitive_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. JARVIS AI PERSISTENCE FOUNDATION TABLES (PHASE 1)
-- ============================================================================

-- 12. AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_user_conversations (user_id, updated_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. AI Conversation Messages Table
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    role ENUM('user', 'assistant', 'system', 'tool') NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSON NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_messages (conversation_id, created_at),
    INDEX idx_user_messages (user_id, created_at),
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. AI Long-Term Memories Table
CREATE TABLE IF NOT EXISTS ai_memories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    memory_type ENUM(
        'USER_PREFERENCE',
        'ROUTINE_PREFERENCE',
        'COMMUNICATION_PREFERENCE',
        'SCHEDULE_PREFERENCE',
        'ASSISTANT_PREFERENCE',
        'TEMPORARY_CONTEXT',
        'IMPORTANT_CONTEXT'
    ) NOT NULL DEFAULT 'USER_PREFERENCE',
    memory_key VARCHAR(100) NOT NULL,
    memory_value TEXT NOT NULL,
    source ENUM('USER_EXPLICIT', 'AGENT_INFERRED', 'SYSTEM_DERIVED') NOT NULL DEFAULT 'USER_EXPLICIT',
    importance INT NOT NULL DEFAULT 3,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    evidence_count INT NOT NULL DEFAULT 1,
    last_observed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    source_reference VARCHAR(100) NULL DEFAULT NULL,
    last_accessed_at TIMESTAMP NULL DEFAULT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_memories_type (user_id, memory_type),
    INDEX idx_user_memories_key (user_id, memory_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 15. AI Preferences Table
CREATE TABLE IF NOT EXISTS ai_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    assistant_name VARCHAR(50) NOT NULL DEFAULT 'JARVIS',
    voice_enabled TINYINT(1) NOT NULL DEFAULT 1,
    tts_enabled TINYINT(1) NOT NULL DEFAULT 1,
    proactive_assistance_enabled TINYINT(1) NOT NULL DEFAULT 1,
    proactive_reminders_enabled TINYINT(1) NOT NULL DEFAULT 1,
    daily_briefing_enabled TINYINT(1) NOT NULL DEFAULT 1,
    evening_summary_enabled TINYINT(1) NOT NULL DEFAULT 1,
    proactive_voice_enabled TINYINT(1) NOT NULL DEFAULT 1,
    quiet_hours_enabled TINYINT(1) NOT NULL DEFAULT 1,
    quiet_hours_start VARCHAR(10) NOT NULL DEFAULT '22:00',
    quiet_hours_end VARCHAR(10) NOT NULL DEFAULT '07:00',
    notification_frequency ENUM('LOW', 'BALANCED', 'HIGH') NOT NULL DEFAULT 'BALANCED',
    briefing_time VARCHAR(10) NOT NULL DEFAULT '08:00 AM',
    summary_time VARCHAR(10) NOT NULL DEFAULT '08:30 PM',
    preferred_response_style ENUM('CONCISE', 'BALANCED', 'DETAILED', 'ELDERLY_AFFECTIONATE', 'PROFESSIONAL') NOT NULL DEFAULT 'CONCISE',
    tone ENUM('PROFESSIONAL', 'FRIENDLY', 'CALM', 'MOTIVATIONAL') NOT NULL DEFAULT 'FRIENDLY',
    wake_word_enabled TINYINT(1) NOT NULL DEFAULT 0,
    language_preference VARCHAR(10) NOT NULL DEFAULT 'en-US',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 16. AI Autonomy Action Permissions Table
CREATE TABLE IF NOT EXISTS ai_action_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_key VARCHAR(64) NOT NULL,
    permission_state ENUM('ASK_ALWAYS', 'AUTO_APPROVE', 'DISABLED') NOT NULL DEFAULT 'ASK_ALWAYS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_action (user_id, action_key),
    INDEX idx_user_permissions (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. AI Agent Runs Table
CREATE TABLE IF NOT EXISTS ai_agent_runs (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    conversation_id VARCHAR(64) NULL,
    request TEXT NOT NULL,
    status ENUM(
        'PLANNED',
        'RUNNING',
        'WAITING_FOR_CONFIRMATION',
        'COMPLETED',
        'FAILED',
        'PARTIALLY_COMPLETED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PLANNED',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    error_message TEXT NULL,
    metadata JSON NULL,
    INDEX idx_user_agent_runs (user_id, started_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE SET NULL
);

-- 18. AI Agent Steps Table
CREATE TABLE IF NOT EXISTS ai_agent_steps (
    id VARCHAR(64) PRIMARY KEY,
    agent_run_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    step_number INT NOT NULL,
    tool_name VARCHAR(100) NOT NULL,
    status ENUM(
        'PLANNED',
        'RUNNING',
        'WAITING_FOR_CONFIRMATION',
        'COMPLETED',
        'FAILED',
        'SKIPPED'
    ) NOT NULL DEFAULT 'PLANNED',
    input_json JSON NULL,
    output_json JSON NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    error_message TEXT NULL,
    INDEX idx_run_steps (agent_run_id, step_number),
    INDEX idx_user_steps (user_id),
    FOREIGN KEY (agent_run_id) REFERENCES ai_agent_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 19. AI Proactive Events Table
CREATE TABLE IF NOT EXISTS ai_proactive_events (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    event_type ENUM(
        'UPCOMING_TASK',
        'TASK_DUE',
        'OVERDUE_TASK',
        'MISSED_TASK',
        'POSTPONED_TASK_PATTERN',
        'DAILY_BRIEFING',
        'EVENING_SUMMARY',
        'FREE_TIME_SUGGESTION',
        'HYDRATION_NUDGE',
        'WELLNESS_INSIGHT',
        'SMART_RESCHEDULE_SUGGESTION'
    ) NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'PROACTIVE_ENGINE',
    related_entity_type VARCHAR(50) NULL,
    related_entity_id VARCHAR(64) NULL,
    scheduled_for TIMESTAMP NULL DEFAULT NULL,
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    status ENUM(
        'PENDING',
        'DELIVERED',
        'DISMISSED',
        'ACTED',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    action_payload JSON NULL,
    metadata JSON NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_proactive_user_status (user_id, status),
    INDEX idx_proactive_user_created (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 20. AI Behavior Patterns Table
CREATE TABLE IF NOT EXISTS ai_behavior_patterns (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_key VARCHAR(100) NOT NULL,
    pattern_value TEXT NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    evidence_count INT NOT NULL DEFAULT 1,
    first_observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_observed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('OBSERVING', 'ACTIVE', 'REVISED', 'DISMISSED') NOT NULL DEFAULT 'OBSERVING',
    source VARCHAR(50) NOT NULL DEFAULT 'HABIT_ENGINE',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_behavior_user (user_id, pattern_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 21. AI Personal Profiles Table
CREATE TABLE IF NOT EXISTS ai_personal_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    profile_data JSON NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- 3. JARVIS MULTI-MODAL VISION & CLINICAL DOCUMENT UNDERSTANDING (PHASE 8)
-- ============================================================================

-- 22. AI Documents Table
CREATE TABLE IF NOT EXISTS ai_documents (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    document_type ENUM(
        'BLOOD_REPORT',
        'LAB_REPORT',
        'PRESCRIPTION',
        'MEDICATION_LABEL',
        'VITALS_REPORT',
        'DOCTOR_NOTE',
        'DISCHARGE_SUMMARY',
        'HEALTH_CERTIFICATE',
        'GENERAL_HEALTH_DOCUMENT',
        'GENERAL_DOCUMENT',
        'UNKNOWN'
    ) NOT NULL DEFAULT 'UNKNOWN',
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INT NOT NULL,
    storage_reference VARCHAR(255) NOT NULL,
    processing_status ENUM(
        'UPLOADED',
        'PROCESSING',
        'EXTRACTED',
        'REVIEW_REQUIRED',
        'CONFIRMED',
        'PROCESSED',
        'FAILED',
        'DELETED',
        'EXPIRED'
    ) NOT NULL DEFAULT 'UPLOADED',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_documents (user_id, uploaded_at),
    INDEX idx_user_document_type (user_id, document_type),
    INDEX idx_user_document_status (user_id, processing_status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 23. AI Document Pages & Raw OCR Table
CREATE TABLE IF NOT EXISTS ai_document_pages (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    page_number INT NOT NULL,
    ocr_text LONGTEXT NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_doc_pages (document_id, page_number),
    INDEX idx_user_pages (user_id),
    FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 24. AI Document Structured Extractions Table
CREATE TABLE IF NOT EXISTS ai_document_extractions (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    user_id INT NOT NULL,
    field_name VARCHAR(150) NOT NULL,
    field_value VARCHAR(100) NOT NULL,
    normalized_value VARCHAR(100) NULL,
    unit VARCHAR(50) NULL,
    reference_range VARCHAR(100) NULL,
    flag ENUM('NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'ABNORMAL', 'UNKNOWN') NOT NULL DEFAULT 'NORMAL',
    category VARCHAR(100) NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    page_number INT NOT NULL DEFAULT 1,
    source_text TEXT NULL,
    extraction_status ENUM('EXTRACTED', 'REVIEW_REQUIRED', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'EXTRACTED',
    observed_at TIMESTAMP NULL DEFAULT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_doc_extractions (document_id, page_number),
    INDEX idx_user_extractions (user_id, field_name),
    FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 25. AI Document Summaries Table
CREATE TABLE IF NOT EXISTS ai_document_summaries (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    summary TEXT NOT NULL,
    key_findings JSON NULL,
    out_of_range_values JSON NULL,
    uncertain_values JSON NULL,
    questions_for_doctor JSON NULL,
    warnings JSON NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.90,
    disclaimer TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_summaries (user_id),
    FOREIGN KEY (document_id) REFERENCES ai_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 26. AI Health Trends Table (Phase 9)
CREATE TABLE IF NOT EXISTS ai_health_trends (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    previous_value VARCHAR(50) NULL,
    latest_value VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NULL,
    previous_date VARCHAR(50) NULL,
    latest_date VARCHAR(50) NULL,
    change_value VARCHAR(50) NULL,
    change_percent DECIMAL(6,2) NULL,
    trend_direction ENUM('INCREASING', 'DECREASING', 'STABLE', 'INSUFFICIENT_DATA') NOT NULL DEFAULT 'INSUFFICIENT_DATA',
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.90,
    source_document_ids JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_metric (user_id, metric_name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 27. AI Health Alerts Table (Phase 9)
CREATE TABLE IF NOT EXISTS ai_health_alerts (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    metric VARCHAR(100) NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
    message TEXT NOT NULL,
    evidence JSON NULL,
    source_document_ids JSON NULL,
    status ENUM('ACTIVE', 'DISMISSED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dismissed_at TIMESTAMP NULL,
    INDEX idx_user_health_alerts (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 28. AI Doctor Briefings Table (Phase 9)
CREATE TABLE IF NOT EXISTS ai_doctor_briefings (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    briefing_data JSON NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source_document_ids JSON NULL,
    status ENUM('DRAFT', 'READY', 'EXPORTED') NOT NULL DEFAULT 'READY',
    INDEX idx_user_briefings (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 29. AI Appointments Table (Phase 10)
CREATE TABLE IF NOT EXISTS ai_appointments (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NULL,
    appointment_type VARCHAR(100) NULL,
    scheduled_at VARCHAR(100) NOT NULL,
    location VARCHAR(255) NULL,
    status ENUM('PLANNED', 'CONFIRMED', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FOLLOW_UP_REQUIRED') NOT NULL DEFAULT 'PLANNED',
    doctor_name VARCHAR(100) NULL,
    notes TEXT NULL,
    briefing_id VARCHAR(64) NULL,
    follow_up_date VARCHAR(50) NULL,
    doctor_instructions TEXT NULL,
    tests_requested JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_appointments (user_id, status, scheduled_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 30. AI Workflow Actions Table (Phase 10)
CREATE TABLE IF NOT EXISTS ai_workflow_actions (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(64) NULL,
    status ENUM('PENDING', 'CONFIRMED', 'DISMISSED', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    requires_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
    confirmation_id VARCHAR(64) NULL,
    payload JSON NOT NULL,
    result JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    INDEX idx_user_workflow_actions (user_id, status, action_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);




