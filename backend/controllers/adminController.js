const db = require("../config/db");

// Helper to extract YouTube video ID and construct standard embed and thumbnail URLs
function getYoutubeDetails(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    const videoId = match[2];
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };
  }
  return {
    embedUrl: url,
    thumbnailUrl: null
  };
}

// GET /api/admin/stats
async function getStats(req, res) {
  try {
    const totalUsers = await db.get(`SELECT COUNT(*) as count FROM users`);
    const totalTrainers = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'trainer'`);
    const totalClients = await db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'client'`);
    const activeMemberships = await db.get(`SELECT COUNT(*) as count FROM memberships WHERE is_active = 1`);

    res.json({
      totalUsers: totalUsers ? totalUsers.count : 0,
      totalTrainers: totalTrainers ? totalTrainers.count : 0,
      totalClients: totalClients ? totalClients.count : 0,
      activeMemberships: activeMemberships ? activeMemberships.count : 0
    });
  } catch (err) {
    console.error("Error in getStats:", err);
    res.status(500).json({ error: "Server error retrieving stats." });
  }
}

// GET /api/admin/users
async function getUsers(req, res) {
  try {
    const { role, search } = req.query;
    let query = `
      SELECT u.id, u.firstname, u.lastname, u.username, u.email, u.role, u.assigned_trainer_id, u.created_at,
             (t.firstname || ' ' || t.lastname) as trainer_name
      FROM users u
      LEFT JOIN users t ON u.assigned_trainer_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (search) {
      query += ` AND (u.firstname LIKE ? OR u.lastname LIKE ? OR u.username LIKE ? OR u.email LIKE ?)`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    query += ` ORDER BY u.created_at DESC`;

    const users = await db.all(query, params);
    res.json(users);
  } catch (err) {
    console.error("Error in getUsers:", err);
    res.status(500).json({ error: "Server error retrieving users." });
  }
}

// POST /api/admin/assign-trainer
async function assignTrainer(req, res) {
  try {
    const { clientId, trainerId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: "Client ID is required." });
    }

    // Verify client exists
    const client = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'client'`, [clientId]);
    if (!client) {
      return res.status(404).json({ error: "Client not found." });
    }

    // Verify trainer exists (if trainerId is provided)
    if (trainerId) {
      const trainer = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'trainer'`, [trainerId]);
      if (!trainer) {
        return res.status(404).json({ error: "Trainer not found." });
      }
    }

    const tId = trainerId ? parseInt(trainerId) : null;
    await db.run(`UPDATE users SET assigned_trainer_id = ? WHERE id = ?`, [tId, clientId]);

    res.json({ message: "Trainer assigned successfully." });
  } catch (err) {
    console.error("Error in assignTrainer:", err);
    res.status(500).json({ error: "Server error assigning trainer." });
  }
}

// GET /api/admin/memberships
async function getMemberships(req, res) {
  try {
    const { userId } = req.query;

    // Check permissions: clients can only query their own memberships
    if (req.user.role === "client" && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: "Access denied. You can only view your own membership." });
    }

    let query = `
      SELECT m.id, m.user_id, m.plan, m.start_date, m.end_date, m.is_active, m.created_at,
             u.firstname, u.lastname, u.email
      FROM memberships m
      JOIN users u ON m.user_id = u.id
    `;
    const params = [];

    if (userId) {
      query += ` WHERE m.user_id = ?`;
      params.push(parseInt(userId));
    } else {
      query += ` ORDER BY m.created_at DESC`;
    }

    const memberships = await db.all(query, params);

    // If querying specific user and it doesn't exist in memberships, return a default 'Basic' status
    if (userId && memberships.length === 0) {
      const user = await db.get(`SELECT firstname, lastname, email, created_at FROM users WHERE id = ?`, [parseInt(userId)]);
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      return res.json([{
        id: null,
        user_id: parseInt(userId),
        plan: "None",
        start_date: null,
        end_date: null,
        is_active: 0,
        created_at: null,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email
      }]);
    }

    res.json(memberships);
  } catch (err) {
    console.error("Error in getMemberships:", err);
    res.status(500).json({ error: "Server error retrieving memberships." });
  }
}

// POST /api/admin/memberships
async function saveMembership(req, res) {
  try {
    const { userId, plan, startDate, endDate } = req.body;
    if (!userId || !plan || !startDate || !endDate) {
      return res.status(400).json({ error: "All fields are required (userId, plan, startDate, endDate)." });
    }

    // Verify user exists and is a client
    const user = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'client'`, [userId]);
    if (!user) {
      return res.status(404).json({ error: "Client not found." });
    }

    // Insert or replace membership (ON CONFLICT in SQLite)
    await db.run(`
      INSERT INTO memberships (user_id, plan, start_date, end_date, is_active)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET
        plan = excluded.plan,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        is_active = 1
    `, [parseInt(userId), plan, startDate, endDate]);

    res.json({ message: "Membership updated successfully." });
  } catch (err) {
    console.error("Error in saveMembership:", err);
    res.status(500).json({ error: "Server error saving membership." });
  }
}

// DELETE /api/admin/memberships/:id
async function deactivateMembership(req, res) {
  try {
    const { id } = req.params;
    await db.run(`UPDATE memberships SET is_active = 0 WHERE id = ?`, [parseInt(id)]);
    res.json({ message: "Membership deactivated successfully." });
  } catch (err) {
    console.error("Error in deactivateMembership:", err);
    res.status(500).json({ error: "Server error deactivating membership." });
  }
}

// GET /api/admin/tutorials
async function getTutorials(req, res) {
  try {
    const tutorials = await db.all(`SELECT * FROM tutorial_videos ORDER BY created_at DESC`);
    res.json(tutorials);
  } catch (err) {
    console.error("Error in getTutorials:", err);
    res.status(500).json({ error: "Server error retrieving tutorials." });
  }
}

// POST /api/admin/tutorials
async function createTutorial(req, res) {
  try {
    const { title, description, category, videoUrl } = req.body;
    if (!title || !category || (!videoUrl && !req.file)) {
      return res.status(400).json({ error: "Title, category, and either a video file or a video URL are required." });
    }

    let finalVideoUrl = "";
    let finalThumbnailUrl = null;

    if (req.file) {
      finalVideoUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    } else {
      const { embedUrl, thumbnailUrl } = getYoutubeDetails(videoUrl);
      finalVideoUrl = embedUrl;
      finalThumbnailUrl = thumbnailUrl;
    }

    const adminId = req.user.id;

    await db.run(`
      INSERT INTO tutorial_videos (title, description, category, video_url, thumbnail_url, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description || "", category, finalVideoUrl, finalThumbnailUrl, adminId]);

    res.status(201).json({ message: "Tutorial video added successfully." });
  } catch (err) {
    console.error("Error in createTutorial:", err);
    res.status(500).json({ error: "Server error creating tutorial." });
  }
}

// DELETE /api/admin/tutorials/:id
async function deleteTutorial(req, res) {
  try {
    const { id } = req.params;
    await db.run(`DELETE FROM tutorial_videos WHERE id = ?`, [parseInt(id)]);
    res.json({ message: "Tutorial video deleted successfully." });
  } catch (err) {
    console.error("Error in deleteTutorial:", err);
    res.status(500).json({ error: "Server error deleting tutorial." });
  }
}

// GET /api/admin/reports
async function getReports(req, res) {
  try {
    // 1. User growth (past 30 days)
    const userGrowth = await db.all(`
      SELECT date(created_at) as date, COUNT(*) as count 
      FROM users 
      GROUP BY date(created_at) 
      ORDER BY date ASC 
      LIMIT 30
    `);

    // 2. Membership plans distribution
    const planDistribution = await db.all(`
      SELECT plan, COUNT(*) as count 
      FROM memberships 
      WHERE is_active = 1 
      GROUP BY plan
    `);

    // 3. Trainer workload (clients per trainer)
    const trainerWorkload = await db.all(`
      SELECT (t.firstname || ' ' || t.lastname) as trainer_name, COUNT(c.id) as client_count
      FROM users t
      LEFT JOIN users c ON c.assigned_trainer_id = t.id AND c.role = 'client'
      WHERE t.role = 'trainer'
      GROUP BY t.id
    `);

    // 4. Workout completions over time
    const workoutCompletions = await db.all(`
      SELECT date(performed_at) as date, COUNT(*) as count 
      FROM workout_history 
      GROUP BY date(performed_at) 
      ORDER BY date ASC 
      LIMIT 30
    `);

    res.json({
      userGrowth,
      planDistribution,
      trainerWorkload,
      workoutCompletions
    });
  } catch (err) {
    console.error("Error in getReports:", err);
    res.status(500).json({ error: "Server error generating reports." });
  }
}

module.exports = {
  getStats,
  getUsers,
  assignTrainer,
  getMemberships,
  saveMembership,
  deactivateMembership,
  getTutorials,
  createTutorial,
  deleteTutorial,
  getReports
};
