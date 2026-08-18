/**
 * ============================================================
 * UJIAN.GS — Endpoint Ambil Data Ujian & Soal
 * MI Sultan Agung
 * ============================================================
 *
 * PRINSIP KEAMANAN:
 * Setiap fungsi di file ini yang dipanggil dari frontend WAJIB
 * menerima (nisn, token) dan memvalidasinya lewat validateToken()
 * SEBELUM mengembalikan data apa pun. Jangan pernah membuat
 * endpoint yang mengembalikan data ujian/soal tanpa validasi ini.
 *
 * PRINSIP KEAMANAN #2 — SEMBUNYIKAN KUNCI JAWABAN:
 * Kolom "Kunci" di DB_Soal TIDAK BOLEH dikirim ke frontend siswa.
 * Kalau kunci ikut terkirim, siswa yang paham DevTools bisa
 * membaca jawaban langsung dari response JSON. Fungsi
 * sanitasiSoal() di bawah selalu menghapus kolom ini sebelum
 * data dikirim balik.
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * ENDPOINT: getUjian
 * Ambil info ujian (nama, durasi, dll) + set Waktu_Mulai_Server
 * kalau ini pertama kalinya siswa membuka ujian tersebut.
 *
 * @param {string} nisn
 * @param {string} token
 * @param {string} idUjian
 * ------------------------------------------------------------
 */
function getUjian(nisn, token, idUjian) {
  const auth = validateToken(nisn, token);
  if (!auth.valid) {
    return { ok: false, error: auth.error };
  }

  const sheet = getSheet(SHEET_UJIAN);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colId = headers.indexOf('ID_Ujian');

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colId] === idUjian) { rowIndex = i; break; }
  }

  if (rowIndex === -1) {
    return { ok: false, error: 'Ujian dengan ID "' + idUjian + '" tidak ditemukan.' };
  }

  return prosesDataUjian(sheet, data, headers, rowIndex);
}


/**
 * ------------------------------------------------------------
 * ENDPOINT ADMIN: getUjianListAdmin
 * Daftar SEMUA sesi ujian (bukan cuma yang aktif) -- dipakai untuk
 * dropdown pemilihan ujian di Monitoring & Hasil Nilai.
 * ------------------------------------------------------------
 */
function getUjianListAdmin(sessionToken) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }
  const ujianList = sheetToObjects(getSheet(SHEET_UJIAN));
  return { ok: true, ujian: ujianList };
}


/**
 * ------------------------------------------------------------
 * ENDPOINT: getUjianAktif
 * Sama seperti getUjian(), tapi mencari baris dengan Status="Aktif"
 * -- dipakai siswa saat login karena mereka tidak perlu tahu
 * ID_Ujian secara spesifik, cukup ujian mana pun yang sedang
 * berjalan sekarang.
 *
 * Catatan: hanya boleh ada 1 baris berstatus "Aktif" dalam satu
 * waktu (diatur manual oleh admin di sheet untuk saat ini).
 * ------------------------------------------------------------
 */
function getUjianAktif(nisn, token) {
  const auth = validateToken(nisn, token);
  if (!auth.valid) {
    return { ok: false, error: auth.error };
  }

  const sheet = getSheet(SHEET_UJIAN);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colStatus = headers.indexOf('Status');

  if (colStatus === -1) {
    return { ok: false, error: 'Kolom Status belum ada di DB_Ujian. Tambahkan dulu sesuai panduan.' };
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colStatus] === 'Aktif') { rowIndex = i; break; }
  }

  if (rowIndex === -1) {
    return { ok: false, error: 'Tidak ada ujian yang sedang aktif saat ini. Hubungi panitia ujian.' };
  }

  return prosesDataUjian(sheet, data, headers, rowIndex);
}


/**
 * Helper bersama: hitung/tulis Waktu_Mulai_Server dan sisa_detik
 * untuk 1 baris ujian tertentu. Dipakai oleh getUjian & getUjianAktif.
 */
function prosesDataUjian(sheet, data, headers, rowIndex) {
  const colWaktuMenit = headers.indexOf('Waktu_Menit');
  const colWaktuMulaiServer = headers.indexOf('Waktu_Mulai_Server');
  const ujianRow = data[rowIndex];

  let waktuMulaiServer = ujianRow[colWaktuMulaiServer];
  if (!waktuMulaiServer) {
    waktuMulaiServer = new Date();
    sheet.getRange(rowIndex + 1, colWaktuMulaiServer + 1).setValue(waktuMulaiServer);
  }

  const waktuMenit = Number(ujianRow[colWaktuMenit]) || 0;
  const batasWaktu = new Date(waktuMulaiServer.getTime ? waktuMulaiServer.getTime() : new Date(waktuMulaiServer).getTime());
  batasWaktu.setMinutes(batasWaktu.getMinutes() + waktuMenit);

  const sekarang = new Date();
  const sisaDetik = Math.max(0, Math.floor((batasWaktu.getTime() - sekarang.getTime()) / 1000));

  const ujianObj = {};
  headers.forEach((h, i) => { ujianObj[h] = ujianRow[i]; });
  ujianObj.Waktu_Mulai_Server = waktuMulaiServer;

  return {
    ok: true,
    ujian: ujianObj,
    sisa_detik: sisaDetik,
    waktu_server_sekarang: sekarang.toISOString()
  };
}


/**
 * ------------------------------------------------------------
 * ENDPOINT: getSoal
 * Ambil daftar soal berdasarkan Kode_Mapel, TANPA kolom Kunci.
 *
 * @param {string} nisn
 * @param {string} token
 * @param {string} kodeMapel
 * ------------------------------------------------------------
 */
function getSoal(nisn, token, kodeMapel) {
  const auth = validateToken(nisn, token);
  if (!auth.valid) {
    return { ok: false, error: auth.error };
  }

  const semuaSoal = sheetToObjects(getSheet(SHEET_SOAL));
  const soalMapel = semuaSoal.filter(s => s.Kode_Mapel === kodeMapel);

  if (soalMapel.length === 0) {
    return { ok: false, error: 'Tidak ada soal ditemukan untuk mata pelajaran "' + kodeMapel + '".' };
  }

  return {
    ok: true,
    jumlah: soalMapel.length,
    soal: soalMapel.map(sanitasiSoal)
  };
}


/**
 * ------------------------------------------------------------
 * HELPER: sanitasiSoal
 * Buang kolom Kunci sebelum data dikirim ke frontend siswa.
 * ------------------------------------------------------------
 */
function sanitasiSoal(soal) {
  const aman = {};
  Object.keys(soal).forEach(key => {
    if (key === 'Kunci') return; // JANGAN ikutkan kunci jawaban
    aman[key] = soal[key];
  });
  return aman;
}


/**
 * ------------------------------------------------------------
 * TEST MANUAL DI APPS SCRIPT EDITOR
 * Ganti NISN + TOKEN dengan hasil generateTokenSiswaTest() yang
 * masih berlaku (lihat kolom Token_Ujian di sheet DB_Siswa).
 * ------------------------------------------------------------
 */
function getUjianTest() {
  const hasil = getUjian('0091234561', 'GANTI_DENGAN_TOKEN', 'UJ-MTK-2026-01');
  Logger.log(JSON.stringify(hasil, null, 2));
}

function getSoalTest() {
  const hasil = getSoal('0091234561', 'GANTI_DENGAN_TOKEN', 'MTK');
  Logger.log(JSON.stringify(hasil, null, 2));
}
