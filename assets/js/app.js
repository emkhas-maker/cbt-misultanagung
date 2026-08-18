/**
 * ============================================================
 * APP.JS — Router & State Management
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * CATATAN TAHAP INI (Fase 3, langkah 8):
 * Login di file ini masih SEMENTARA / LOKAL — hanya untuk
 * memastikan kerangka SPA (routing, sidebar, 6 menu) berfungsi.
 * Belum tersambung ke Auth.gs / Web App backend.
 *
 * Di langkah 9 (auth.js), bagian login ini akan diganti supaya
 * benar-benar memanggil endpoint "login" di Code.gs lewat api.js.
 * ============================================================
 */

// ---------- Definisi menu & routing ----------
const ROUTES = [
  { path: 'dashboard', label: 'Dashboard', subtitle: 'Ringkasan sistem CBT' },
  { path: 'siswa', label: 'Data Siswa', subtitle: 'Kelola data & token peserta ujian' },
  { path: 'materi', label: 'Materi & Kelas', subtitle: 'Kelola kelas, rombel & bahan ajar' },
  { path: 'soal', label: 'Bank Soal', subtitle: 'Kelola soal Pilihan Ganda & Uraian' },
  { path: 'monitoring', label: 'Monitoring Ujian', subtitle: 'Pantau status pengerjaan siswa secara real-time' },
  { path: 'hasil', label: 'Hasil Nilai', subtitle: 'Rekap nilai & koreksi jawaban Uraian' },
];

function getCurrentRoute() {
  const hash = window.location.hash.replace('#/', '');
  const found = ROUTES.find(r => r.path === hash);
  return found ? found.path : 'dashboard';
}

function renderSidebarNav() {
  const nav = document.querySelector('#view-admin nav');
  nav.innerHTML = ROUTES.map(r => `
    <a href="#/${r.path}" data-route="${r.path}" class="nav-item">
      <span class="nav-dot"></span>
      <span>${r.label}</span>
    </a>
  `).join('');
}

function renderPage(path) {
  const route = ROUTES.find(r => r.path === path) || ROUTES[0];

  // Hentikan polling monitoring kalau sedang pindah KELUAR dari halaman itu
  if (typeof MonitoringModule !== 'undefined') MonitoringModule.berhentiPolling();

  document.getElementById('page-title').textContent = route.label;
  document.getElementById('page-subtitle').textContent = route.subtitle;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === path);
  });

  const content = document.getElementById('app-content');

  if (path === 'dashboard') {
    DashboardModule.init();
  } else if (path === 'siswa') {
    SiswaModule.init();
  } else if (path === 'soal') {
    SoalModule.init();
  } else if (path === 'materi') {
    MateriModule.init();
  } else if (path === 'monitoring') {
    MonitoringModule.init();
  } else if (path === 'hasil') {
    HasilNilaiModule.init();
  } else {
    // Menu lain akan dibangun di Fase 4–6. Untuk sekarang, placeholder.
    content.innerHTML = `
      <div class="placeholder-panel">
        <p class="font-display font-bold text-ink mb-1">${route.label} — segera hadir</p>
        <p class="text-sm text-ink/50">Modul ini akan dibangun pada tahap pengembangan berikutnya.</p>
      </div>
    `;
  }
}

const DashboardModule = {
  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderKerangka(true);

    const sessionToken = Auth.getAdminToken();
    const [hasilSiswa, hasilSoal] = await Promise.all([
      Api.post('getSiswaList', { session_token: sessionToken }),
      Api.post('getSoalList', { session_token: sessionToken }),
    ]);

    const totalSiswa = hasilSiswa.ok ? hasilSiswa.siswa.length : null;
    const totalKelas = hasilSiswa.ok ? new Set(hasilSiswa.siswa.map(s => s.Kelas).filter(Boolean)).size : null;
    const totalSoal = hasilSoal.ok ? hasilSoal.soal.length : null;

    const adaError = !hasilSiswa.ok || !hasilSoal.ok;
    content.innerHTML = this.renderKerangka(false, { totalSiswa, totalKelas, totalSoal }, adaError);
  },

  renderKerangka(loading, angka = {}, error = false) {
    const tampil = (v) => (loading ? '…' : v === null ? '-' : v);
    return `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="stat-card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide">Total Siswa</p>
          <p class="font-display font-extrabold text-2xl text-ink mt-1">${tampil(angka.totalSiswa)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide">Total Kelas</p>
          <p class="font-display font-extrabold text-2xl text-ink mt-1">${tampil(angka.totalKelas)}</p>
        </div>
        <div class="stat-card">
          <p class="text-xs font-semibold text-ink/50 uppercase tracking-wide">Total Soal</p>
          <p class="font-display font-extrabold text-2xl text-ink mt-1">${tampil(angka.totalSoal)}</p>
        </div>
      </div>
      ${error ? `
        <div class="placeholder-panel">
          <p class="font-display font-bold text-brick-500 mb-1">Gagal memuat sebagian data</p>
          <p class="text-sm text-ink/50">Coba buka menu Data Siswa / Bank Soal untuk melihat detail errornya, atau refresh halaman ini.</p>
        </div>
      ` : ''}
    `;
  },
};

function goToRoute(path) {
  window.location.hash = '#/' + path;
}

function showView(viewId) {
  // Catatan bug yang sudah diperbaiki: sebelumnya pakai classList.toggle('hidden', ...)
  // yang bentrok dengan kelas "md:flex" pada #view-admin (sama-sama mengatur
  // properti "display", dengan bobot CSS yang sama). Di layar desktop, aturan
  // "md:flex" menang karena posisinya lebih belakang di file CSS -> view-admin
  // TETAP TERLIHAT walau kelas "hidden" sudah ditambahkan. Pakai inline style
  // di bawah ini supaya SELALU menang, apa pun kelas CSS lain yang menempel.
  ['view-login', 'view-admin', 'view-siswa'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('hidden');
    el.style.display = (id === viewId) ? '' : 'none';
  });
}

window.addEventListener('hashchange', () => {
  renderPage(getCurrentRoute());
});


// ---------- Inisialisasi ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tahun-footer').textContent = new Date().getFullYear();
  renderSidebarNav();
  initLoginTabs();   // dari auth.js
  initLoginForms();  // dari auth.js
  initLogout();      // dari auth.js
  restoreSession();  // dari auth.js
});
