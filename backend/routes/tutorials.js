const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const db = require("../config/db");

router.use(auth);

// GET /api/tutorials - Public endpoint for logged-in clients/trainers
router.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM tutorial_videos WHERE 1=1`;
    const params = [];

    if (category && category !== "All" && category !== "") {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (title LIKE ? OR description LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }

    query += ` ORDER BY created_at DESC`;

    const tutorials = await db.all(query, params);
    res.json(tutorials);
  } catch (err) {
    console.error("Error in public getTutorials:", err);
    res.status(500).json({ error: "Server error retrieving tutorials." });
  }
});

module.exports = router;
