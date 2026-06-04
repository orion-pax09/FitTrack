// backend/routes/messages.js
const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const db      = require("../config/db");

// GET /api/messages?with=USER_ID
router.get("/", auth, async (req, res) => {
  const withId = parseInt(req.query.with);
  try {
    const thread = await db.all(`
      SELECT m.id, m.sender_id as senderId, m.receiver_id as receiverId, m.body as text, 
             strftime('%H:%M', m.sent_at) as time, u.firstname || ' ' || u.lastname as senderName
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.sent_at ASC
    `, [req.user.id, withId, withId, req.user.id]);
    res.json(thread);
  } catch(err) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/messages
router.post("/", auth, async (req, res) => {
  const { receiverId, body } = req.body;
  if (!receiverId || !body) return res.status(400).json({ error: "receiverId and body required." });
  
  try {
    const result = await db.run(
      `INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)`,
      [req.user.id, receiverId, body]
    );

    const sender = await db.get(`SELECT firstname, lastname FROM users WHERE id = ?`, [req.user.id]);
    const senderName = `${sender.firstname} ${sender.lastname}`;
    
    // We construct it similarly to the frontend structure
    const msg = { 
      id: result.lastID, 
      senderId: req.user.id, 
      receiverId: parseInt(receiverId), 
      text: body, 
      senderName,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    // Broadcast to the specific receiver
    const io = req.app.get("io");
    if (io) {
      io.to(receiverId.toString()).emit("newMessage", msg);
    }

    res.status(201).json(msg);
  } catch(err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
