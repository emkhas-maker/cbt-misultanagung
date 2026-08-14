/**
 * ============================================================
 * SCORING.GS — Penilaian Otomatis & Penyimpanan Hasil Ujian
 * MI Sultan Agung
 * ============================================================
 *
 * File ini menangani proses submit jawaban siswa:
 *  1. Validasi token (siapa yang submit).
 *  2. Hitung skor PG otomatis (dengan Kunci dari DB_Soal —
 *     satu-satunya tempat yang boleh membaca kolom Kunci).
 *  3. Simpan jawaban Uraian apa adanya (dinilai manual oleh guru
 *     nanti di menu Hasil Nilai — belum dibuat di fase ini).
 *  4. Tulis / update baris di DB_Hasil.
 *
 * CATATAN PROTEKSI DOUBLE-SUBMIT:
 * submitJawaban() mengecek Status_Submit yang sudah ada.
 * Kalau statusnya sudah 'Submitted' atau 'Force Submitted',
 * request submit berikutnya DITOLAK — supaya forceSubmit()
 * (dari lockdown) dan submit manual siswa yang datang hampir
 * bersamaan tidak saling menimpa data secara tidak konsisten.
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * ENDPOINT: submitJawaban
 *
 * @param {string} nisn
 * @param {string} token
 * @param {string} idUjian
 * @param {Object} jawabanPG      - contoh: { "MTK-001": "B", "MTK-002": "B" }
 * @param {Object} jawabanUraian  - contoh: { "MTK-003": "Keliling = 2 x (p+l)" }
 * @param {number} violations     - jumlah pelanggaran lockdown saat submit
 * @param {string} statusSubmit   - 'Submitted' (manual) atau 'Force Submitted' (dari lockdown)
 * ------------------------------------------------------------
 */
function submitJawaban(nisn, token, idUjian, jawabanPG, jawabanUraian, violations, statusSubmit) {
  const auth = validateToken(nisn, token);
  if (!auth.valid) {
    return { ok: false, error: auth.error };
  }

  statusSubmit = statusSubmit || 'Submitted';
  jawabanPG = jawabanPG || {};
  jawabanUraian = jawabanUraian || {};

  const sheet = getSheet(SHEET_HASIL);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const idHasil = nisn + '_' + idUjian;

  // Cek apakah sudah ada baris hasil untuk siswa+ujian ini
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][col['ID_Hasil']] === idHasil) {
      rowIndex = i;
      break;
    }
  }

  // Proteksi double-submit: kalau sudah final, tolak submit baru
  if (rowIndex !== -1) {
    const statusSekarang = data[rowIndex][col['Status_Submit']];
    if (statusSekarang === 'Submitted' || statusSekarang === 'Force Submitted') {
      return {
        ok: false,
        error: 'Jawaban untuk ujian ini sudah pernah disubmit sebelumnya (status: ' + statusSekarang + '). Submit ganda ditolak.'
      };
    }
  }

  // Hitung skor PG menggunakan Kunci dari DB_Soal
  const skorPG = hitungSkorPG(jawabanPG);

  const now = new Date();
  const rowValues = {
    'ID_Hasil': idHasil,
    'NISN': nisn,
    'ID_Ujian': idUjian,
    'Jawaban_PG': JSON.stringify(jawabanPG),
    'Jawaban_Uraian': JSON.stringify(jawabanUraian),
    'Skor_PG': skorPG,
    'Skor_Uraian': '', // diisi manual oleh guru nanti (menu Hasil Nilai)
    'Total_Nilai': skorPG, // sementara = Skor_PG saja; diperbarui lagi setelah guru koreksi Uraian
    'Violations': violations || 0,
    'Status_Submit': statusSubmit,
    'Last_Autosave': now
  };

  if (rowIndex === -1) {
    // Baris baru
    const newRow = headers.map(h => rowValues[h] !== undefined ? rowValues[h] : '');
    sheet.appendRow(newRow);
  } else {
    // Update baris yang sudah ada (misalnya sebelumnya cuma autosave)
    headers.forEach((h, i) => {
      if (rowValues[h] !== undefined) {
        sheet.getRange(rowIndex + 1, i + 1).setValue(rowValues[h]);
      }
    });
  }

  // Update Status_Ujian siswa di DB_Siswa jadi 'Selesai'
  updateStatusUjianSiswa(nisn, 'Selesai');

  return {
    ok: true,
    id_hasil: idHasil,
    skor_pg: skorPG,
    status_submit: statusSubmit
  };
}


/**
 * ------------------------------------------------------------
 * ENDPOINT: autosaveJawaban
 * Dipanggil berkala oleh frontend (autosave.js) SELAMA siswa
 * masih mengerjakan — beda dari submitJawaban yang final.
 * Tidak menghitung skor, tidak mengunci status.
 * ------------------------------------------------------------
 */
function autosaveJawaban(nisn, token, idUjian, jawabanPG, jawabanUraian, violations) {
  const auth = validateToken(nisn, token);
  if (!auth.valid) {
    return { ok: false, error: auth.error };
  }

  const sheet = getSheet(SHEET_HASIL);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });

  const idHasil = nisn + '_' + idUjian;

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][col['ID_Hasil']] === idHasil) {
      rowIndex = i;
      break;
    }
  }

  // Jangan timpa data yang statusnya sudah final
  if (rowIndex !== -1) {
    const statusSekarang = data[rowIndex][col['Status_Submit']];
    if (statusSekarang === 'Submitted' || statusSekarang === 'Force Submitted') {
      return { ok: false, error: 'Ujian sudah final disubmit, autosave diabaikan.' };
    }
  }

  const now = new Date();
  const rowValues = {
    'ID_Hasil': idHasil,
    'NISN': nisn,
    'ID_Ujian': idUjian,
    'Jawaban_PG': JSON.stringify(jawabanPG || {}),
    'Jawaban_Uraian': JSON.stringify(jawabanUraian || {}),
    'Violations': violations || 0,
    'Status_Submit': 'Autosave',
    'Last_Autosave': now
  };

  if (rowIndex === -1) {
    const newRow = headers.map(h => rowValues[h] !== undefined ? rowValues[h] : '');
    sheet.appendRow(newRow);
  } else {
    headers.forEach((h, i) => {
      if (rowValues[h] !== undefined) {
        sheet.getRange(rowIndex + 1, i + 1).setValue(rowValues[h]);
      }
    });
  }

  // Kalau ini autosave pertama, tandai siswa 'Sedang Mengerjakan'
  updateStatusUjianSiswa(nisn, 'Sedang Mengerjakan');

  return { ok: true, last_autosave: now.toISOString() };
}


/**
 * ------------------------------------------------------------
 * HELPER: hitungSkorPG
 * Bandingkan jawaban siswa dengan Kunci di DB_Soal, jumlahkan
 * Bobot untuk setiap jawaban yang benar.
 * ------------------------------------------------------------
 */
function hitungSkorPG(jawabanPG) {
  const semuaSoal = sheetToObjects(getSheet(SHEET_SOAL));
  let skor = 0;

  semuaSoal.forEach(soal => {
    if (soal.Jenis !== 'PG') return;
    const jawabanSiswa = jawabanPG[soal.ID_Soal];
    if (jawabanSiswa && String(jawabanSiswa).toUpperCase() === String(soal.Kunci).toUpperCase()) {
      skor += Number(soal.Bobot) || 0;
    }
  });

  return skor;
}


/**
 * ------------------------------------------------------------
 * HELPER: updateStatusUjianSiswa
 * Update kolom Status_Ujian di DB_Siswa untuk NISN tertentu.
 * ------------------------------------------------------------
 */
function updateStatusUjianSiswa(nisn, statusBaru) {
  const sheet = getSheet(SHEET_SISWA);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colNisn = headers.indexOf('NISN');
  const colStatus = headers.indexOf('Status_Ujian');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colNisn]).trim() === String(nisn).trim()) {
      sheet.getRange(i + 1, colStatus + 1).setValue(statusBaru);
      break;
    }
  }
}


/**
 * ------------------------------------------------------------
 * TEST MANUAL DI APPS SCRIPT EDITOR
 * Ganti TOKEN dengan token yang masih berlaku dari DB_Siswa.
 * ------------------------------------------------------------
 */
function submitJawabanTest() {
  const hasil = submitJawaban(
    '0091234561',
    'GANTI_DENGAN_TOKEN',
    'UJ-MTK-2026-01',
    { 'MTK-001': 'B', 'MTK-002': 'B' },       // jawaban PG: dua-duanya benar -> skor 5+5=10
    { 'MTK-003': 'Keliling = 2 x (p + l)' },  // jawaban uraian
    0,
    'Submitted'
  );
  Logger.log(JSON.stringify(hasil, null, 2));
}

function submitJawabanDuaKaliTest() {
  // Jalankan SETELAH submitJawabanTest() — harus DITOLAK karena double-submit
  const hasil = submitJawaban(
    '0091234561',
    'GANTI_DENGAN_TOKEN',
    'UJ-MTK-2026-01',
    { 'MTK-001': 'A' },
    {},
    0,
    'Submitted'
  );
  Logger.log(JSON.stringify(hasil, null, 2));
}
