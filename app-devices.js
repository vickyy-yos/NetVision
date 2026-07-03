const API_BASE = "http://localhost:3000/api";
let devices = [];
let currentPage = 1;
const itemsPerPage = 10;

function getToken(){ return localStorage.getItem("token"); }
function authHeaders(){
    return { "Content-Type":"application/json", "Authorization":"Bearer "+getToken() };
}
function handleAuthError(r){
    if(r.status===401||r.status===403){
        localStorage.removeItem("loggedIn");
        localStorage.removeItem("token");
        window.location.href="index.html";
        return true;
    }
    return false;
}

function logout(){
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("token");
    window.location.href="index.html";
}

function updateClock(){
    document.getElementById("clock").innerText=new Date().toLocaleTimeString();
}
setInterval(updateClock,1000);
updateClock();

async function loadDevices(){
    try{
        const r=await fetch(`${API_BASE}/devices`,{headers:authHeaders()});
        if(handleAuthError(r))return;
        devices=await r.json();
        renderTable(devices);
        document.getElementById("totalDevice").innerText=devices.length;
        document.getElementById("onlineDevice").innerText=devices.filter(d=>d.status==="Online").length;
        document.getElementById("offlineDevice").innerText=devices.filter(d=>d.status==="Offline").length;
        document.getElementById("avgPing").innerText="12 ms";
    }catch(e){
        console.error(e);
    }
}

loadDevices();

function renderTable(data){
    const tbody=document.querySelector("#deviceTable tbody");
    tbody.innerHTML="";
    const totalPages=Math.ceil(data.length/itemsPerPage);
    if(currentPage>totalPages)currentPage=1;
    const start=(currentPage-1)*itemsPerPage;
    const paginated=data.slice(start,start+itemsPerPage);
    if(paginated.length===0){
        tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--text-muted)">No devices found</td></tr>`;
    } else {
        paginated.forEach(device=>{
            const tr=document.createElement("tr");
            const date=new Date(device.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
            tr.innerHTML=`
                <td>${device.name}</td>
                <td>${device.ip_address}</td>
                <td class="${device.status.toLowerCase()}"><span style="display:flex;align-items:center;gap:6px">
                    <span style="width:7px;height:7px;border-radius:50%;background:${device.status==="Online"?"var(--green)":"var(--red)"}"></span>
                    ${device.status}
                </span></td>
                <td style="color:var(--text-muted)">${date}</td>
                <td style="text-align:center">
                    <button class="btn-icon" onclick="openEditModal(${JSON.stringify(device).replace(/"/g,'&quot;')})"><i class="ti ti-edit"></i></button>
                    <button class="btn-icon danger" onclick="deleteDevice(${device.id},'${device.name}')"><i class="ti ti-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    renderPagination(data.length,totalPages);
}

function renderPagination(total,totalPages){
    let el=document.getElementById("pagination");
    if(!el){
        el=document.createElement("div");
        el.id="pagination";
        document.getElementById("deviceTable").after(el);
    }
    el.innerHTML="";
    if(totalPages<=1){el.style.display="none";return;}
    el.style.display="flex";
    const info=document.createElement("span");
    info.className="pagination-info";
    info.textContent=`Showing ${Math.min((currentPage-1)*itemsPerPage+1,total)}–${Math.min(currentPage*itemsPerPage,total)} of ${total} devices`;
    el.appendChild(info);
    const grp=document.createElement("div");
    grp.className="pagination-btns";
    const prev=document.createElement("button");
    prev.className="btn-page"+(currentPage===1?" disabled":"");
    prev.innerHTML='<i class="ti ti-chevron-left"></i>';
    prev.disabled=currentPage===1;
    prev.onclick=()=>{currentPage--;renderTable(devices);};
    for(let i=1;i<=totalPages;i++){
        const b=document.createElement("button");
        b.className="btn-page"+(i===currentPage?" active":"");
        b.textContent=i;
        b.onclick=()=>{currentPage=i;renderTable(devices);};
        grp.appendChild(b);
    }
    const next=document.createElement("button");
    next.className="btn-page"+(currentPage===totalPages?" disabled":"");
    next.innerHTML='<i class="ti ti-chevron-right"></i>';
    next.disabled=currentPage===totalPages;
    next.onclick=()=>{currentPage++;renderTable(devices);};
    grp.prepend(prev);
    grp.appendChild(next);
    el.appendChild(grp);
}

document.getElementById("searchInput").addEventListener("keyup",function(){
    const kw=this.value.toLowerCase();
    renderTable(devices.filter(d=>d.name.toLowerCase().includes(kw)||d.ip_address.toLowerCase().includes(kw)));
});

function exportCSV(){
    if(!devices.length){alert("No data");return;}
    const rows=[["No","Device Name","IP Address","Status","Added"],...devices.map((d,i)=>[i+1,d.name,d.ip_address,d.status,new Date(d.created_at).toLocaleDateString()])];
    const csv=["sep=,",[...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n")].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download=`netvision_devices_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
}

function openAddModal(){
    document.getElementById("modalTitle").innerText="Add device";
    document.getElementById("deviceId").value="";
    document.getElementById("deviceName").value="";
    document.getElementById("deviceIp").value="";
    document.getElementById("deviceStatus").value="Online";
    document.getElementById("deviceModal").classList.add("show");
}

function openEditModal(device){
    document.getElementById("modalTitle").innerText="Edit device";
    document.getElementById("deviceId").value=device.id;
    document.getElementById("deviceName").value=device.name;
    document.getElementById("deviceIp").value=device.ip_address;
    document.getElementById("deviceStatus").value=device.status;
    document.getElementById("deviceModal").classList.add("show");
}

function closeModal(){
    document.getElementById("deviceModal").classList.remove("show");
}

async function saveDevice(){
    const id=document.getElementById("deviceId").value;
    const name=document.getElementById("deviceName").value.trim();
    const ip_address=document.getElementById("deviceIp").value.trim();
    const status=document.getElementById("deviceStatus").value;
    if(!name||!ip_address){alert("Nama dan IP wajib diisi");return;}
    try{
        const r=await fetch(`${API_BASE}/devices${id?"/"+id:""}`,{
            method:id?"PUT":"POST",
            headers:authHeaders(),
            body:JSON.stringify({name,ip_address,status})
        });
        if(handleAuthError(r))return;
        const data=await r.json();
        if(!r.ok){alert(data.message||"Gagal");return;}
        closeModal();
        loadDevices();
    }catch(e){alert("Tidak bisa terhubung ke server");}
}

async function deleteDevice(id,name){
    if(!confirm(`Hapus device "${name}"?`))return;
    try{
        const r=await fetch(`${API_BASE}/devices/${id}`,{method:"DELETE",headers:authHeaders()});
        if(handleAuthError(r))return;
        loadDevices();
    }catch(e){alert("Tidak bisa terhubung ke server");}
}