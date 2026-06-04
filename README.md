# FitTrack - Fitness Tracking Full Stack Web Application

## 📌 Project Overview

FitTrack is a full-stack web application designed to help users track their fitness progress, including body measurements, workout history, and personal health goals. The system also allows trainers to monitor client progress and provide feedback based on real-time data visualization.

---

## 🎯 Features

* 👤 User authentication (Login/Register)
* 🏋️ Client fitness profile management
* 📊 Body measurement tracking over time
* 📈 Progress visualization charts
* 🎯 Goal setting and achievement tracking
* 👨‍🏫 Trainer dashboard for managing clients
* 🔔 Notifications for goal completion or updates
* 💾 SQLite database integration for data storage

---

## 🏗️ Tech Stack

**Frontend:**

* HTML, CSS, JavaScript
* (React if applicable)

**Backend:**

* Node.js
* Express.js

**Database:**

* SQLite

**Other Tools:**

* JWT Authentication
* bcrypt password hashing
* Chart visualization library (if used)

---

## 🧠 System Architecture

The system is built using a client-server architecture:

* Frontend communicates with backend via REST APIs
* Backend handles authentication, business logic, and data processing
* SQLite database stores user, trainer, and fitness records

---

## 📊 Figma UI Design

👉 UI/UX Design Reference:

https://www.figma.com/make/5Sl2Huiv15qMF3EMjz4zvX/Gym-Fitness-Management-System?t=2jwAh9vwppbGd4bf-1

---

## 🚀 Installation & Setup

```bash
# Clone repository
git clone https://github.com/orion-pax09/FitTrack.git

# Navigate to project
cd FitTrack

# Install dependencies
npm install

# Start backend server
npm start
```

---

## 🔐 Environment Variables

Create a `.env` file:

```
JWT_SECRET=your_secret_key
DB_PATH=database/database.db
PORT=3000
```

---

## 📂 Project Structure

```
FitTrack/
│── backend/
│── frontend/
│── database/
│── routes/
│── controllers/
│── models/
│── server.js
```

---

## 📈 Future Improvements

* Mobile application version
* AI-based fitness recommendations
* Cloud database migration
* Real-time chat between trainer and client

---

## 👨‍💻 Developer

Muhammad Hamza Khan
Full Stack Developer

---

## 📌 License

This project is for academic and educational purposes.
