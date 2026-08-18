/**
 * ============================================================
 * CODE.GS — Entry Point Backend Aplikasi CBT
 * MI Sultan Agung
 * ============================================================
 *
 * File ini adalah pintu masuk semua request dari frontend
 * (GitHub Pages) ke backend Google Apps Script.
 *
 * Cara pakai:
 * 1. Buka Google Sheet "DB_CBT_MISultanAgung" yang sudah dibuat.
 * 2. Menu Extensions > Apps Script.
 * 3. Ganti isi Code.gs (default) dengan isi file ini.
 * 4. Isi SPREADSHEET_ID di bawah dengan ID spreadsheet Bapak.
 * 5. Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy URL Web App yang muncul — ini nanti dipakai di api.js (frontend).
 *
 * CATATAN PENTING:
 * Karena script ini dibuka lewat menu Extensions dari dalam
 * spreadsheet itu sendiri (bound script), sebenarnya tidak wajib
 * mengisi SPREADSHEET_ID — bisa pakai SpreadsheetApp.getActiveSpreadsheet().
 * Tapi kita tetap eksplisit isi ID di bawah, supaya script ini
 * tetap benar walau nanti dipindah jadi standalone script.
 * ============================================================
 */

const SPREADSHEET_ID = '1R2TAYmBfLVo9UVezfWMRqiFieHOm5FCbVhCdakyCWP8';

// Nama-nama sheet — HARUS PERSIS sama dengan nama sheet di spreadsheet
const SHEET_SISWA = 'DB_Siswa';
const SHEET_SOAL = 'DB_Soal';
const SHEET_UJIAN = 'DB_Ujian';
const SHEET_HASIL = 'DB_Hasil';
const SHEET_MATERI = 'DB_Materi';


/**
 * ------------------------------------------------------------
 * ENTRY POINT: doGet
 * Menangani DUA jenis pemanggilan:
 *  1. Biasa (tanpa parameter "callback") -> balas JSON polos.
 *     Dipakai untuk tes manual lewat browser (?action=ping).
 *  2. JSONP (ada parameter "callback") -> balas JavaScript yang
 *     memanggil fungsi callback tsb dengan data sebagai argumen.
 *     INI YANG DIPAKAI FRONTEND (lewat api.js) untuk SEMUA request,
 *     termasuk yang dulunya lewat POST -- supaya sepenuhnya
 *     menghindari masalah CORS Apps Script (bukan mengatasi,
 *     tapi memang tidak pernah memicu pengecekan CORS sama sekali,
 *     karena dimuat lewat tag <script>, bukan fetch/XHR).
 *
 * Payload data (yang dulu dikirim lewat body POST) sekarang
 * dikirim lewat parameter "data" berisi JSON yang di-encode ke
 * URL, contoh:
 *   ?action=login&data=%7B%22nisn%22%3A...%7D&callback=xyz
 * ------------------------------------------------------------
 */
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  let data = {};
  if (e.parameter.data) {
    try { data = JSON.parse(e.parameter.data); } catch (err) { data = {}; }
  }

  let hasil;
  try {
    hasil = routeAction(action, data);
  } catch (err) {
    hasil = { ok: false, error: err.message };
  }

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(hasil) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(hasil, hasil.ok === false ? 400 : 200);
}


/**
 * ------------------------------------------------------------
 * ENTRY POINT: doPost
 * Dipertahankan untuk kompatibilitas & testing manual (curl/Postman),
 * meski frontend sekarang tidak memakainya lagi (sudah pindah ke
 * doGet dengan pola JSONP di atas, untuk menghindari CORS).
 * ------------------------------------------------------------
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const hasil = routeAction(body.action, body.data || {});
    return jsonResponse(hasil, hasil.ok === false ? 400 : 200);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}


/**
 * ------------------------------------------------------------
 * ROUTER BERSAMA — dipakai doGet (JSONP) & doPost (legacy/testing)
 * supaya logic-nya tidak dobel ditulis dua kali.
 * ------------------------------------------------------------
 */
function routeAction(action, data) {
  data = data || {};

  switch (action) {
    case 'ping':
      return { ok: true, message: 'Server CBT aktif', waktu_server: new Date().toISOString() };

    case 'login': {
      const hasil = validateToken(data.nisn, data.token);
      if (!hasil.valid) return { ok: false, error: hasil.error };
      return { ok: true, siswa: hasil.siswa };
    }

    case 'loginAdmin': {
      const hasil = validateAdminPassword(data.password);
      if (!hasil.valid) return { ok: false, error: hasil.error };
      const sessionToken = buatSesiAdmin();
      return { ok: true, session_token: sessionToken };
    }

    case 'getSiswaList':
      return getSiswaList(data.session_token);

    case 'addSiswa':
      return addSiswa(data.session_token, data.siswa || {});

    case 'editSiswa':
      return editSiswa(data.session_token, data.nisn, data.siswa || {});

    case 'deleteSiswa':
      return deleteSiswa(data.session_token, data.nisn);

    case 'importSiswaBatch':
      return importSiswaBatch(data.session_token, data.daftar_siswa || []);

    case 'generateTokenSiswa':
      return generateTokenSiswaAction(data.session_token, data.kelas);

    case 'getSoalList':
      return getSoalList(data.session_token);

    case 'addSoal':
      return addSoal(data.session_token, data.soal || {});

    case 'editSoal':
      return editSoal(data.session_token, data.id_soal, data.soal || {});

    case 'deleteSoal':
      return deleteSoal(data.session_token, data.id_soal);

    case 'importSoalBatch':
      return importSoalBatch(data.session_token, data.daftar_soal || []);

    case 'getRingkasanKelasMapel':
      return getRingkasanKelasMapel(data.session_token);

    case 'getMateriList':
      return getMateriList(data.session_token);

    case 'addMateri':
      return addMateri(data.session_token, data.materi || {});

    case 'deleteMateri':
      return deleteMateri(data.session_token, data.id_materi);

    case 'getMonitoringData':
      return getMonitoringData(data.session_token, data.id_ujian);

    case 'forceSubmitSiswaAdmin':
      return forceSubmitSiswaAdmin(data.session_token, data.nisn, data.id_ujian);

    case 'resetLoginSiswaAdmin':
      return resetLoginSiswaAdmin(data.session_token, data.nisn, data.id_ujian);

    case 'getHasilNilai':
      return getHasilNilai(data.session_token, data.id_ujian);

    case 'updateSkorUraian':
      return updateSkorUraian(data.session_token, data.id_hasil, data.skor_uraian);

    case 'getAnalisisButirSoal':
      return getAnalisisButirSoal(data.session_token, data.id_ujian, data.kode_mapel);

    case 'getUjian':
      return getUjian(data.nisn, data.token, data.id_ujian);

    case 'getUjianAktif':
      return getUjianAktif(data.nisn, data.token);

    case 'getUjianListAdmin':
      return getUjianListAdmin(data.session_token);

    case 'getSoal':
      return getSoal(data.nisn, data.token, data.kode_mapel);

    case 'submitJawaban':
      return submitJawaban(data.nisn, data.token, data.id_ujian, data.jawaban_pg, data.jawaban_uraian, data.violations, 'Submitted');

    case 'forceSubmitJawaban':
      return submitJawaban(data.nisn, data.token, data.id_ujian, data.jawaban_pg, data.jawaban_uraian, data.violations, 'Force Submitted');

    case 'autosaveJawaban':
      return autosaveJawaban(data.nisn, data.token, data.id_ujian, data.jawaban_pg, data.jawaban_uraian, data.violations);

    default:
      return { ok: false, error: 'Action tidak dikenali: ' + action };
  }
}


/**
 * ------------------------------------------------------------
 * HELPER: jsonResponse
 * Membungkus semua response jadi format JSON yang konsisten.
 *
 * Catatan teknis: Apps Script Web App tidak mendukung custom
 * HTTP status code di response (selalu 200 dari sisi browser),
 * jadi kode status di sini (400/500) hanya kita sisipkan di
 * dalam body JSON sebagai "status", supaya frontend tetap bisa
 * membedakan sukses/gagal.
 * ------------------------------------------------------------
 */
function jsonResponse(obj, status) {
  obj.status = status || 200;
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * ------------------------------------------------------------
 * HELPER: getSheet
 * Ambil referensi sheet berdasarkan nama, dengan pengecekan
 * supaya error-nya jelas kalau nama sheet salah ketik.
 * ------------------------------------------------------------
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan. Cek kembali nama sheet di spreadsheet.');
  }
  return sheet;
}


/**
 * ------------------------------------------------------------
 * HELPER: sheetToObjects
 * Mengubah isi sheet (header di baris 1) jadi array of object,
 * supaya kode kita nanti kerja pakai nama kolom, bukan index angka.
 *
 * Contoh hasil untuk DB_Siswa:
 * [ { NISN: '0091234561', Nama_Siswa: 'Ahmad Fauzan', Kelas: '5A', ... }, ... ]
 * ------------------------------------------------------------
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null)) // buang baris kosong
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
}


/**
 * ------------------------------------------------------------
 * TEST MANUAL DI APPS SCRIPT EDITOR
 * Jalankan fungsi ini langsung dari editor (tombol Run) untuk
 * memastikan koneksi ke spreadsheet & helper sudah benar,
 * sebelum dites lewat Web App URL.
 * ------------------------------------------------------------
 */
function testKoneksi() {
  const siswa = sheetToObjects(getSheet(SHEET_SISWA));
  Logger.log('Jumlah siswa terbaca: ' + siswa.length);
  Logger.log(JSON.stringify(siswa, null, 2));
}
