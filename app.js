import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  query,
  limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// =====================================================
// 1. KONFIGURASI FIREBASE
// =====================================================
// Ganti isi konfigurasi ini dengan Firebase Web Config milik Anda.
const firebaseConfig = {
  apiKey: "AIzaSyDykiYMaqPvJDaDCqwjXSFLk1KQd7eaNts",
  authDomain: "i-takak-monitoring.firebaseapp.com",
  databaseURL: "https://i-takak-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "i-takak-monitoring",
  storageBucket: "i-takak-monitoring.firebasestorage.app",
  messagingSenderId: "174807507148",
  appId: "1:174807507148:web:aeced2ec88513528c22269"
};

// =====================================================
// 2. URL GOOGLE APPS SCRIPT
// =====================================================
// Ganti dengan URL Web App dari Apps Script Anda.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyl0XthKE-UdQqukGwVatgnlT2ydY1UJWbBdUh9uxwjquGjhC9FXM_xMOkWRGYZ6R00/exec";

// =====================================================
// 3. INISIALISASI FIREBASE
// =====================================================
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// =====================================================
// 4. ELEMEN HTML
// =====================================================
const sensor1Value = document.getElementById("sensor1Value");
const sensor2Value = document.getElementById("sensor2Value");
const averageValue = document.getElementById("averageValue");
const relayValue = document.getElementById("relayValue");
const timestampValue = document.getElementById("timestampValue");
const sensor1Status = document.getElementById("sensor1Status");
const sensor2Status = document.getElementById("sensor2Status");

const dateInput = document.getElementById("dateInput");
const loadDateButton = document.getElementById("loadDateButton");
const sheetStatus = document.getElementById("sheetStatus");
const sheetTableBody = document.getElementById("sheetTableBody");

// =====================================================
// 5. CHART FIREBASE HISTORY
// =====================================================
const firebaseHistoryChart = new Chart(
  document.getElementById("firebaseHistoryChart"),
  {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Sensor 1 (cm)",
          data: []
        },
        {
          label: "Sensor 2 (cm)",
          data: []
        },
        {
          label: "Rata-rata (cm)",
          data: []
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }
);

// =====================================================
// 6. CHART GOOGLE SHEET HISTORY
// =====================================================
const sheetHistoryChart = new Chart(
  document.getElementById("sheetHistoryChart"),
  {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Sensor 1 (cm)",
          data: []
        },
        {
          label: "Sensor 2 (cm)",
          data: []
        },
        {
          label: "Rata-rata (cm)",
          data: []
        }
      ]
    },
    options: {
      responsive: true,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  }
);

// =====================================================
// 7. FORMAT ANGKA
// =====================================================
function formatCm(value) {
  if (value === null || value === undefined || value === "") {
    return "ERROR";
  }

  const number = Number(value);

  if (Number.isNaN(number)) {
    return "ERROR";
  }

  return number.toFixed(2) + " cm";
}

// =====================================================
// 8. TAMPILKAN FIREBASE LATEST SECARA REALTIME
// =====================================================
const latestRef = ref(database, "esp32_ultrasonic/latest");

onValue(latestRef, (snapshot) => {
  const data = snapshot.val();

  if (!data) {
    return;
  }

  sensor1Value.textContent = formatCm(data.sensor1_cm);
  sensor2Value.textContent = formatCm(data.sensor2_cm);
  averageValue.textContent = formatCm(data.rata_rata_cm);

  relayValue.textContent = data.relay || "--";
  relayValue.className = data.relay_status ? "relay-on" : "relay-off";

  timestampValue.textContent = data.timestamp || "--";

  sensor1Status.textContent = data.sensor1_valid ? "Valid" : "Tidak valid";
  sensor2Status.textContent = data.sensor2_valid ? "Valid" : "Tidak valid";
});

// =====================================================
// 9. AMBIL 100 DATA TERAKHIR DARI FIREBASE HISTORY
// =====================================================
function getTodayDateString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function listenFirebaseLast100() {
  const today = getTodayDateString();

  const historyRef = ref(database, "esp32_ultrasonic/history/" + today);
  const last100Query = query(historyRef, limitToLast(100));

  onValue(last100Query, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      firebaseHistoryChart.data.labels = [];
      firebaseHistoryChart.data.datasets[0].data = [];
      firebaseHistoryChart.data.datasets[1].data = [];
      firebaseHistoryChart.data.datasets[2].data = [];
      firebaseHistoryChart.update();
      return;
    }

    const rows = Object.values(data);

    rows.sort((a, b) => {
      return String(a.timestamp).localeCompare(String(b.timestamp));
    });

    const labels = rows.map(row => row.time || row.timestamp || "");
    const sensor1Data = rows.map(row => Number(row.sensor1_cm));
    const sensor2Data = rows.map(row => Number(row.sensor2_cm));
    const averageData = rows.map(row => Number(row.rata_rata_cm));

    firebaseHistoryChart.data.labels = labels;
    firebaseHistoryChart.data.datasets[0].data = sensor1Data;
    firebaseHistoryChart.data.datasets[1].data = sensor2Data;
    firebaseHistoryChart.data.datasets[2].data = averageData;
    firebaseHistoryChart.update();
  });
}

listenFirebaseLast100();

// =====================================================
// 10. JSONP HELPER UNTUK GOOGLE APPS SCRIPT
// =====================================================
function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "jsonpCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);

    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");

    script.src = url + separator + "callback=" + callbackName;

    script.onerror = function() {
      reject(new Error("Gagal memuat data dari Google Apps Script."));
      delete window[callbackName];
      script.remove();
    };

    document.body.appendChild(script);
  });
}

// =====================================================
// 11. AMBIL DATA GOOGLE SHEET BERDASARKAN TANGGAL
// =====================================================
loadDateButton.addEventListener("click", () => {
  const selectedDate = dateInput.value;

  if (!selectedDate) {
    sheetStatus.textContent = "Silakan pilih tanggal terlebih dahulu.";
    return;
  }

  loadSheetDataByDate(selectedDate);
});

async function loadSheetDataByDate(dateString) {
  sheetStatus.textContent = "Mengambil data Google Sheet tanggal " + dateString + "...";

  const endpoint = GOOGLE_SCRIPT_URL + "?mode=date&date=" + encodeURIComponent(dateString);

  try {
    const result = await loadJsonp(endpoint);

    if (result.status !== "success") {
      throw new Error(result.message || "Gagal mengambil data.");
    }

    showSheetData(result.data || []);

    sheetStatus.textContent = "Data berhasil dimuat. Jumlah data: " + result.count;

  } catch (error) {
    sheetStatus.textContent = "Gagal mengambil data: " + error.message;
    clearSheetData();
  }
}

// =====================================================
// 12. TAMPILKAN DATA GOOGLE SHEET KE GRAFIK DAN TABEL
// =====================================================
function showSheetData(rows) {
  sheetTableBody.innerHTML = "";

  if (!rows || rows.length === 0) {
    sheetTableBody.innerHTML = `
      <tr>
        <td colspan="6">Tidak ada data pada tanggal tersebut.</td>
      </tr>
    `;

    clearSheetChart();
    return;
  }

  rows.sort((a, b) => {
    return String(a.timestamp).localeCompare(String(b.timestamp));
  });

  const labels = [];
  const sensor1Data = [];
  const sensor2Data = [];
  const averageData = [];

  rows.forEach((row, index) => {
    labels.push(row.time || row.timestamp || "");
    sensor1Data.push(Number(row.sensor1_cm));
    sensor2Data.push(Number(row.sensor2_cm));
    averageData.push(Number(row.rata_rata_cm));

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${row.timestamp || ""}</td>
      <td>${row.sensor1_cm ?? ""}</td>
      <td>${row.sensor2_cm ?? ""}</td>
      <td>${row.rata_rata_cm ?? ""}</td>
      <td>${row.relay || ""}</td>
    `;

    sheetTableBody.appendChild(tr);
  });

  sheetHistoryChart.data.labels = labels;
  sheetHistoryChart.data.datasets[0].data = sensor1Data;
  sheetHistoryChart.data.datasets[1].data = sensor2Data;
  sheetHistoryChart.data.datasets[2].data = averageData;
  sheetHistoryChart.update();
}

function clearSheetChart() {
  sheetHistoryChart.data.labels = [];
  sheetHistoryChart.data.datasets[0].data = [];
  sheetHistoryChart.data.datasets[1].data = [];
  sheetHistoryChart.data.datasets[2].data = [];
  sheetHistoryChart.update();
}

function clearSheetData() {
  sheetTableBody.innerHTML = `
    <tr>
      <td colspan="6">Data tidak tersedia.</td>
    </tr>
  `;

  clearSheetChart();
}
