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
 * Dipakai untuk request baca data (read-only), lewat query param.
 * Contoh pemanggilan dari frontend:
 *   GET {WEB_APP_URL}?action=ping
 * ------------------------------------------------------------
 */
function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'ping':
        return jsonResponse({ ok: true, message: 'Server CBT aktif', waktu_server: new Date().toISOString() });

      default:
        return jsonResponse({ ok: false, error: 'Action tidak dikenali: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
  }
}


/**
 * ------------------------------------------------------------
 * ENTRY POINT: doPost
 * Dipakai untuk request yang mengirim data (login, submit jawaban, dst).
 * Body request harus JSON, contoh:
 *   { "action": "ping", "data": { ... } }
 * ------------------------------------------------------------
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'ping':
        return jsonResponse({ ok: true, message: 'POST diterima', diterima: body.data || null });

      case 'login': {
        const { nisn, token } = body.data || {};
        const hasil = validateToken(nisn, token);
        if (!hasil.valid) {
          return jsonResponse({ ok: false, error: hasil.error }, 401);
        }
        return jsonResponse({ ok: true, siswa: hasil.siswa });
      }

      case 'loginAdmin': {
        const { password } = body.data || {};
        const hasil = validateAdminPassword(password);
        if (!hasil.valid) {
          return jsonResponse({ ok: false, error: hasil.error }, 401);
        }
        const sessionToken = buatSesiAdmin();
        return jsonResponse({ ok: true, session_token: sessionToken });
      }

      case 'getSiswaList': {
        const { session_token } = body.data || {};
        const hasil = getSiswaList(session_token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'addSiswa': {
        const { session_token, siswa } = body.data || {};
        const hasil = addSiswa(session_token, siswa || {});
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'editSiswa': {
        const { session_token, nisn, siswa } = body.data || {};
        const hasil = editSiswa(session_token, nisn, siswa || {});
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'deleteSiswa': {
        const { session_token, nisn } = body.data || {};
        const hasil = deleteSiswa(session_token, nisn);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'importSiswaBatch': {
        const { session_token, daftar_siswa } = body.data || {};
        const hasil = importSiswaBatch(session_token, daftar_siswa || []);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'generateTokenSiswa': {
        const { session_token, kelas } = body.data || {};
        const hasil = generateTokenSiswaAction(session_token, kelas);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'getSoalList': {
        const { session_token } = body.data || {};
        const hasil = getSoalList(session_token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'addSoal': {
        const { session_token, soal } = body.data || {};
        const hasil = addSoal(session_token, soal || {});
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'editSoal': {
        const { session_token, id_soal, soal } = body.data || {};
        const hasil = editSoal(session_token, id_soal, soal || {});
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'deleteSoal': {
        const { session_token, id_soal } = body.data || {};
        const hasil = deleteSoal(session_token, id_soal);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'importSoalBatch': {
        const { session_token, daftar_soal } = body.data || {};
        const hasil = importSoalBatch(session_token, daftar_soal || []);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'getRingkasanKelasMapel': {
        const { session_token } = body.data || {};
        const hasil = getRingkasanKelasMapel(session_token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'getMateriList': {
        const { session_token } = body.data || {};
        const hasil = getMateriList(session_token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'addMateri': {
        const { session_token, materi } = body.data || {};
        const hasil = addMateri(session_token, materi || {});
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'deleteMateri': {
        const { session_token, id_materi } = body.data || {};
        const hasil = deleteMateri(session_token, id_materi);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'getMonitoringData': {
        const { session_token, id_ujian } = body.data || {};
        const hasil = getMonitoringData(session_token, id_ujian);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'forceSubmitSiswaAdmin': {
        const { session_token, nisn, id_ujian } = body.data || {};
        const hasil = forceSubmitSiswaAdmin(session_token, nisn, id_ujian);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'resetLoginSiswaAdmin': {
        const { session_token, nisn, id_ujian } = body.data || {};
        const hasil = resetLoginSiswaAdmin(session_token, nisn, id_ujian);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'getHasilNilai': {
        const { session_token, id_ujian } = body.data || {};
        const hasil = getHasilNilai(session_token, id_ujian);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'updateSkorUraian': {
        const { session_token, id_hasil, skor_uraian } = body.data || {};
        const hasil = updateSkorUraian(session_token, id_hasil, skor_uraian);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'getAnalisisButirSoal': {
        const { session_token, id_ujian, kode_mapel } = body.data || {};
        const hasil = getAnalisisButirSoal(session_token, id_ujian, kode_mapel);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'getUjian': {
        const { nisn, token, id_ujian } = body.data || {};
        const hasil = getUjian(nisn, token, id_ujian);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'getUjianAktif': {
        const { nisn, token } = body.data || {};
        const hasil = getUjianAktif(nisn, token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'getUjianListAdmin': {
        const { session_token } = body.data || {};
        const hasil = getUjianListAdmin(session_token);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'getSoal': {
        const { nisn, token, kode_mapel } = body.data || {};
        const hasil = getSoal(nisn, token, kode_mapel);
        return jsonResponse(hasil, hasil.ok ? 200 : 401);
      }

      case 'submitJawaban': {
        const { nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations } = body.data || {};
        const hasil = submitJawaban(nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations, 'Submitted');
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'forceSubmitJawaban': {
        const { nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations } = body.data || {};
        const hasil = submitJawaban(nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations, 'Force Submitted');
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      case 'autosaveJawaban': {
        const { nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations } = body.data || {};
        const hasil = autosaveJawaban(nisn, token, id_ujian, jawaban_pg, jawaban_uraian, violations);
        return jsonResponse(hasil, hasil.ok ? 200 : 400);
      }

      default:
        return jsonResponse({ ok: false, error: 'Action tidak dikenali: ' + action }, 400);
    }
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, 500);
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
