let devices = [];
const health = 96;
const API_BASE = "http://localhost:3000/api";
let currentPage = 1;
const itemsPerPage = 5;

function getToken(){
    return localStorage.getItem("token");
}

function authHeaders(){
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}

function handleAuthError(response){
    if(response.status === 401 || response.status === 403){
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("token");
        window.location.href = "index.html";
        return true;
    }
    return false;
}

async function loadDevices(){
    try{
        const response = await fetch(`${API_BASE}/devices`, {
            headers: authHeaders()
        });

        if(handleAuthError(response)) return;

        if(!response.ok){
            throw new Error("Gagal mengambil data device");
        }

        devices = await response.json();

        renderTable(devices);
        renderAlerts();

        const total = devices.length;
        const online = devices.filter(d => d.status === "Online").length;
        const offline = devices.filter(d => d.status === "Offline").length;

        animateValue("totalDevice", total);
        animateValue("onlineDevice", online);
        document.getElementById("offlineDevice").innerText = offline;
        document.getElementById("avgPing").innerText = "12 ms";

        updateDonutChart(online, offline);
        loadActivityFeed();

    }catch(err){
        console.error(err);
        const tbody = document.querySelector("#deviceTable tbody");
        tbody.innerHTML = `<tr><td colspan="4">Tidak bisa memuat data device. Pastikan backend berjalan.</td></tr>`;
    }
}

loadDevices();

function showNotification(message, type = "warning"){
    const container = document.getElementById("notifContainer") ||
        (() => {
            const el = document.createElement("div");
            el.id = "notifContainer";
            document.body.appendChild(el);
            return el;
        })();

    const notif = document.createElement("div");
    notif.className = `notif notif-${type}`;

    const icon = type === "warning" ? "ti-alert-triangle" :
                 type === "success" ? "ti-circle-check" : "ti-info-circle";

    notif.innerHTML = `
        <i class="ti ${icon}"></i>
        <span>${message}</span>
        <button class="notif-close" onclick="this.parentElement.remove()">
            <i class="ti ti-x"></i>
        </button>
    `;

    container.appendChild(notif);

    setTimeout(() => {
        notif.classList.add("notif-hide");
        setTimeout(() => notif.remove(), 400);
    }, 4000);
}

function renderAlerts(){
    const alertsContainer = document.getElementById("alerts");
    alertsContainer.innerHTML = "";

    const offlineDevices = devices.filter(d => d.status === "Offline");

    offlineDevices.forEach(device => {
        const div = document.createElement("div");
        div.className = "alert";
        div.textContent = `⚠️ ${device.name} is Offline`;
        alertsContainer.appendChild(div);
    });

    if(offlineDevices.length > 0){
        offlineDevices.forEach(device => {
            showNotification(`${device.name} (${device.ip_address}) is Offline`, "warning");
        });
    } else {
        showNotification("All devices are online", "success");
    }
}

function renderTable(data){
    const tbody = document.querySelector("#deviceTable tbody");
    tbody.innerHTML = "";

    const totalPages = Math.ceil(data.length / itemsPerPage);
    if(currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const paginated = data.slice(start, start + itemsPerPage);

    if(paginated.length === 0){
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#94a3b8">Tidak ada device ditemukan</td></tr>`;
    } else {
        paginated.forEach(device => {
            const tr = document.createElement("tr");

            const tdName = document.createElement("td");
            tdName.textContent = device.name;

            const tdIp = document.createElement("td");
            tdIp.textContent = device.ip_address;

            const tdStatus = document.createElement("td");
            tdStatus.className = device.status.toLowerCase();
            tdStatus.textContent = device.status === "Online" ? "🟢 Online" : "🔴 Offline";

            const tdAction = document.createElement("td");

            const editBtn = document.createElement("button");
            editBtn.className = "btn-icon";
            editBtn.innerHTML = '✏️';
            editBtn.title = "Edit";
            editBtn.onclick = () => openEditModal(device);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn-icon danger";
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = "Delete";
            deleteBtn.onclick = () => deleteDevice(device.id, device.name);

            tdAction.appendChild(editBtn);
            tdAction.appendChild(deleteBtn);

            tr.appendChild(tdName);
            tr.appendChild(tdIp);
            tr.appendChild(tdStatus);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    }

    renderPagination(data.length, totalPages);
}

function renderPagination(total, totalPages){
    let paginationEl = document.getElementById("pagination");

    if(!paginationEl){
        paginationEl = document.createElement("div");
        paginationEl.id = "pagination";
        document.getElementById("deviceTable").after(paginationEl);
    }

    paginationEl.innerHTML = "";

    if(totalPages <= 1){
        paginationEl.style.display = "none";
        return;
    }

    paginationEl.style.display = "flex";

    const info = document.createElement("span");
    info.className = "pagination-info";
    info.textContent = `Showing ${Math.min((currentPage-1)*itemsPerPage+1, total)}–${Math.min(currentPage*itemsPerPage, total)} of ${total} devices`;
    paginationEl.appendChild(info);

    const btnGroup = document.createElement("div");
    btnGroup.className = "pagination-btns";

    const prevBtn = document.createElement("button");
    prevBtn.className = "btn-page" + (currentPage === 1 ? " disabled" : "");
    prevBtn.innerHTML = '<i class="ti ti-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderTable(devices); };

    for(let i = 1; i <= totalPages; i++){
        const pageBtn = document.createElement("button");
        pageBtn.className = "btn-page" + (i === currentPage ? " active" : "");
        pageBtn.textContent = i;
        pageBtn.onclick = () => { currentPage = i; renderTable(devices); };
        btnGroup.appendChild(pageBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.className = "btn-page" + (currentPage === totalPages ? " disabled" : "");
    nextBtn.innerHTML = '<i class="ti ti-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderTable(devices); };

    btnGroup.prepend(prevBtn);
    btnGroup.appendChild(nextBtn);
    paginationEl.appendChild(btnGroup);
}

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keyup", () => {
    const keyword = searchInput.value.toLowerCase();
    const filteredDevices = devices.filter(device =>
        device.name.toLowerCase().includes(keyword) ||
        device.ip_address.toLowerCase().includes(keyword)
    );
    renderTable(filteredDevices);
});

function exportCSV(){
    if(devices.length === 0){
        alert("Tidak ada data device untuk diekspor");
        return;
    }

    const headers = ["No", "Device Name", "IP Address", "Status"];
    const rows = devices.map((d, i) => [
        i + 1,
        d.name,
        d.ip_address,
        d.status
    ]);

    const csvContent = ["sep=,", [headers, ...rows]
        .map(row => row.map(val => `"${val}"`).join(","))
        .join("\n")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `netvision_devices_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

function openAddModal(){
    document.getElementById("modalTitle").innerText = "Add device";
    document.getElementById("deviceId").value = "";
    document.getElementById("deviceName").value = "";
    document.getElementById("deviceIp").value = "";
    document.getElementById("deviceStatus").value = "Online";
    document.getElementById("deviceModal").classList.add("show");
}

function openEditModal(device){
    document.getElementById("modalTitle").innerText = "Edit device";
    document.getElementById("deviceId").value = device.id;
    document.getElementById("deviceName").value = device.name;
    document.getElementById("deviceIp").value = device.ip_address;
    document.getElementById("deviceStatus").value = device.status;
    document.getElementById("deviceModal").classList.add("show");
}

function closeModal(){
    document.getElementById("deviceModal").classList.remove("show");
}

async function saveDevice(){
    const id = document.getElementById("deviceId").value;
    const name = document.getElementById("deviceName").value.trim();
    const ip_address = document.getElementById("deviceIp").value.trim();
    const status = document.getElementById("deviceStatus").value;

    if(!name || !ip_address){
        alert("Nama dan IP address wajib diisi");
        return;
    }

    try{
        let response;

        if(id){
            response = await fetch(`${API_BASE}/devices/${id}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify({ name, ip_address, status })
            });
        }else{
            response = await fetch(`${API_BASE}/devices`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ name, ip_address, status })
            });
        }

        if(handleAuthError(response)) return;

        const data = await response.json();

        if(!response.ok){
            showNotification(data.message || "Gagal menyimpan device", "error");
            return;
        }

        closeModal();
        const action = id ? "edit" : "add";
        await logActivity(action, name, `IP: ${ip_address}, Status: ${status}`);
        showNotification(id ? "Device berhasil diupdate" : "Device berhasil ditambahkan", "success");
        loadDevices();

    }catch(err){
        console.error(err);
        alert("Tidak bisa terhubung ke server");
    }
}

async function deleteDevice(id, name){
    if(!confirm(`Hapus device "${name}"?`)) return;

    try{
        const response = await fetch(`${API_BASE}/devices/${id}`, {
            method: "DELETE",
            headers: authHeaders()
        });

        if(handleAuthError(response)) return;

        const data = await response.json();

        if(!response.ok){
            showNotification(data.message || "Gagal menghapus device", "error");
            return;
        }

        await logActivity("delete", name, `Device dihapus`);
        showNotification(`Device "${name}" berhasil dihapus`, "success");
        loadDevices();

    }catch(err){
        console.error(err);
        alert("Tidak bisa terhubung ke server");
    }
}

function logout(){
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "index.html";
}

// ===== DONUT CHART =====
let donutChart = null;

function updateDonutChart(online, offline){
    const total = online + offline;
    document.getElementById("donutTotal").innerText = total;
    document.getElementById("donutOnline").innerText = online;
    document.getElementById("donutOffline").innerText = offline;

    const ctx = document.getElementById("donutChart");
    if(!ctx) return;

    if(donutChart){
        donutChart.data.datasets[0].data = [online, offline];
        donutChart.update();
        return;
    }

    donutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Online", "Offline"],
            datasets: [{
                data: [online, offline],
                backgroundColor: ["rgba(34,197,94,0.8)", "rgba(239,68,68,0.8)"],
                borderColor: ["#22c55e", "#ef4444"],
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0f1c30",
                    borderColor: "#1e2d47",
                    borderWidth: 1,
                    titleColor: "#e8edf5",
                    bodyColor: "#7a90b0",
                    callbacks: {
                        label: c => ` ${c.label}: ${c.raw} devices`
                    }
                }
            }
        }
    });
}

// ===== ACTIVITY LOG =====
async function logActivity(action, device_name, detail = ""){
    try{
        await fetch(`${API_BASE}/logs`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action, device_name, detail })
        });
    }catch(e){ console.error("Log failed:", e); }
}

async function loadActivityFeed(){
    const feed = document.getElementById("activityFeed");
    if(!feed) return;

    // Radar selalu jalan
    startRadar();

    try{
        const r = await fetch(`${API_BASE}/logs`, { headers: authHeaders() });
        if(!r.ok) return;
        const logs = await r.json();

        feed.innerHTML = "";

        if(logs.length === 0){
            feed.innerHTML = `<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:8px">No activity yet</div>`;
            return;
        }

        logs.slice(0, 8).forEach(log => {
            const div = document.createElement("div");
            div.style.cssText = "display:flex;align-items:flex-start;gap:10px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border)";

            const iconMap = { add:"ti-plus", edit:"ti-edit", delete:"ti-trash" };
            const colorMap = { add:"var(--green)", edit:"var(--accent)", delete:"var(--red)" };
            const icon = iconMap[log.action] || "ti-activity";
            const color = colorMap[log.action] || "var(--text-muted)";
            const time = new Date(log.created_at).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

            div.innerHTML = `
                <i class="ti ${icon}" style="color:${color};font-size:14px;flex-shrink:0;margin-top:1px"></i>
                <div style="flex:1;min-width:0">
                    <div style="color:var(--text-primary);font-weight:500">${log.device_name}</div>
                    <div style="color:var(--text-muted)">${log.username} · ${time}</div>
                </div>
            `;
            feed.appendChild(div);
        });

    }catch(e){ console.error(e); }
}

const ctx = document.getElementById("trafficChart");

const maxPoints = 20;
const now = new Date();

function generateLabels(){
    const labels = [];
    for(let i = maxPoints - 1; i >= 0; i--){
        const t = new Date(now.getTime() - i * 3000);
        labels.push(t.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    }
    return labels;
}

function generateData(){
    return Array.from({ length: maxPoints }, () => Math.floor(Math.random() * 60 + 20));
}

const trafficChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: generateLabels(),
        datasets: [
            {
                label: "Inbound (Mbps)",
                data: generateData(),
                tension: 0.4,
                fill: true,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59,130,246,0.08)",
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4
            },
            {
                label: "Outbound (Mbps)",
                data: generateData(),
                tension: 0.4,
                fill: true,
                borderColor: "#22c55e",
                backgroundColor: "rgba(34,197,94,0.06)",
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
            legend: {
                labels: {
                    color: "#7a90b0",
                    font: { size: 12 },
                    usePointStyle: true,
                    pointStyleWidth: 8
                }
            },
            tooltip: {
                backgroundColor: "#0f1c30",
                borderColor: "#1e2d47",
                borderWidth: 1,
                titleColor: "#e8edf5",
                bodyColor: "#7a90b0",
                callbacks: {
                    label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mbps`
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: "#4a607a",
                    font: { size: 10 },
                    maxTicksLimit: 6,
                    maxRotation: 0
                },
                grid: { color: "rgba(30,45,71,0.5)" }
            },
            y: {
                min: 0,
                max: 120,
                ticks: {
                    color: "#4a607a",
                    font: { size: 11 },
                    callback: val => val + ' Mbps'
                },
                grid: { color: "rgba(30,45,71,0.5)" }
            }
        }
    }
});

// Real-time update tiap 3 detik
setInterval(() => {
    const now = new Date();
    const label = now.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });

    trafficChart.data.labels.push(label);
    trafficChart.data.datasets[0].data.push(Math.floor(Math.random() * 60 + 20));
    trafficChart.data.datasets[1].data.push(Math.floor(Math.random() * 50 + 15));

    if(trafficChart.data.labels.length > maxPoints){
        trafficChart.data.labels.shift();
        trafficChart.data.datasets[0].data.shift();
        trafficChart.data.datasets[1].data.shift();
    }

    trafficChart.update('none');
}, 3000);

document.getElementById("healthPercent").innerText = health + "%";
document.getElementById("healthFill").style.width = health + "%";

function updateClock() {
    const now = new Date();
    document.getElementById("clock").innerHTML = now.toLocaleTimeString();
}

setInterval(updateClock, 1000);
updateClock();

function animateValue(id, end){
    let start = 0;
    const timer = setInterval(() => {
        start++;
        document.getElementById(id).innerText = start;
        if(start >= end){
            clearInterval(timer);
        }
    }, 40);
}

function startRadar(){
    const canvas = document.getElementById("radarCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = 50, cy = 50, r = 42;
    let angle = 0;

    // Blips — titik random di radar
    const blips = Array.from({length: 5}, () => ({
        a: Math.random() * Math.PI * 2,
        d: Math.random() * 0.7 + 0.2,
        opacity: 0
    }));

    function draw(){
        ctx.clearRect(0, 0, 100, 100);

        // Background circle
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59,130,246,0.05)";
        ctx.fill();

        // Rings
        [0.25, 0.5, 0.75, 1].forEach(scale => {
            ctx.beginPath();
            ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(59,130,246,0.15)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
        });

        // Cross lines
        ctx.strokeStyle = "rgba(59,130,246,0.1)";
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();

        // Sweep gradient
        const sweep = ctx.createConicalGradient
            ? null
            : (() => {
                const g = ctx.createLinearGradient(cx, cy, cx + r, cy);
                g.addColorStop(0, "rgba(59,130,246,0.35)");
                g.addColorStop(1, "rgba(59,130,246,0)");
                return g;
            })();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, -0.4, 0.4);
        ctx.closePath();
        ctx.fillStyle = "rgba(59,130,246,0.18)";
        ctx.fill();

        // Sweep line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(r, 0);
        ctx.strokeStyle = "rgba(99,179,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // Blips
        blips.forEach(b => {
            const diff = ((angle - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            if(diff < 0.15) b.opacity = 1;
            else b.opacity = Math.max(0, b.opacity - 0.012);

            if(b.opacity > 0){
                const bx = cx + Math.cos(b.a) * r * b.d;
                const by = cy + Math.sin(b.a) * r * b.d;
                ctx.beginPath();
                ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34,197,94,${b.opacity})`;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(bx, by, 5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(34,197,94,${b.opacity * 0.2})`;
                ctx.fill();
            }
        });

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,179,255,0.9)";
        ctx.fill();

        angle += 0.03;
        if(angle > Math.PI * 2) angle -= Math.PI * 2;

        requestAnimationFrame(draw);
    }

    draw();
}