/**
 * ============================================================
 * API.JS — Fetch Controller ke Google Apps Script API
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * CATATAN PENTING — KENAPA PAKAI JSONP, BUKAN fetch()/XHR:
 * Google Apps Script Web App (ContentService) tidak punya cara
 * resmi untuk menyertakan header "Access-Control-Allow-Origin"
 * di responnya. Ini menyebabkan browser MEMBLOKIR pembacaan
 * respons lewat fetch()/XMLHttpRequest ketika dipanggil dari
 * domain sungguhan (seperti GitHub Pages) -- biarpun request-nya
 * sendiri terkirim, browser menolak membaca hasilnya (CORS error).
 *
 * JSONP menghindari masalah ini SEPENUHNYA (bukan mengakali),
 * karena memuat data lewat tag <script src="...">, dan tag
 * <script> memang tidak pernah tunduk pada pengecekan CORS --
 * begitulah cara website memuat library dari CDN mana pun sejak
 * dulu. Konsekuensinya: SEMUA request (termasuk yang dulunya
 * POST) sekarang dikirim sebagai GET dengan payload di-encode
 * ke dalam URL.
 *
 * Batasan JSONP yang perlu diketahui:
 * - Payload harus muat dalam panjang URL (aman sampai ~2000
 *   karakter di hampir semua browser). Untuk import Excel dalam
 *   jumlah SANGAT besar (ratusan baris sekaligus), ini bisa jadi
 *   kendala -- tapi untuk pemakaian normal (submit jawaban ujian,
 *   tambah/edit 1 data, dll) ukurannya jauh di bawah itu.
 * ============================================================
 */

const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbwwbQKUxMgwHlT4L6QT0Js5bT5NNVIXY0YkO_Ng3kBfc1JCJlvXRTKbykeC_Sj9q1q3/exec';

let _jsonpCounter = 0;

function _jsonpRequest(action, data) {
  return new Promise((resolve) => {
    _jsonpCounter++;
    const callbackName = 'cbtJsonp_' + Date.now() + '_' + _jsonpCounter;

    const bersihkan = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timeoutId);
    };

    window[callbackName] = (hasil) => {
      bersihkan();
      resolve(hasil);
    };

    const timeoutId = setTimeout(() => {
      bersihkan();
      resolve({ ok: false, error: 'Server tidak merespons (timeout). Periksa koneksi internet lalu coba lagi.' });
    }, 20000);

    const query = new URLSearchParams({
      action,
      data: JSON.stringify(data || {}),
      callback: callbackName,
    }).toString();

    const script = document.createElement('script');
    script.src = `${API_BASE_URL}?${query}`;
    script.onerror = () => {
      bersihkan();
      resolve({ ok: false, error: 'Tidak bisa terhubung ke server. Periksa koneksi internet.' });
    };

    document.body.appendChild(script);
  });
}

const Api = {
  /**
   * Kirim aksi ke backend. Nama "post" dipertahankan supaya kode
   * modul lain (siswa.js, soal.js, dst) tidak perlu diubah semua --
   * di balik layar sekarang jalan lewat JSONP, bukan POST sungguhan.
   */
  post(action, data) {
    return _jsonpRequest(action, data);
  },

  get(action, params) {
    return _jsonpRequest(action, params);
  },
};
