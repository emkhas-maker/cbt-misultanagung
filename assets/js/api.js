/**
 * ============================================================
 * API.JS — Fetch Controller ke Google Apps Script API
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Satu-satunya tempat di frontend yang tahu URL Web App backend.
 * Semua modul lain (auth.js, dan modul-modul berikutnya) memanggil
 * lewat Api.post() / Api.get(), tidak langsung fetch() sendiri-sendiri.
 *
 * CATATAN PENTING soal CORS:
 * Sengaja TIDAK mengatur header "Content-Type: application/json"
 * secara eksplisit. Kalau diatur, browser akan mengirim preflight
 * request (OPTIONS) dulu, dan Apps Script Web App tidak menangani
 * OPTIONS dengan baik secara default -> request akan gagal.
 * Dengan membiarkan fetch() memakai Content-Type bawaan
 * ("text/plain") saat body berupa string, request dianggap
 * "simple request" oleh browser dan tidak butuh preflight.
 * Ini sudah terbukti bekerja saat pengujian manual di Fase 2.
 * ============================================================
 */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyy5dZDJ3yTdTicKjzY2bLjwLkeM5XAxAIusdlM4xZj8hcoy95TdFXCWRFEvfKEk4_u/exec';

const Api = {
  /**
   * Kirim request POST ke backend.
   * @param {string} action - nama action, contoh: 'login', 'getSoal'
   * @param {Object} data - payload, contoh: { nisn, token }
   */
  async post(action, data) {
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ action, data }),
      });
      return await res.json();
    } catch (err) {
      return { ok: false, error: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' };
    }
  },

  /**
   * Kirim request GET ke backend (dipakai untuk aksi read-only sederhana).
   * @param {string} action
   * @param {Object} params - akan diubah jadi query string
   */
  async get(action, params = {}) {
    try {
      const query = new URLSearchParams({ action, ...params }).toString();
      const res = await fetch(`${API_BASE_URL}?${query}`);
      return await res.json();
    } catch (err) {
      return { ok: false, error: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' };
    }
  },
};
