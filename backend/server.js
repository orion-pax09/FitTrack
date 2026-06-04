// ============================================================
//  FitTrack – Backend  (Node.js + Express)
//  server.js  –  entry point
// ============================================================

const express = require("express");
const cors    = require("cors");
const path    = require("path");
const http    = require("http");
const fs      = require("fs");
const { Server } = require("socket.io");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket logic
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  
  socket.on("join", (userId) => {
    socket.join(userId.toString());
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.set("io", io); // Make io accessible in routes

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// Serve frontend files from ../Frontend_fittrack
app.use(express.static(path.join(__dirname, "../Frontend_fittrack")));

// ── Routes ────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/nutrition", require("./routes/nutrition"));
app.use("/api/workouts",  require("./routes/workouts"));
app.use("/api/bmi",       require("./routes/bmi"));
app.use("/api/messages",  require("./routes/messages"));
app.use("/api/progress",  require("./routes/progress"));
app.use("/api/goals",     require("./routes/goals"));
app.use("/api/admin",     require("./routes/admin"));
app.use("/api/tutorials", require("./routes/tutorials"));
app.use("/api/workout-plans", require("./routes/workoutPlans"));

// ── Root fallback ─────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend_fittrack", "html", "index.html"));
});

// ── Start ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ FitTrack server running on http://localhost:${PORT}`));
