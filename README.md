# 🌐 NetVision — Network Monitoring Dashboard

> A full-stack network monitoring dashboard built with Node.js, Express, MySQL, and vanilla JavaScript. Designed for real-time network device monitoring in enterprise environments.

![NetVision Dashboard](https://img.shields.io/badge/Status-Active-22c55e?style=flat-square) ![Node.js](https://img.shields.io/badge/Node.js-v24-339933?style=flat-square&logo=node.js) ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql) ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | JWT-based login with bcrypt password hashing |
| 📊 **Dashboard** | Real-time overview with donut chart & activity feed |
| 🖥️ **Device Management** | Full CRUD — add, edit, delete network devices |
| 📡 **TCP Monitoring** | Auto-checks device status every 30 seconds via TCP port scanning |
| 📈 **Traffic Monitor** | Live inbound/outbound traffic chart with pause/resume |
| 🚨 **Alert Center** | Active alerts + activity log history |
| 🗺️ **Topology Map** | Interactive drag-and-drop network topology visualization |
| ⏱️ **Uptime Tracker** | Per-device uptime percentage for 24h and 7-day windows |
| 👤 **Profile** | Change password with current password verification |
| 🌙 **Dark/Light Mode** | Theme toggle with localStorage persistence |
| 📤 **Export CSV** | Export device list to CSV |
| 🔔 **Notifications** | Toast notifications for all CRUD actions |

---

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3, Vanilla JavaScript
- Chart.js — traffic & donut charts
- Tabler Icons — icon library
- Inter font — typography

**Backend**
- Node.js + Express.js
- MySQL2 — database driver
- bcrypt — password hashing
- jsonwebtoken — JWT authentication
- dotenv — environment config

**Database**
- MySQL (via XAMPP)
- Tables: `users`, `devices`, `activity_log`, `uptime_log`

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- XAMPP (MySQL)
- Git

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/vickyy-yos/NetVision.git
cd NetVision
```

**2. Setup database**

Start XAMPP and open phpMyAdmin (`localhost/phpmyadmin`), then run:

```sql
CREATE DATABASE netvision_db;
USE netvision_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(20) NOT NULL,
    status ENUM('Online', 'Offline') DEFAULT 'Offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE uptime_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id INT NOT NULL,
    status ENUM('Online', 'Offline') NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_device_checked (device_id, checked_at)
);
```

**3. Setup backend**
```bash
cd netvision-backend
npm install
```

Create `.env` file in `netvision-backend/`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=netvision_db
JWT_SECRET=your_secret_key_here
PORT=3000
```

**4. Register first user**
```bash
node index.js
```

Then via PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/register" -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}'
```

**5. Run the app**

- Backend: `node index.js` (in `netvision-backend/`)
- Frontend: Open `index.html` with Live Server (VS Code extension)

---

## 📁 Project Structure

```
NetVision/
├── index.html          # Login page
├── dashboard.html      # Main dashboard
├── devices.html        # Device management
├── traffic.html        # Traffic monitoring
├── alerts.html         # Alert center
├── topology.html       # Network topology map
├── uptime.html         # Uptime tracker
├── profile.html        # User profile
├── style.css           # Global styles
├── app.js              # Dashboard logic
├── app-devices.js      # Devices page logic
├── app-traffic.js      # Traffic page logic
├── app-alerts.js       # Alerts page logic
└── netvision-backend/
    ├── index.js        # Express server + API
    ├── db.js           # Database connection
    ├── .env            # Environment variables (not committed)
    └── package.json
```

---

## 🔒 Security Notes

- Passwords are hashed using **bcrypt** (salt rounds: 10)
- All API endpoints are protected with **JWT authentication**
- `.env` file is excluded from version control
- Token expiry: **2 hours**

---

## 👨‍💻 Author

**Vicky** — IT Intern  
GitHub: [@vickyy-yos](https://github.com/vickyy-yos)

---

## 📄 License

MIT License — feel free to use and modify.
