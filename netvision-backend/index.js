require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const net = require('net');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('NetVision API is running');
});

function verifyToken(req, res, next){
    const authHeader = req.headers['authorization'];
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({ message: 'Token tidak ditemukan, silakan login' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if(err) return res.status(403).json({ message: 'Token tidak valid atau sudah kedaluwarsa' });
        req.user = decoded;
        next();
    });
}

app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username dan password wajib diisi' });
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) return res.status(409).json({ message: 'Username sudah dipakai' });
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'Akun berhasil dibuat' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ message: 'Username dan password wajib diisi' });
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(401).json({ message: 'Username atau password salah' });
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Username atau password salah' });
        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
        res.json({ message: 'Login berhasil', token, username: user.username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.get('/api/devices', verifyToken, async (req, res) => {
    try {
        const [devices] = await db.query('SELECT * FROM devices');
        res.json(devices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.post('/api/devices', verifyToken, async (req, res) => {
    try {
        const { name, ip_address, status } = req.body;
        if (!name || !ip_address) return res.status(400).json({ message: 'Nama dan IP address wajib diisi' });
        const validStatus = (status === 'Online' || status === 'Offline') ? status : 'Offline';
        const [result] = await db.query('INSERT INTO devices (name, ip_address, status) VALUES (?, ?, ?)', [name, ip_address, validStatus]);
        res.status(201).json({ message: 'Device berhasil ditambahkan', device: { id: result.insertId, name, ip_address, status: validStatus } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.put('/api/devices/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ip_address, status } = req.body;
        if (!name || !ip_address) return res.status(400).json({ message: 'Nama dan IP address wajib diisi' });
        const validStatus = (status === 'Online' || status === 'Offline') ? status : 'Offline';
        const [result] = await db.query('UPDATE devices SET name = ?, ip_address = ?, status = ? WHERE id = ?', [name, ip_address, validStatus, id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Device tidak ditemukan' });
        res.json({ message: 'Device berhasil diupdate' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.delete('/api/devices/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query('DELETE FROM devices WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Device tidak ditemukan' });
        res.json({ message: 'Device berhasil dihapus' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, username, created_at FROM users WHERE id = ?', [req.user.id]);
        if(rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.put('/api/profile', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if(rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
        const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
        if(!isMatch) return res.status(401).json({ message: 'Password lama salah' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
        res.json({ message: 'Password berhasil diubah' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.get('/api/logs', verifyToken, async (req, res) => {
    try {
        const [logs] = await db.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 50');
        res.json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

app.post('/api/logs', verifyToken, async (req, res) => {
    try {
        const { action, device_name, detail } = req.body;
        await db.query('INSERT INTO activity_log (username, action, device_name, detail) VALUES (?, ?, ?, ?)', [req.user.username, action, device_name, detail || '']);
        res.status(201).json({ message: 'Log berhasil disimpan' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

// ===== TCP MONITORING =====
function tcpCheck(host, port, timeout = 2000){
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = false;
        socket.setTimeout(timeout);
        socket.on('connect', () => { status = true; socket.destroy(); });
        socket.on('timeout', () => { socket.destroy(); });
        socket.on('error', () => { socket.destroy(); });
        socket.on('close', () => { resolve(status); });
        socket.connect(port, host);
    });
}

async function checkDevice(ip){
    const ports = [80, 443, 22, 8080, 8443, 23, 21];
    for(const port of ports){
        const alive = await tcpCheck(ip, port);
        if(alive) return { alive: true, port };
    }
    return { alive: false, port: null };
}

async function pingAllDevices(){
    try{
        const [devices] = await db.query('SELECT id, name, ip_address, status FROM devices');
        for(const device of devices){
            try{
                const result = await checkDevice(device.ip_address);
                const newStatus = result.alive ? 'Online' : 'Offline';

                // Update status kalau berubah
                if(newStatus !== device.status){
                    await db.query('UPDATE devices SET status = ? WHERE id = ?', [newStatus, device.id]);
                    console.log(`[MONITOR] ${device.name} (${device.ip_address}): ${device.status} → ${newStatus}${result.port ? ' port:'+result.port : ''}`);
                }

                // Catat ke uptime_log
                await db.query('INSERT INTO uptime_log (device_id, status) VALUES (?, ?)', [device.id, newStatus]);

                // Hapus log lebih dari 7 hari
                await db.query('DELETE FROM uptime_log WHERE device_id = ? AND checked_at < DATE_SUB(NOW(), INTERVAL 7 DAY)', [device.id]);

            }catch(e){ console.error(`[MONITOR ERROR] ${device.name}:`, e.message); }
        }
        console.log(`[MONITOR] Check selesai — ${new Date().toLocaleTimeString()}`);
    }catch(e){ console.error('[MONITOR ALL ERROR]:', e.message); }
}

// Endpoint uptime stats
app.get('/api/uptime', verifyToken, async (req, res) => {
    try{
        const [devices] = await db.query('SELECT id, name, ip_address, status FROM devices');

        const stats = await Promise.all(devices.map(async (device) => {
            // Uptime 24 jam
            const [rows24] = await db.query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Online' THEN 1 ELSE 0 END) as online_count
                FROM uptime_log
                WHERE device_id = ?
                AND checked_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `, [device.id]);

            // Uptime 7 hari
            const [rows7d] = await db.query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Online' THEN 1 ELSE 0 END) as online_count
                FROM uptime_log
                WHERE device_id = ?
                AND checked_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `, [device.id]);

            const uptime24 = rows24[0].total > 0
                ? ((rows24[0].online_count / rows24[0].total) * 100).toFixed(1)
                : null;

            const uptime7d = rows7d[0].total > 0
                ? ((rows7d[0].online_count / rows7d[0].total) * 100).toFixed(1)
                : null;

            return {
                ...device,
                uptime_24h: uptime24,
                uptime_7d: uptime7d,
                checks_24h: rows24[0].total,
                checks_7d: rows7d[0].total
            };
        }));

        res.json(stats);
    }catch(e){
        console.error(e);
        res.status(500).json({ message: 'Terjadi kesalahan server' });
    }
});

pingAllDevices();
setInterval(pingAllDevices, 30000);
console.log('TCP monitoring aktif — interval 30 detik');

app.get('/api/ping', async (req, res) => {
    await pingAllDevices();
    const [devices] = await db.query('SELECT * FROM devices');
    res.json({ message: 'Check selesai', devices });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`NetVision API jalan di http://localhost:${PORT}`);
});