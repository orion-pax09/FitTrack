// backend/routes/nutrition.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../config/db");

// GET /api/nutrition?date=YYYY-MM-DD
router.get("/", auth, async (req, res) => {
  try {
    const date  = req.query.date || new Date().toISOString().split("T")[0];
    const meals = await db.all(`SELECT * FROM meals WHERE user_id = ? AND logged_date = ?`, [req.user.id, date]);
    res.json(meals.map(m => ({
      id: m.id,
      userId: m.user_id,
      name: m.name,
      calories: m.calories,
      proteinG: m.protein,
      carbsG: m.carbs,
      fatsG: m.fats,
      loggedDate: m.logged_date,
      createdAt: m.created_at
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/nutrition
router.post("/", auth, async (req, res) => {
  try {
    const { name, calories, proteinG, carbsG, fatsG } = req.body;
    if (!name) return res.status(400).json({ error: "Meal name required." });

    const result = await db.run(
      `INSERT INTO meals (user_id, name, calories, protein, carbs, fats, logged_date) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, calories || 0, proteinG || 0, carbsG || 0, fatsG || 0, new Date().toISOString().split("T")[0]]
    );

    const m = await db.get(`SELECT * FROM meals WHERE id = ?`, [result.lastID]);

    res.status(201).json({
      id: m.id,
      userId: m.user_id,
      name: m.name,
      calories: m.calories,
      proteinG: m.protein,
      carbsG: m.carbs,
      fatsG: m.fats,
      loggedDate: m.logged_date,
      createdAt: m.created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/nutrition/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const meal = await db.get(`SELECT * FROM meals WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
    if (!meal) return res.status(404).json({ error: "Not found." });
    
    await db.run(`DELETE FROM meals WHERE id = ?`, [req.params.id]);
    res.json({ message: "Deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
