const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../config/db");

// POST /api/goals
// Set or update a goal for a specific metric
router.post("/", auth, async (req, res) => {
  try {
    const { metric, target_value } = req.body;
    if (!metric || target_value === undefined) {
      return res.status(400).json({ error: "Metric and target_value are required." });
    }

    // Check if goal already exists for this metric
    const existingGoal = await db.get(
      `SELECT * FROM client_goals WHERE user_id = ? AND metric = ?`,
      [req.user.id, metric]
    );

    if (existingGoal) {
      // Update existing
      await db.run(
        `UPDATE client_goals SET target_value = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [target_value, existingGoal.id]
      );
      res.status(200).json({ message: "Goal updated successfully", id: existingGoal.id });
    } else {
      // Insert new
      const result = await db.run(
        `INSERT INTO client_goals (user_id, metric, target_value) VALUES (?, ?, ?)`,
        [req.user.id, metric, target_value]
      );
      res.status(201).json({ message: "Goal created successfully", id: result.lastID });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/goals/:userId
// Get all goals for a specific user
router.get("/:userId", auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    // Basic authorization: user can view their own goals, or a trainer can view any client's goals.
    // For simplicity we allow if token is present, but let's restrict to own id or trainer role.
    if (req.user.id != userId && req.user.role !== 'trainer') {
        return res.status(403).json({ error: "Unauthorized access to client goals." });
    }

    const goals = await db.all(`SELECT * FROM client_goals WHERE user_id = ?`, [userId]);
    res.json(goals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
