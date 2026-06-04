/**
 * fittrack-db.js  –  API Wrapper for FitTrack Backend
 * Replaces the old localStorage-based mock database.
 */

const FitTrackDB = (() => {

  const API_URL = "http://localhost:3000/api";

  // ── session ────────────────────────────────────────────────
  const getSession  = ()  => JSON.parse(localStorage.getItem("fittrack_session") || "null");
  const saveSession = (s) => localStorage.setItem("fittrack_session", JSON.stringify(s));
  const logout      = ()  => {
    localStorage.removeItem("fittrack_session");
    localStorage.removeItem("fittrack_token");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("fittrack_chat_target");
    window.location.href = "index.html";
  };
  const requireClient = () => {
    const s = getSession();
    if (!s || s.role !== "client") {
      window.location.href = "index.html";
      return null;
    }
    return s;
  };

  const _headers = () => ({
    "Content-Type": "application/json",
    "Authorization": "Bearer " + localStorage.getItem("fittrack_token")
  });

  // ── meals (nutrition.html) ─────────────────────────────────
  const getTodayMeals = async () => {
    const res = await fetch(`${API_URL}/nutrition`, { headers: _headers() });
    if (!res.ok) return [];
    return await res.json();
  };
  const addMeal = async (meal) => {
    await fetch(`${API_URL}/nutrition`, {
      method: "POST", headers: _headers(), body: JSON.stringify(meal)
    });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };
  const deleteMeal = async (mealId) => {
    await fetch(`${API_URL}/nutrition/${mealId}`, { method: "DELETE", headers: _headers() });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };

  // ── BMI records (bmi-calculator.html) ─────────────────────
  const getBmiLog = async () => {
    const res = await fetch(`${API_URL}/bmi`, { headers: _headers() });
    if (!res.ok) return [];
    return await res.json();
  };
  const saveBmi = async (bmiData) => {
    await fetch(`${API_URL}/bmi`, {
      method: "POST", headers: _headers(), body: JSON.stringify(bmiData)
    });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };
  const getLatestBmi = async () => {
    const log = await getBmiLog();
    return log.length > 0 ? log[0] : null;
  };

  // ── weight log (progress.html) ─────────────────────────────
  const getWeightLog = async () => {
    const res = await fetch(`${API_URL}/progress/weight`, { headers: _headers() });
    if (!res.ok) return [];
    return await res.json();
  };
  const addWeight = async (kg, notes = "") => {
    await fetch(`${API_URL}/progress/weight`, {
      method: "POST", headers: _headers(), body: JSON.stringify({ kg, notes })
    });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };
  const getLatestWeight = async () => {
    const log = await getWeightLog();
    if (log.length === 0) return null;
    const current = log[0].kg;
    const change = log.length >= 2 ? (current - log[1].kg).toFixed(1) : null;
    return { kg: current, change };
  };

  // ── weekly calories burned (workout_history) ───────────────
  const getWorkoutHist = async () => {
    const res = await fetch(`${API_URL}/progress/workouts`, { headers: _headers() });
    if (!res.ok) return [];
    return await res.json();
  };
  const logWorkout = async (entry) => {
    await fetch(`${API_URL}/progress/workouts`, {
      method: "POST", headers: _headers(), body: JSON.stringify(entry)
    });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };
  const getWeeklyBurn = async () => {
    const hist = await getWorkoutHist();
    const now = Date.now();
    const week = hist.filter(w => now - new Date(w.performed_at).getTime() < 7*24*3600*1000);
    const byDay = [0,0,0,0,0,0,0];  // Mon=0 … Sun=6
    const byDur = [0,0,0,0,0,0,0];
    week.forEach(w => {
      const d = new Date(w.performed_at).getDay(); // 0=Sun
      const idx = d === 0 ? 6 : d - 1;
      byDay[idx] += w.calories_burned || 0;
      byDur[idx] += w.duration_min    || 0;
    });
    return { total: byDay.reduce((a,b)=>a+b,0), byDay, byDayDuration: byDur };
  };

  // ── goals (client dashboard) ───────────────────────────────
  const getGoals = async (userId) => {
    const res = await fetch(`${API_URL}/goals/${userId}`, { headers: _headers() });
    if (!res.ok) return [];
    return await res.json();
  };
  const setGoal = async (metric, target_value) => {
    await fetch(`${API_URL}/goals`, {
      method: "POST", headers: _headers(), body: JSON.stringify({ metric, target_value })
    });
    window.dispatchEvent(new CustomEvent("fittrack:update"));
  };

  // ── trainer analytics ───────────────────────────────────────
  const getClientMeasurements = async (clientId) => {
    const res = await fetch(`${API_URL}/progress/client/${clientId}/measurements`, { headers: _headers() });
    if (!res.ok) return { weights: [], bmis: [] };
    return await res.json();
  };

  // ── admin functions ─────────────────────────────────────────
  const getAdminStats = async () => {
    const res = await fetch(`${API_URL}/admin/stats`, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch admin stats");
    return await res.json();
  };
  const getAdminUsers = async (role = "", search = "") => {
    const url = new URL(`${API_URL}/admin/users`);
    if (role) url.searchParams.append("role", role);
    if (search) url.searchParams.append("search", search);
    const res = await fetch(url, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch users");
    return await res.json();
  };
  const assignTrainer = async (clientId, trainerId) => {
    const res = await fetch(`${API_URL}/admin/assign-trainer`, {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify({ clientId, trainerId })
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to assign trainer");
    }
    return await res.json();
  };
  const getMemberships = async (userId = "") => {
    const url = new URL(`${API_URL}/admin/memberships`);
    if (userId) url.searchParams.append("userId", userId);
    const res = await fetch(url, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch memberships");
    return await res.json();
  };
  const saveMembership = async (membershipData) => {
    const res = await fetch(`${API_URL}/admin/memberships`, {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify(membershipData)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to save membership");
    }
    return await res.json();
  };
  const deactivateMembership = async (id) => {
    const res = await fetch(`${API_URL}/admin/memberships/${id}`, {
      method: "DELETE",
      headers: _headers()
    });
    if (!res.ok) throw new Error("Failed to deactivate membership");
    return await res.json();
  };
  const getAdminTutorials = async () => {
    const res = await fetch(`${API_URL}/admin/tutorials`, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch tutorials");
    return await res.json();
  };
  const createTutorial = async (tutorialData) => {
    const headers = {};
    const token = localStorage.getItem("fittrack_token");
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }

    let body;
    if (tutorialData instanceof FormData) {
      body = tutorialData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(tutorialData);
    }

    const res = await fetch(`${API_URL}/admin/tutorials`, {
      method: "POST",
      headers: headers,
      body: body
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to create tutorial");
    }
    return await res.json();
  };
  const deleteTutorial = async (id) => {
    const res = await fetch(`${API_URL}/admin/tutorials/${id}`, {
      method: "DELETE",
      headers: _headers()
    });
    if (!res.ok) throw new Error("Failed to delete tutorial");
    return await res.json();
  };
  const getAdminReports = async () => {
    const res = await fetch(`${API_URL}/admin/reports`, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch reports");
    return await res.json();
  };
  const getPublicTutorials = async (category = "", search = "") => {
    const url = new URL(`${API_URL}/tutorials`);
    if (category) url.searchParams.append("category", category);
    if (search) url.searchParams.append("search", search);
    const res = await fetch(url, { headers: _headers() });
    if (!res.ok) throw new Error("Failed to fetch public tutorials");
    return await res.json();
  };

  // ── public API ─────────────────────────────────────────────
  return {
    getSession, saveSession, logout, requireClient,
    getTodayMeals, addMeal, deleteMeal,
    getBmiLog, saveBmi, getLatestBmi,
    getWeightLog, addWeight, getLatestWeight,
    getWorkoutHist, logWorkout, getWeeklyBurn,
    getGoals, setGoal, getClientMeasurements,
    getAdminStats, getAdminUsers, assignTrainer,
    getMemberships, saveMembership, deactivateMembership,
    getAdminTutorials, createTutorial, deleteTutorial,
    getAdminReports, getPublicTutorials
  };
})();

// Make available globally
window.FitTrackDB = FitTrackDB;
