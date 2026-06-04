const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const db     = require("../config/db"); // Added database connection

const JWT_SECRET = process.env.JWT_SECRET || "fittrack_dev_secret_change_me";
const SALT_ROUNDS = 10;

// ── Register ──────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { firstname, lastname, username, email, password, role, gender, age, assignedTrainerId } = req.body;

    if (!firstname || !lastname || !username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Check if email or username already exists
    const existingUser = await db.get(`SELECT id FROM users WHERE email = ? OR username = ?`, [email, username]);
    if (existingUser) {
      return res.status(409).json({ error: "Email or username already in use." });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    // Trainer assignment logic
    let trainer = null;
    if (role === "client") {
      if (!assignedTrainerId) return res.status(400).json({ error: "Please select a trainer." });
      trainer = await db.get(`SELECT id, firstname, lastname FROM users WHERE id = ? AND role = 'trainer'`, [parseInt(assignedTrainerId)]);
      if (!trainer) return res.status(400).json({ error: "Trainer not found." });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert new user into database
    await db.run(
      `INSERT INTO users (firstname, lastname, username, email, password_hash, role, gender, age, assigned_trainer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstname, lastname, username, email, password_hash, role, gender || null, age || null, trainer ? trainer.id : null]
    );

    res.status(201).json({ message: "Account created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

// ── Login ─────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required." });

    // Find user by email
    const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    // Compare password hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)  return res.status(401).json({ error: "Invalid email or password." });

    // If client has a trainer, fetch the trainer's name
    let assignedTrainerName = null;
    if (user.role === 'client' && user.assigned_trainer_id) {
       const trainer = await db.get(`SELECT firstname, lastname FROM users WHERE id = ?`, [user.assigned_trainer_id]);
       if (trainer) {
         assignedTrainerName = `${trainer.firstname} ${trainer.lastname}`;
       }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id:                  user.id,
        firstname:           user.firstname,
        lastname:            user.lastname,
        username:            user.username,
        email:               user.email,
        role:                user.role,
        assignedTrainerId:   user.assigned_trainer_id   || null,
        assignedTrainerName: assignedTrainerName
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

// ── Get trainers list (for registration dropdown) ──────────────
async function getTrainers(req, res) {
  try {
    const trainers = await db.all(`SELECT id, firstname, lastname, username FROM users WHERE role = 'trainer'`);
    res.json(trainers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

// ── Get trainer's clients ─────────────────────────────────────
async function getClients(req, res) {
  try {
    const trainerId = req.user.id;
    if (req.user.role !== 'trainer') {
      return res.status(403).json({ error: "Access denied." });
    }
    
    const clients = await db.all(
      `SELECT id, firstname, lastname, username, gender, age FROM users WHERE role = 'client' AND assigned_trainer_id = ?`,
      [trainerId]
    );
    res.json(clients);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
}

module.exports = { register, login, getTrainers, getClients };
