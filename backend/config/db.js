const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Path to the SQLite database file
const dbPath = path.join(__dirname, '../../database/database.db');

// Connect to SQLite Database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('✅ Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize Database Tables
function initializeDatabase() {
    db.serialize(() => {
        // Users Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'client',
            gender TEXT,
            age INTEGER,
            assigned_trainer_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Messages Table
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            body TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(sender_id) REFERENCES users(id),
            FOREIGN KEY(receiver_id) REFERENCES users(id)
        )`);

        // Workout Suggestions Table
        db.run(`CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trainer_id INTEGER NOT NULL,
            client_id INTEGER,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trainer_id) REFERENCES users(id),
            FOREIGN KEY(client_id) REFERENCES users(id)
        )`);

        // Meals Table
        db.run(`CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            calories INTEGER DEFAULT 0,
            protein INTEGER DEFAULT 0,
            carbs INTEGER DEFAULT 0,
            fats INTEGER DEFAULT 0,
            logged_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // BMI Records Table
        db.run(`CREATE TABLE IF NOT EXISTS bmi_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            height_cm REAL NOT NULL,
            weight_kg REAL NOT NULL,
            bmi REAL NOT NULL,
            category TEXT NOT NULL,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Weight Logs Table
        db.run(`CREATE TABLE IF NOT EXISTS weight_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            weight_kg REAL NOT NULL,
            notes TEXT,
            logged_date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Workout History Table
        db.run(`CREATE TABLE IF NOT EXISTS workout_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            duration_min INTEGER,
            calories_burned INTEGER,
            performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Client Goals Table
        db.run(`CREATE TABLE IF NOT EXISTS client_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric TEXT NOT NULL,
            target_value REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Tutorial Videos Table
        db.run(`CREATE TABLE IF NOT EXISTS tutorial_videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            uploaded_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(uploaded_by) REFERENCES users(id)
        )`);

        // Memberships Table
        db.run(`CREATE TABLE IF NOT EXISTS memberships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            plan TEXT DEFAULT 'Basic',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Workout Plans Table (weekly plans created by trainers for clients)
        db.run(`CREATE TABLE IF NOT EXISTS workout_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trainer_id INTEGER NOT NULL,
            client_id INTEGER NOT NULL,
            plan_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(trainer_id) REFERENCES users(id),
            FOREIGN KEY(client_id) REFERENCES users(id)
        )`);

        // Plan Exercises Table (exercises within a plan, assigned to a day)
        db.run(`CREATE TABLE IF NOT EXISTS plan_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id INTEGER NOT NULL,
            day_of_week TEXT NOT NULL,
            exercise_name TEXT NOT NULL,
            sets TEXT,
            reps TEXT,
            notes TEXT,
            is_completed BOOLEAN DEFAULT 0,
            completed_at DATETIME,
            FOREIGN KEY(plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
        )`);

        // Check if trainers exist, if not, create a default one
        db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'trainer'`, (err, row) => {
            if (row && row.count === 0) {
                const bcrypt = require('bcrypt');
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync('trainer123', salt);
                
                db.run(`INSERT INTO users (firstname, lastname, username, email, password_hash, role, gender, age)
                        VALUES ('Default', 'Trainer', 'default_trainer', 'trainer@fittrack.com', ?, 'trainer', 'Male', 30)`, [hash]);
                console.log('✅ Seeded default trainer: trainer@fittrack.com / trainer123');
            }
        });

        // Check if admin exists, if not, create a default one
        db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`, (err, row) => {
            if (row && row.count === 0) {
                const bcrypt = require('bcrypt');
                const salt = bcrypt.genSaltSync(10);
                const hash = bcrypt.hashSync('admin123', salt);
                
                db.run(`INSERT INTO users (firstname, lastname, username, email, password_hash, role, gender, age)
                        VALUES ('Default', 'Admin', 'default_admin', 'admin@fittrack.com', ?, 'admin', 'Male', 35)`, [hash]);
                console.log('✅ Seeded default admin: admin@fittrack.com / admin123');
            }
        });
    });
}

// Wrapper for Promises since we're using async/await in controllers
const dbPromise = {
    get: (sql, params) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    }),
    all: (sql, params) => new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    }),
    run: (sql, params) => new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this); // 'this' contains lastID and changes
        });
    })
};

module.exports = dbPromise;
