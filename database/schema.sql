-- ============================================================
--  FitTrack – Fitness Management Portal
--  Database Schema  |  MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS fittrack;
USE fittrack;

-- ── 1. USERS ─────────────────────────────────────────────────
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  firstname           VARCHAR(60)  NOT NULL,
  lastname            VARCHAR(60)  NOT NULL,
  username            VARCHAR(60)  NOT NULL UNIQUE,
  email               VARCHAR(120) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,        -- bcrypt hash
  role                ENUM('client','trainer') NOT NULL DEFAULT 'client',
  gender              ENUM('Male','Female','Others'),
  age                 TINYINT UNSIGNED,
  assigned_trainer_id INT          NULL,             -- FK → users(id) for clients
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_trainer FOREIGN KEY (assigned_trainer_id)
    REFERENCES users(id) ON DELETE SET NULL
);

-- ── 2. SESSIONS (server-side, optional – use JWT instead) ────
CREATE TABLE sessions (
  id         VARCHAR(128) PRIMARY KEY,              -- random token / JWT jti
  user_id    INT          NOT NULL,
  expires_at DATETIME     NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ── 3. MEALS (nutrition tracking) ────────────────────────────
CREATE TABLE meals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  meal_time   ENUM('Breakfast','Lunch','Snack','Dinner','Other') NOT NULL DEFAULT 'Other',
  name        VARCHAR(120) NOT NULL,
  calories    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  protein_g   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  carbs_g     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  fats_g      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  logged_date DATE         NOT NULL DEFAULT (CURDATE()),
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_meal_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_meals_user_date ON meals(user_id, logged_date);

-- ── 4. BMI RECORDS ───────────────────────────────────────────
CREATE TABLE bmi_records (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  height_cm    DECIMAL(5,2) NOT NULL,
  weight_kg    DECIMAL(5,2) NOT NULL,
  bmi          DECIMAL(5,2) NOT NULL,
  category     ENUM('Underweight','Normal','Overweight','Obese') NOT NULL,
  recorded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_bmi_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ── 5. WORKOUT SUGGESTIONS (trainer → client) ────────────────
CREATE TABLE workout_suggestions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id   INT          NOT NULL,
  client_id    INT          NULL,                   -- NULL = all clients of this trainer
  title        VARCHAR(120) NOT NULL,
  type         ENUM('Strength','Cardio','HIIT','Yoga','Flexibility','Recovery','General') NOT NULL DEFAULT 'General',
  description  TEXT,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_ws_trainer FOREIGN KEY (trainer_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ws_client  FOREIGN KEY (client_id)
    REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ws_trainer ON workout_suggestions(trainer_id);
CREATE INDEX idx_ws_client  ON workout_suggestions(client_id);

-- ── 6. CHAT MESSAGES ─────────────────────────────────────────
CREATE TABLE messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT  NOT NULL,
  receiver_id INT  NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN   NOT NULL DEFAULT FALSE,
  sent_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_msg_sender   FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_msg_convo ON messages(sender_id, receiver_id, sent_at);

-- ── 7. PROGRESS / WEIGHT LOG ──────────────────────────────────
CREATE TABLE weight_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  weight_kg   DECIMAL(5,2) NOT NULL,
  notes       VARCHAR(255),
  logged_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_wl_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ── 8. WORKOUT HISTORY ───────────────────────────────────────
CREATE TABLE workout_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT          NOT NULL,
  workout_name  VARCHAR(120) NOT NULL,
  duration_min  SMALLINT UNSIGNED,
  calories_burned SMALLINT UNSIGNED,
  intensity     ENUM('Low','Medium','High'),
  performed_at  DATETIME     NOT NULL DEFAULT NOW(),
  notes         TEXT,

  CONSTRAINT fk_wh_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_wh_user_date ON workout_history(user_id, performed_at);

-- ── 9. MEMBERSHIPS ───────────────────────────────────────────
CREATE TABLE memberships (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL UNIQUE,
  plan        ENUM('Basic','Standard','Premium') NOT NULL DEFAULT 'Basic',
  start_date  DATE         NOT NULL,
  end_date    DATE         NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_mem_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
--  SAMPLE SEED DATA (remove in production)
-- ============================================================

-- Trainer account  (password: trainer123  → bcrypt placeholder)
INSERT INTO users (firstname, lastname, username, email, password_hash, role, gender, age)
VALUES ('Ali', 'Hassan', 'ali_trainer', 'ali@fittrack.com',
        '$2b$10$PLACEHOLDER_HASH_TRAINER', 'trainer', 'Male', 30);

-- Client account   (password: client123  → bcrypt placeholder)
INSERT INTO users (firstname, lastname, username, email, password_hash, role, gender, age, assigned_trainer_id)
VALUES ('Sara', 'Ahmed', 'sara_client', 'sara@fittrack.com',
        '$2b$10$PLACEHOLDER_HASH_CLIENT', 'client', 'Female', 22, 1);

-- Sample meal
INSERT INTO meals (user_id, meal_time, name, calories, protein_g, carbs_g, fats_g)
VALUES (2, 'Breakfast', 'Protein Oatmeal Bowl', 420, 32, 58, 12);

-- Sample BMI record
INSERT INTO bmi_records (user_id, height_cm, weight_kg, bmi, category)
VALUES (2, 165.0, 60.0, 22.0, 'Normal');

-- Sample workout suggestion
INSERT INTO workout_suggestions (trainer_id, client_id, title, type, description)
VALUES (1, NULL, 'Full Body Strength – Day 1', 'Strength',
        '3×10 Squats\n3×12 Push-ups\n3×10 Deadlifts\n20 min Cardio');
