// backend/controllers/workoutController.js
const db = require("../config/db");

// GET /api/workouts
// - Trainer: returns suggestions they sent
// - Client:  returns suggestions sent to them (or "all")
async function getSuggestions(req, res) {
  try {
    const { id, role } = req.user;

    if (role === "trainer") {
      const workouts = await db.all(`SELECT * FROM workouts WHERE trainer_id = ? ORDER BY created_at DESC`, [id]);
      return res.json(workouts.map(w => ({
        id: w.id,
        trainerId: w.trainer_id,
        clientId: w.client_id === null ? "all" : w.client_id.toString(),
        title: w.title,
        type: w.type,
        description: w.description,
        createdAt: w.created_at
      })));
    }

    // Client
    const user = await db.get(`SELECT assigned_trainer_id FROM users WHERE id = ?`, [id]);
    const assignedTrainer = user ? user.assigned_trainer_id : null;
    
    if (!assignedTrainer) {
      return res.json([]);
    }

    const mine = await db.all(
      `SELECT * FROM workouts WHERE trainer_id = ? AND (client_id IS NULL OR client_id = ?) ORDER BY created_at DESC`,
      [assignedTrainer, id]
    );

    res.json(mine.map(w => ({
      id: w.id,
      trainerId: w.trainer_id,
      clientId: w.client_id === null ? "all" : w.client_id.toString(),
      title: w.title,
      type: w.type,
      description: w.description,
      createdAt: w.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// POST /api/workouts  (trainer only)
async function sendSuggestion(req, res) {
  try {
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainers only." });
    }

    const { title, type, description, clientId } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required." });
    
    const targetClient = (clientId === "all" || clientId === null || clientId === undefined) ? null : parseInt(clientId);

    const result = await db.run(
      `INSERT INTO workouts (trainer_id, client_id, title, type, description) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, targetClient, title, type || "General", description || ""]
    );
    
    const w = await db.get(`SELECT * FROM workouts WHERE id = ?`, [result.lastID]);

    res.status(201).json({
      id: w.id,
      trainerId: w.trainer_id,
      clientId: w.client_id === null ? "all" : w.client_id.toString(),
      title: w.title,
      type: w.type,
      description: w.description,
      createdAt: w.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

// DELETE /api/workouts/:id  (trainer only)
async function deleteSuggestion(req, res) {
  try {
    if (req.user.role !== "trainer") {
      return res.status(403).json({ error: "Trainers only." });
    }
    const id = parseInt(req.params.id);
    
    const w = await db.get(`SELECT * FROM workouts WHERE id = ? AND trainer_id = ?`, [id, req.user.id]);
    if (!w) return res.status(404).json({ error: "Not found." });
    
    await db.run(`DELETE FROM workouts WHERE id = ?`, [id]);
    res.json({ message: "Deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}

module.exports = { getSuggestions, sendSuggestion, deleteSuggestion };
