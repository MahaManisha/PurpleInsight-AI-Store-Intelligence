// PurpleInsight — UI Application Scripts

// Active configuration
const CONFIG = {
  API_BASE_URL: "http://localhost:8000/api/v1",
  POLL_INTERVAL_MS: 3000,
  DEFAULT_STORE_ID: "store-7ef38ab2-1456-42d4-a0fb-365922e3914a"
};

let activeStoreId = CONFIG.DEFAULT_STORE_ID;
let systemConnected = false;
let fallbackMode = false;
let knownEventIds = new Set();

// Zone description mapping for localized clicks
const ZONE_METADATA = {
  main_entrance_exit: {
    name: "Entrance & Exit Lobby",
    desc: "Main ingress/egress foyer. Tracks customer capture rate, initial path direction, and re-entry counts.",
    holdPower: "15%",
    stops: 142
  },
  mid_left_fragrance: {
    name: "Fragrance Display",
    desc: "Premium selection of designer fragrances. Shelf engagement sensors record attractive stops and deep brand evaluation.",
    holdPower: "48%",
    stops: 298
  },
  mid_left_nail_unit: {
    name: "Nail Cosmetics Unit",
    desc: "Self-service nail lacquers and treatments. Monitored for attractive stops and cross-category engagement.",
    holdPower: "35%",
    stops: 184
  },
  top_shelf_eb_korean: {
    name: "EB Korean Brand Shelf",
    desc: "Exclusive Korean beauty row. Highly attractive promotional spot with peak dwell times and attractive stopping power.",
    holdPower: "78%",
    stops: 642
  },
  top_shelf_the_face_shop: {
    name: "The Face Shop Shelf",
    desc: "Natural skincare products shelf. Highly correlated with clean-beauty shopping funnels.",
    holdPower: "65%",
    stops: 490
  },
  top_shelf_minimalist: {
    name: "Minimalist Brand Shelf",
    desc: "Active skincare brand section. Features high conversion conversion scores from spatial correlation.",
    holdPower: "72%",
    stops: 512
  },
  top_shelf_aqualogica: {
    name: "Aqualogica Shelf",
    desc: "Gel sunscreens and moisturizers unit. Attracts high summer-season footfall and dwell logs.",
    holdPower: "55%",
    stops: 320
  },
  makeup_unit: {
    name: "Promotional Makeup Unit",
    desc: "Circular center-floor promotional unit. A prime circulation anchor that drives secondary brand browsing journeys.",
    holdPower: "85%",
    stops: 894
  },
  foh_open_floor: {
    name: "Front of House Walkway",
    desc: "Primary customer circulation corridor. Measures flow density, speed, and path splits across product rows.",
    holdPower: "8%",
    stops: 42
  },
  checkout_queue: {
    name: "Checkout Waiting Queue",
    desc: "Shoppers waiting in POS line. Real-time length triggers crowding alerts when wait exceeds 120 seconds.",
    holdPower: "92%",
    stops: 1102
  },
  checkout_counter: {
    name: "Checkout POS Counter",
    desc: "Point of Sale terminal. Transactions are temporally joined to shopper exits for conversion metric.",
    holdPower: "98%",
    stops: 1205
  }
};

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  startMonitoring();
});

// Event Listeners Setup
function setupEventListeners() {
  const storeSelect = document.getElementById("storeSelect");
  storeSelect.addEventListener("change", (e) => {
    activeStoreId = e.target.value;
    logTerminal(`[SYSTEM] Switched active monitoring context to store context: ${activeStoreId}`);
    fetchData();
  });
}

// Main Polling Loop
function startMonitoring() {
  fetchData();
  setInterval(fetchData, CONFIG.POLL_INTERVAL_MS);
}

// Fetch metrics, alerts, and events
async function fetchData() {
  try {
    // 1. Fetch Metrics
    const metricsResponse = await fetch(`${CONFIG.API_BASE_URL}/metrics?store_id=${activeStoreId}`);
    if (!metricsResponse.ok) throw new Error("Backend degraded");
    const metrics = await metricsResponse.json();
    updateMetrics(metrics);
    
    // 2. Fetch Alerts
    const alertsResponse = await fetch(`${CONFIG.API_BASE_URL}/alerts?store_id=${activeStoreId}&limit=10`);
    if (alertsResponse.ok) {
      const alertsData = await alertsResponse.json();
      updateAlerts(alertsData.data || []);
    }

    // 3. Fetch Event Logs
    const eventsResponse = await fetch(`${CONFIG.API_BASE_URL}/telemetry/events?limit=20`);
    if (eventsResponse.ok) {
      const events = await eventsResponse.json();
      updateEventStream(events);
    }

    setConnectionStatus(true);
    fallbackMode = false;
  } catch (error) {
    if (!fallbackMode) {
      console.warn("FastAPI backend unreachable, launching visual simulation fallback...");
      logTerminal(`[WARNING] FastAPI backend at ${CONFIG.API_BASE_URL} unreachable. Switched to high-fidelity dashboard simulation.`);
      fallbackMode = true;
    }
    setConnectionStatus(false);
    runSimulation();
  }
}

// Set Connection status LED
function setConnectionStatus(connected) {
  const statusIndicator = document.getElementById("systemStatus");
  if (connected) {
    statusIndicator.className = "system-status";
    statusIndicator.innerHTML = `
      <span class="status-dot green pulse"></span>
      <span class="status-label">FastAPI Backend Connected</span>
    `;
  } else {
    statusIndicator.className = "system-status degraded";
    statusIndicator.innerHTML = `
      <span class="status-dot red pulse"></span>
      <span class="status-label">Offline Simulation Mode</span>
    `;
    statusIndicator.style.background = "rgba(239, 68, 68, 0.08)";
    statusIndicator.style.borderColor = "rgba(239, 68, 68, 0.2)";
    statusIndicator.style.color = "#ef4444";
  }
}

// Update primary aggregate metrics
function updateMetrics(data) {
  document.getElementById("currentOccupancy").innerText = data.current_occupancy;
  document.getElementById("totalVisitors").innerText = data.total_visitors;
  document.getElementById("avgDwellTime").innerText = data.avg_dwell_time.toFixed(1);
  document.getElementById("conversionRate").innerText = data.conversion_rate.toFixed(1);
  document.getElementById("peakHour").innerText = data.peak_hour || "17:00-18:00";

  // Dynamic Occupancy Badge
  const badge = document.getElementById("occupancyTrend");
  if (data.current_occupancy > 12) {
    badge.className = "metric-badge red";
    badge.innerText = "CROWDED";
  } else if (data.current_occupancy > 5) {
    badge.className = "metric-badge green";
    badge.innerText = "OPTIMAL";
  } else {
    badge.className = "metric-badge green";
    badge.innerText = "LIGHT";
  }
}

// Update Active Alerts Panel
function updateAlerts(alerts) {
  const alertsList = document.getElementById("alertsList");
  const alertCountBadge = document.getElementById("activeAlertCount");
  
  alertCountBadge.innerText = `${alerts.length} ACTIVE`;
  if (alerts.length > 0) {
    alertCountBadge.className = "active-alerts-badge alert";
    alertsList.innerHTML = "";
    alerts.forEach(alert => {
      const alertItem = document.createElement("div");
      alertItem.className = `alert-item ${alert.severity}`;
      alertItem.innerHTML = `
        <span class="alert-badge ${alert.severity}">${alert.severity}</span>
        <div class="alert-content">
          <span class="alert-msg">${alert.message}</span>
          <span class="alert-meta">${new Date(alert.timestamp).toLocaleTimeString()} | ID: ${alert.alert_type}</span>
        </div>
      `;
      alertsList.appendChild(alertItem);
    });
  } else {
    alertCountBadge.className = "active-alerts-badge";
    alertsList.innerHTML = `
      <div class="empty-alerts">
        <span class="empty-icon">🔔</span>
        <p>No operational thresholds breached inside floor regions. Store is performing optimal.</p>
      </div>
    `;
  }
}

// Update Live CCTV Event Stream Terminal
function updateEventStream(events) {
  events.forEach(event => {
    if (!knownEventIds.has(event.event_id || event.id)) {
      knownEventIds.add(event.event_id || event.id);
      
      let message = "";
      let cssClass = "system-line";
      const timestamp = new Date(event.timestamp).toLocaleTimeString();

      switch (event.event_type) {
        case "ENTRY":
        case "PersonEntryEvent":
          message = `[${timestamp}] [ENTRY] Shopper #${event.track_id} entered lobby region. (conf=${(event.confidence || 0.95).toFixed(2)})`;
          cssClass = "entry-line";
          incrementZoneCount("main_entrance_exit");
          break;
        case "EXIT":
        case "PersonExitEvent":
          message = `[${timestamp}] [EXIT] Shopper #${event.track_id} exited gate threshold.`;
          cssClass = "exit-line";
          decrementZoneCount("main_entrance_exit");
          break;
        case "ZONE_DWELL":
        case "ZoneDwellEvent":
          message = `[${timestamp}] [DWELL] Shopper #${event.track_id} left '${event.zone_id}' after ${event.dwell_time_seconds.toFixed(1)}s.`;
          cssClass = "dwell-line";
          decrementZoneCount(event.zone_id);
          break;
        case "QUEUE_UPDATE":
        case "QueueUpdateEvent":
          message = `[${timestamp}] [QUEUE] Checkout queue is currently ${event.current_length} shoppers (max wait: ${event.max_wait_seconds.toFixed(0)}s).`;
          cssClass = "queue-line";
          document.getElementById("count_checkout_queue").innerText = event.current_length;
          updateQueueIntelligence(event);
          break;
        case "OCCUPANCY_UPDATE":
        case "OccupancyUpdateEvent":
          updateZoneMapOccupants(event.zone_occupancies);
          break;
        case "ALERT":
        case "QueueAlertEvent":
          message = `[${timestamp}] [ALERT] Operational breach: ${event.message}`;
          cssClass = "alert-line";
          break;
      }

      if (message) {
        logTerminal(message, cssClass);
      }
    }
  });
}

// Add a log to the terminal panel
function logTerminal(message, cssClass = "system-line") {
  const terminal = document.getElementById("eventStreamLog");
  const logLine = document.createElement("div");
  logLine.className = `log-line ${cssClass}`;
  logLine.innerText = message;
  terminal.appendChild(logLine);
  
  // Scroll to bottom
  terminal.scrollTop = terminal.scrollHeight;
  
  // Keep terminal short
  while (terminal.childElementCount > 60) {
    terminal.removeChild(terminal.firstChild);
  }
}

// Update individual zone counters in the SVG layout
function updateZoneMapOccupants(zoneOccupancies) {
  if (!zoneOccupancies) return;
  for (const [zoneId, occupantCount] of Object.entries(zoneOccupancies)) {
    const counterElement = document.getElementById(`count_${zoneId}`);
    if (counterElement) {
      counterElement.innerText = occupantCount;
      const zoneNode = counterElement.parentElement;
      if (zoneNode && occupantCount > 0) {
        zoneNode.classList.add("active");
      } else if (zoneNode) {
        zoneNode.classList.remove("active");
      }
    }
  }
}

function incrementZoneCount(zoneId) {
  const el = document.getElementById(`count_${zoneId}`);
  if (el) el.innerText = parseInt(el.innerText) + 1;
}

function decrementZoneCount(zoneId) {
  const el = document.getElementById(`count_${zoneId}`);
  if (el) el.innerText = Math.max(0, parseInt(el.innerText) - 1);
}

// Update the checkout metrics cards
function updateQueueIntelligence(event) {
  document.getElementById("queueLengthVal").innerText = event.current_length;
  document.getElementById("queueAvgWaitVal").innerText = `${event.avg_wait_seconds.toFixed(0)}s`;
  document.getElementById("queueMaxWaitVal").innerText = `${event.max_wait_seconds.toFixed(0)}s`;

  const badge = document.getElementById("queueStatusBadge");
  if (event.current_length >= 4 || event.max_wait_seconds >= 120) {
    badge.innerText = "CONGESTED";
    badge.className = "panel-badge alert danger";
  } else if (event.current_length >= 2) {
    badge.innerText = "WARNING";
    badge.className = "panel-badge alert warning";
  } else {
    badge.innerText = "OPTIMAL";
    badge.className = "panel-badge alert";
  }
}

// Localized Zone Modal Dialog Actions
function showZoneDetails(zoneId) {
  const modal = document.getElementById("zoneModal");
  const meta = ZONE_METADATA[zoneId] || {
    name: zoneId.replace(/_/g, " ").toUpperCase(),
    desc: "Active floor location monitored by YOLOv8 model layers.",
    holdPower: "40%",
    stops: 15
  };

  const count = document.getElementById(`count_${zoneId}`)?.innerText || "0";

  document.getElementById("modalZoneTitle").innerText = meta.name;
  document.getElementById("modalZoneOccupancy").innerText = count;
  document.getElementById("modalZoneHoldPower").innerText = meta.holdPower;
  document.getElementById("modalZoneStops").innerText = meta.stops;
  document.getElementById("modalZoneDesc").innerText = meta.desc;

  modal.classList.add("active");
}

function closeModal() {
  document.getElementById("zoneModal").classList.remove("active");
}


// ─── Visual Simulation Fallback ──────────────────────────────────────────────
// Generates premium synthetic events when the backend API is starting up or offline
let simOccupants = {
  main_entrance_exit: 2,
  mid_left_fragrance: 1,
  mid_left_nail_unit: 0,
  top_shelf_eb_korean: 2,
  top_shelf_the_face_shop: 1,
  top_shelf_minimalist: 1,
  top_shelf_aqualogica: 0,
  makeup_unit: 3,
  foh_open_floor: 2,
  checkout_queue: 1,
  checkout_counter: 1
};

let simTotalVisitors = 142;
let simAvgDwell = 7.4;
let simConversion = 38.6;
let shopperCounter = 152;

function runSimulation() {
  // Update aggregate metric UI
  simAvgDwell += (Math.random() - 0.5) * 0.05;
  simConversion += (Math.random() - 0.5) * 0.1;
  const currentTotalOccupancy = Object.values(simOccupants).reduce((a, b) => a + b, 0);

  updateMetrics({
    current_occupancy: currentTotalOccupancy,
    total_visitors: simTotalVisitors,
    avg_dwell_time: simAvgDwell,
    conversion_rate: simConversion,
    peak_hour: "16:00-17:00"
  });

  // Update Zone SVG occupant numbers
  updateZoneMapOccupants(simOccupants);

  // Randomly generate simulation events
  const rand = Math.random();
  const timestamp = new Date().toLocaleTimeString();
  
  if (rand < 0.15) {
    // 1. Simulate entry
    shopperCounter++;
    simTotalVisitors++;
    simOccupants.main_entrance_exit++;
    logTerminal(`[${timestamp}] [ENTRY] Shopper #${shopperCounter} entered lobby region. (conf=${(0.85 + Math.random()*0.14).toFixed(2)})`, "entry-line");
  } else if (rand < 0.25) {
    // 2. Simulate shopper move zone (Dwell)
    const zones = Object.keys(simOccupants);
    const fromZone = zones[Math.floor(Math.random() * zones.length)];
    const toZone = zones[Math.floor(Math.random() * zones.length)];
    
    if (simOccupants[fromZone] > 0 && fromZone !== toZone) {
      simOccupants[fromZone]--;
      simOccupants[toZone]++;
      const dwellSeconds = Math.floor(5 + Math.random() * 80);
      logTerminal(`[${timestamp}] [DWELL] Shopper #${Math.floor(80 + Math.random()*70)} left '${fromZone}' after ${dwellSeconds}s.`, "dwell-line");
    }
  } else if (rand < 0.32) {
    // 3. Simulate shopper exit
    if (simOccupants.main_entrance_exit > 0) {
      simOccupants.main_entrance_exit--;
      logTerminal(`[${timestamp}] [EXIT] Shopper #${Math.floor(80 + Math.random()*70)} crossed exit gate segment.`, "exit-line");
    }
  } else if (rand < 0.45) {
    // 4. Queue update simulation
    simOccupants.checkout_queue = Math.floor(Math.random() * 5);
    const len = simOccupants.checkout_queue;
    const avgWait = len * 35.5 + (Math.random()*15);
    const maxWait = len * 48.0 + (Math.random()*25);

    updateQueueIntelligence({
      current_length: len,
      avg_wait_seconds: avgWait,
      max_wait_seconds: maxWait
    });

    logTerminal(`[${timestamp}] [QUEUE] Checkout queue updated: length=${len} shoppers, max_wait=${maxWait.toFixed(0)}s`, "queue-line");

    // Queue alert check
    if (len >= 4) {
      logTerminal(`[${timestamp}] [ALERT] Operational breach: Congestion alert inside checkout queue: Active Length=${len} (Limit=4); Max Wait=${maxWait.toFixed(0)}s.`, "alert-line");
      updateAlerts([{
        severity: "HIGH",
        message: `Checkout queue congestion: ${len} shoppers, max wait ${maxWait.toFixed(0)}s.`,
        alert_type: "crowding",
        timestamp: new Date().toISOString()
      }]);
    } else {
      updateAlerts([]);
    }
  }
}
