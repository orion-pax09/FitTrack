// backend/routes/progress.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../config/db");

// GET /api/progress/weight
router.get("/weight", auth, async (req, res) => {
  try {
    const logs = await db.all(`SELECT * FROM weight_logs WHERE user_id = ? ORDER BY logged_date DESC`, [req.user.id]);
    res.json(logs.map(l => ({
      id: l.id,
      kg: l.weight_kg,
      notes: l.notes,
      date: new Date(l.logged_date).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }),
      ts: new Date(l.created_at).getTime()
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/progress/weight
router.post("/weight", auth, async (req, res) => {
  try {
    const { kg, notes } = req.body;
    if (!kg) return res.status(400).json({ error: "Weight required." });

    const result = await db.run(
      `INSERT INTO weight_logs (user_id, weight_kg, notes, logged_date) VALUES (?, ?, ?, ?)`,
      [req.user.id, kg, notes || "", new Date().toISOString().split("T")[0]]
    );
    
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/progress/workouts
router.get("/workouts", auth, async (req, res) => {
  try {
    const hist = await db.all(`SELECT * FROM workout_history WHERE user_id = ? ORDER BY performed_at DESC`, [req.user.id]);
    res.json(hist.map(h => ({
      id: h.id,
      title: h.title,
      duration_min: h.duration_min,
      calories_burned: h.calories_burned,
      performed_at: h.performed_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/progress/workouts
router.post("/workouts", auth, async (req, res) => {
  try {
    const { title, duration_min, calories_burned } = req.body;
    if (!title) return res.status(400).json({ error: "Title required." });

    const result = await db.run(
      `INSERT INTO workout_history (user_id, title, duration_min, calories_burned) VALUES (?, ?, ?, ?)`,
      [req.user.id, title, duration_min || 0, calories_burned || 0]
    );

    res.status(201).json({ id: result.lastID });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/progress/client/:clientId/measurements
// Fetch measurements for a specific client (trainer only)
router.get("/client/:clientId/measurements", auth, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') {
      return res.status(403).json({ error: "Unauthorized. Trainer access only." });
    }
    
    const clientId = req.params.clientId;
    const weights = await db.all(`SELECT * FROM weight_logs WHERE user_id = ? ORDER BY logged_date ASC`, [clientId]);
    const bmis = await db.all(`SELECT * FROM bmi_records WHERE user_id = ? ORDER BY recorded_at ASC`, [clientId]);
    
    res.json({
      weights: weights.map(w => ({
        id: w.id, kg: w.weight_kg, date: w.logged_date, ts: new Date(w.logged_date).getTime()
      })),
      bmis: bmis.map(b => ({
        id: b.id, bmi: b.bmi, kg: b.weight_kg, date: b.recorded_at, ts: new Date(b.recorded_at).getTime()
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
