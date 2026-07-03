const maxPoints = 30;
let paused = false;
let peak = 0;

const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
        legend: { labels: { color:"#7a90b0", font:{size:12}, usePointStyle:true } },
        tooltip: {
            backgroundColor:"#0f1c30", borderColor:"#1e2d47", borderWidth:1,
            titleColor:"#e8edf5", bodyColor:"#7a90b0",
            callbacks:{ label: c=>` ${c.dataset.label}: ${c.parsed.y} Mbps` }
        }
    },
    scales: {
        x:{ ticks:{color:"#4a607a",font:{size:10},maxTicksLimit:8,maxRotation:0}, grid:{color:"rgba(30,45,71,0.5)"} },
        y:{ min:0, max:120, ticks:{color:"#4a607a",font:{size:11},callback:v=>v+" Mbps"}, grid:{color:"rgba(30,45,71,0.5)"} }
    }
};

function makeLabels(){
    const arr=[];
    const now=new Date();
    for(let i=maxPoints-1;i>=0;i--){
        const t=new Date(now.getTime()-i*2000);
        arr.push(t.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"}));
    }
    return arr;
}
function makeData(min,range){ return Array.from({length:maxPoints},()=>Math.floor(Math.random()*range+min)); }

const lineChart = new Chart(document.getElementById("trafficChart"),{
    type:"line",
    data:{
        labels:makeLabels(),
        datasets:[
            { label:"Inbound (Mbps)", data:makeData(20,60), tension:0.4, fill:true, borderColor:"#3b82f6", backgroundColor:"rgba(59,130,246,0.08)", borderWidth:2, pointRadius:0, pointHoverRadius:4 },
            { label:"Outbound (Mbps)", data:makeData(15,50), tension:0.4, fill:true, borderColor:"#22c55e", backgroundColor:"rgba(34,197,94,0.06)", borderWidth:2, pointRadius:0, pointHoverRadius:4 }
        ]
    },
    options: chartOpts
});

const barChart = new Chart(document.getElementById("barChart"),{
    type:"bar",
    data:{
        labels:["00:00","02:00","04:00","06:00","08:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"],
        datasets:[
            { label:"Inbound", data:[12,8,6,15,45,60,55,70,80,65,50,30], backgroundColor:"rgba(59,130,246,0.5)", borderColor:"#3b82f6", borderWidth:1, borderRadius:4 },
            { label:"Outbound", data:[8,5,4,10,35,45,42,55,60,50,38,22], backgroundColor:"rgba(34,197,94,0.4)", borderColor:"#22c55e", borderWidth:1, borderRadius:4 }
        ]
    },
    options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ labels:{color:"#7a90b0",font:{size:12},usePointStyle:true} } },
        scales:{
            x:{ ticks:{color:"#4a607a"}, grid:{color:"rgba(30,45,71,0.5)"} },
            y:{ ticks:{color:"#4a607a",callback:v=>v+" Mbps"}, grid:{color:"rgba(30,45,71,0.5)"} }
        }
    }
});

setInterval(()=>{
    if(paused)return;
    const now=new Date();
    const label=now.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const inbound=Math.floor(Math.random()*60+20);
    const outbound=Math.floor(Math.random()*50+15);
    if(inbound>peak)peak=inbound;
    lineChart.data.labels.push(label);
    lineChart.data.datasets[0].data.push(inbound);
    lineChart.data.datasets[1].data.push(outbound);
    if(lineChart.data.labels.length>maxPoints){
        lineChart.data.labels.shift();
        lineChart.data.datasets[0].data.shift();
        lineChart.data.datasets[1].data.shift();
    }
    lineChart.update("none");
    document.getElementById("inboundVal").innerText=inbound+" Mbps";
    document.getElementById("outboundVal").innerText=outbound+" Mbps";
    document.getElementById("peakVal").innerText=peak+" Mbps";
},2000);

function togglePause(){
    paused=!paused;
    const btn=document.getElementById("btnPause");
    btn.innerHTML=paused?'<i class="ti ti-player-play"></i> Resume':'<i class="ti ti-player-pause"></i> Pause';
}