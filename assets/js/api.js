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
   *
   * CATATAN: sengaja pakai XMLHttpRequest, BUKAN fetch(). Pada
   * beberapa kondisi jaringan/browser, fetch() gagal (net::ERR_FAILED)
   * saat memanggil Apps Script Web App dari origin web sungguhan
   * (https://...github.io), karena cara fetch() mengikuti redirect
   * internal Apps Script (302 -> googleusercontent.com) tidak selalu
   * cocok dengan setup CORS Apps Script. XMLHttpRequest terbukti lebih
   * konsisten untuk kasus ini.
   *
   * @param {string} action - nama action, contoh: 'login', 'getSoal'
   * @param {Object} data - payload, contoh: { nisn, token }
   */
  post(action, data) {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_BASE_URL, true);

      xhr.onload = function () {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          resolve({ ok: false, error: 'Respons server tidak valid.' });
        }
      };

      xhr.onerror = function () {
        resolve({ ok: false, error: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' });
      };

      xhr.send(JSON.stringify({ action, data }));
    });
  },

  /**
   * Kirim request GET ke backend (dipakai untuk aksi read-only sederhana).
   * @param {string} action
   * @param {Object} params - akan diubah jadi query string
   */
  get(action, params = {}) {
    return new Promise((resolve) => {
      const query = new URLSearchParams({ action, ...params }).toString();
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `${API_BASE_URL}?${query}`, true);

      xhr.onload = function () {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          resolve({ ok: false, error: 'Respons server tidak valid.' });
        }
      };

      xhr.onerror = function () {
        resolve({ ok: false, error: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' });
      };

      xhr.send();
    });
  },
};
