/**
 * ============================================================
 * AUTH.JS — Sistem Login Siswa & Admin
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Menggantikan login sementara/lokal di app.js (Fase 3 langkah 8)
 * dengan login sungguhan yang tervalidasi lewat backend:
 *   - Admin -> action 'loginAdmin' (1 password bersama)
 *   - Siswa -> action 'login' (NISN + Token, lihat Auth.gs)
 *
 * Sesi disimpan di sessionStorage (bukan localStorage) supaya
 * otomatis hilang saat tab/browser ditutup — cocok untuk
 * komputer/lab bersama yang dipakai bergantian oleh siswa.
 * ============================================================
 */

const SESSION_KEY = 'cbt_session';

const Auth = {
  /** Ambil sesi yang tersimpan, atau null kalau belum login. */
  getSession() {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  setSession(session) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },

  clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  },

  /**
   * Login admin dengan password bersama.
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async loginAdmin(password) {
    const hasil = await Api.post('loginAdmin', { password });
    if (hasil.ok) {
      this.setSession({ role: 'admin', session_token: hasil.session_token, masuk_pada: new Date().toISOString() });
    }
    return hasil;
  },

  /** Ambil session_token admin yang tersimpan (dipakai modul lain saat memanggil API). */
  getAdminToken() {
    const session = this.getSession();
    return session && session.role === 'admin' ? session.session_token : null;
  },

  /**
   * Login siswa dengan NISN + Token.
   * @returns {Promise<{ok: boolean, siswa?: object, error?: string}>}
   */
  async loginSiswa(nisn, token) {
    const hasil = await Api.post('login', { nisn, token });
    if (hasil.ok) {
      this.setSession({ role: 'siswa', siswa: hasil.siswa, masuk_pada: new Date().toISOString() });
    }
    return hasil;
  },

  logout() {
    this.clearSession();
  },
};


// ---------- Wiring UI: tab login, form submit, tombol keluar ----------

function initLoginTabs() {
  const tabs = document.querySelectorAll('.login-tab');
  const formAdmin = document.getElementById('form-login-admin');
  const formSiswa = document.getElementById('form-login-siswa');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
      tab.setAttribute('aria-selected', 'true');
      const isAdmin = tab.dataset.loginTab === 'admin';
      formAdmin.classList.toggle('hidden', !isAdmin);
      formSiswa.classList.toggle('hidden', isAdmin);
    });
  });
}

function setButtonLoading(button, loading, teksNormal) {
  button.disabled = loading;
  button.textContent = loading ? 'Memeriksa...' : teksNormal;
}

function initLoginForms() {
  const formAdmin = document.getElementById('form-login-admin');
  const formSiswa = document.getElementById('form-login-siswa');

  formAdmin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');
    const button = formAdmin.querySelector('button[type=submit]');

    errorEl.classList.add('hidden');
    setButtonLoading(button, true, 'Masuk sebagai Admin');

    const hasil = await Auth.loginAdmin(password);

    setButtonLoading(button, false, 'Masuk sebagai Admin');

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal masuk. Coba lagi.';
      errorEl.classList.remove('hidden');
      return;
    }
    showView('view-admin');
    goToRoute('dashboard');
    renderPage('dashboard');
  });

  formSiswa.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nisn = document.getElementById('siswa-nisn').value.trim();
    const token = document.getElementById('siswa-token').value.trim();
    const errorEl = document.getElementById('siswa-login-error');
    const button = formSiswa.querySelector('button[type=submit]');

    errorEl.classList.add('hidden');
    setButtonLoading(button, true, 'Mulai Ujian');

    const hasil = await Auth.loginSiswa(nisn, token);

    setButtonLoading(button, false, 'Mulai Ujian');

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal masuk. Coba lagi.';
      errorEl.classList.remove('hidden');
      return;
    }

    showView('view-siswa');
    UjianModule.init();
  });
}

function initLogout() {
  ['btn-logout-admin', 'btn-logout-admin-mobile', 'btn-logout-siswa'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
      Auth.logout();
      window.location.hash = '';
      showView('view-login');
    });
  });
}

/** Dipanggil saat halaman dimuat — tampilkan view yang sesuai kalau sesi masih ada. */
function restoreSession() {
  const session = Auth.getSession();

  if (!session) {
    showView('view-login');
    return;
  }

  if (session.role === 'admin') {
    showView('view-admin');
    renderPage(getCurrentRoute());
  } else if (session.role === 'siswa') {
    showView('view-siswa');
    UjianModule.init();
  }
}
