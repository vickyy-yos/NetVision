const API_BASE = "http://localhost:3000/api";

function getToken(){ return localStorage.getItem("token"); }
function authHeaders(){ return { "Content-Type":"application/json","Authorization":"Bearer "+getToken() }; }

function logout(){
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("token");
    window.location.href="index.html";
}

const history = [
    { time:"2026-07-01 08:12", device:"AP Lobby", event:"Device went offline", status:"resolved" },
    { time:"2026-07-01 07:45", device:"Meeting Room AP", event:"High packet loss detected", status:"resolved" },
    { time:"2026-06-30 22:31", device:"Router", event:"CPU usage > 90%", status:"resolved" },
    { time:"2026-06-30 18:10", device:"Switch Core", event:"Port flapping detected", status:"resolved" },
    { time:"2026-06-30 14:22", device:"Server", event:"Disk usage > 85%", status:"resolved" },
];

async function refreshAlerts(){
    try{
        const r=await fetch(`${API_BASE}/devices`,{headers:authHeaders()});
        if(r.status===401||r.status===403){
            localStorage.removeItem("loggedIn");
            window.location.href="index.html";
            return;
        }
        const devices=await r.json();
        const offline=devices.filter(d=>d.status==="Offline");

        document.getElementById("activeAlerts").innerText=offline.length;
        document.getElementById("offlineCount").innerText=offline.length;
        document.getElementById("resolvedAlerts").innerText=history.filter(h=>h.status==="resolved").length;
        document.getElementById("lastChecked").innerText=new Date().toLocaleTimeString();

        const list=document.getElementById("alertsList");
        list.innerHTML="";

        if(offline.length===0){
            list.innerHTML=`
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center;color:var(--text-muted)">
                    <i class="ti ti-circle-check" style="font-size:32px;color:var(--green);display:block;margin-bottom:8px"></i>
                    All devices are online — no active alerts
                </div>`;
        } else {
            offline.forEach(d=>{
                const div=document.createElement("div");
                div.style.cssText="background:var(--red-bg);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);padding:16px 20px;display:flex;align-items:center;gap:16px";
                div.innerHTML=`
                    <i class="ti ti-alert-triangle" style="font-size:20px;color:var(--red);flex-shrink:0"></i>
                    <div style="flex:1">
                        <div style="font-weight:600;color:#fca5a5;font-size:14px">${d.name} is offline</div>
                        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">IP: ${d.ip_address} · Detected: ${new Date().toLocaleTimeString()}</div>
                    </div>
                    <span style="font-size:11px;font-weight:700;background:rgba(239,68,68,0.15);color:var(--red);padding:4px 10px;border-radius:99px">ACTIVE</span>
                `;
                list.appendChild(div);
            });
        }

        const tbody=document.getElementById("historyBody");
        tbody.innerHTML="";
        history.forEach(h=>{
            const tr=document.createElement("tr");
            tr.innerHTML=`
                <td style="color:var(--text-muted);font-size:12px">${h.time}</td>
                <td>${h.device}</td>
                <td>${h.event}</td>
                <td><span style="font-size:11px;font-weight:600;background:var(--green-bg);color:var(--green);padding:3px 10px;border-radius:99px">Resolved</span></td>
            `;
            tbody.appendChild(tr);
        });

    }catch(e){
        console.error(e);
    }
}

refreshAlerts();
setInterval(refreshAlerts, 10000);

async function loadActivityLog(){
    try{
        const r = await fetch(`${API_BASE}/logs`, { headers: authHeaders() });
        if(!r.ok) return;
        const logs = await r.json();

        const tbody = document.getElementById("historyBody");
        tbody.innerHTML = "";

        if(logs.length === 0){
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px">No activity logged yet</td></tr>`;
            return;
        }

        const actionLabel = { add:"Device added", edit:"Device edited", delete:"Device deleted" };
        const actionColor = { add:"var(--green)", edit:"var(--accent)", delete:"var(--red)" };

        logs.forEach(log => {
            const tr = document.createElement("tr");
            const time = new Date(log.created_at).toLocaleString("id-ID", {
                day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"
            });
            const label = actionLabel[log.action] || log.action;
            const color = actionColor[log.action] || "var(--text-muted)";
            tr.innerHTML = `
                <td style="color:var(--text-muted);font-size:12px">${time}</td>
                <td>${log.device_name}</td>
                <td style="color:${color}">${label}</td>
                <td><span style="font-size:11px;font-weight:600;background:var(--bg-card);color:var(--text-secondary);padding:3px 10px;border-radius:99px;border:1px solid var(--border)">${log.username}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }catch(e){ console.error(e); }
}

loadActivityLog();