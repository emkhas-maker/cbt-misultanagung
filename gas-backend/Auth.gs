/**
 * ============================================================
 * AUTH.GS — Generate & Validasi Token Siswa
 * MI Sultan Agung
 * ============================================================
 *
 * KONSEP TOKEN (sesuai keputusan):
 * Token_Ujian di DB_Siswa BUKAN token permanen — token ini
 * ditimpa ulang (di-generate baru) setiap kali admin akan
 * mengadakan ujian baru. Artinya:
 *
 *   - Sebelum ujian dimulai, admin menjalankan generateTokenSiswa()
 *     untuk kelas yang akan ujian.
 *   - Token lama otomatis tidak berlaku lagi begitu ditimpa.
 *   - Kartu Peserta HARUS dicetak ulang setiap sesi ujian baru,
 *     karena isinya token yang baru.
 *
 * Asumsi: dalam satu waktu hanya ada SATU sesi ujian aktif per
 * kelas (wajar untuk ujian sekolah yang berurutan, bukan paralel
 * dalam kelas yang sama). Kalau ke depan perlu ujian paralel
 * dalam 1 kelas di waktu bersamaan, skema ini perlu direvisi
 * jadi token per (siswa + ujian) — catat sebagai potensi
 * pengembangan lanjutan, bukan kebutuhan sekarang.
 * ============================================================
 */


/**
 * ------------------------------------------------------------
 * FUNGSI ADMIN: generateTokenSiswa
 * Jalankan manual dari Apps Script Editor (atau nanti dipanggil
 * dari tombol di menu Data Siswa pada frontend admin).
 *
 * @param {string} kelasFilter - opsional. Contoh: '5A'.
 *   Kalau diisi, hanya siswa di kelas itu yang di-generate ulang.
 *   Kalau dikosongkan (''), SEMUA siswa di-generate ulang.
 * ------------------------------------------------------------
 */
function generateTokenSiswa(kelasFilter) {
  kelasFilter = kelasFilter || '';

  const sheet = getSheet(SHEET_SISWA);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const colKelas = headers.indexOf('Kelas');
  const colToken = headers.indexOf('Token_Ujian');
  const colStatus = headers.indexOf('Status_Ujian');

  if (colKelas === -1 || colToken === -1) {
    throw new Error('Kolom Kelas atau Token_Ujian tidak ditemukan di DB_Siswa. Cek kembali header sheet.');
  }

  let jumlahDiupdate = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const kelasSiswa = row[colKelas];

    // Lewati baris kosong
    if (!row[0]) continue;

    // Kalau ada filter kelas, hanya proses yang cocok
    if (kelasFilter && kelasSiswa !== kelasFilter) continue;

    const tokenBaru = buatTokenAcak(6);
    sheet.getRange(i + 1, colToken + 1).setValue(tokenBaru);

    // Reset status ujian ke 'Belum Mulai' karena ini sesi ujian baru
    if (colStatus !== -1) {
      sheet.getRange(i + 1, colStatus + 1).setValue('Belum Mulai');
    }

    jumlahDiupdate++;
  }

  Logger.log('Token berhasil digenerate untuk ' + jumlahDiupdate + ' siswa' +
    (kelasFilter ? ' (kelas ' + kelasFilter + ')' : ' (semua kelas)'));

  return jumlahDiupdate;
}


/**
 * ------------------------------------------------------------
 * HELPER: buatTokenAcak
 * Bikin token acak, huruf kapital + angka, TANPA karakter yang
 * gampang salah baca oleh siswa MI: 0/O, 1/I/L.
 * ------------------------------------------------------------
 */
function buatTokenAcak(panjang) {
  const karakter = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sengaja tanpa 0,O,1,I,L
  let token = '';
  for (let i = 0; i < panjang; i++) {
    const idx = Math.floor(Math.random() * karakter.length);
    token += karakter.charAt(idx);
  }
  return token;
}


/**
 * ------------------------------------------------------------
 * FUNGSI: validateToken
 * Dipanggil saat siswa login. Mengecek kecocokan NISN + Token.
 *
 * @param {string} nisn
 * @param {string} token
 * @return {Object} { valid: boolean, siswa?: object, error?: string }
 * ------------------------------------------------------------
 */
function validateToken(nisn, token) {
  if (!nisn || !token) {
    return { valid: false, error: 'NISN dan Token wajib diisi.' };
  }

  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));

  // Normalisasi: hilangkan spasi, huruf token disamakan jadi kapital
  const nisnBersih = String(nisn).trim();
  const tokenBersih = String(token).trim().toUpperCase();

  const siswa = siswaList.find(s =>
    String(s.NISN).trim() === nisnBersih &&
    String(s.Token_Ujian).trim().toUpperCase() === tokenBersih
  );

  if (!siswa) {
    return { valid: false, error: 'NISN atau Token tidak cocok. Periksa kembali Kartu Peserta.' };
  }

  if (!siswa.Token_Ujian) {
    return { valid: false, error: 'Token belum digenerate untuk siswa ini. Hubungi panitia ujian.' };
  }

  return { valid: true, siswa: siswa };
}


/**
 * ------------------------------------------------------------
 * ADMIN LOGIN — 1 password bersama untuk semua panitia/admin
 * ------------------------------------------------------------
 * Password TIDAK disimpan plaintext. Disimpan dalam bentuk hash
 * (SHA-256) di Script Properties (bukan di Sheets, bukan di kode),
 * supaya tidak kelihatan meskipun script ini dibagikan/dilihat
 * orang lain.
 * ------------------------------------------------------------
 */

/**
 * SETUP AWAL (jalankan SEKALI SAJA secara manual dari editor):
 * Ganti 'PASSWORD_BARU_DISINI' dengan password yang Bapak mau,
 * jalankan fungsi ini, lalu HAPUS/GANTI baris passwordnya lagi
 * supaya tidak tertinggal plaintext di kode.
 */
function setupAdminPassword() {
  const passwordBaru = 'PASSWORD_BARU_DISINI'; // <-- ganti ini, jalankan, lalu kosongkan lagi
  if (passwordBaru === 'PASSWORD_BARU_DISINI') {
    throw new Error('Ganti dulu nilai passwordBaru di dalam fungsi ini sebelum dijalankan.');
  }
  const hash = hashPassword(passwordBaru);
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD_HASH', hash);
  Logger.log('Password admin berhasil diset.');
}

/**
 * Validasi password admin yang dikirim dari frontend.
 */
function validateAdminPassword(password) {
  if (!password) {
    return { valid: false, error: 'Password wajib diisi.' };
  }

  const hashTersimpan = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH');
  if (!hashTersimpan) {
    return { valid: false, error: 'Password admin belum pernah diset. Jalankan setupAdminPassword() dulu di editor.' };
  }

  const hashInput = hashPassword(password);
  if (hashInput !== hashTersimpan) {
    return { valid: false, error: 'Password salah.' };
  }

  return { valid: true };
}

/**
 * ------------------------------------------------------------
 * SESI ADMIN (session token)
 * ------------------------------------------------------------
 * Setelah password admin tervalidasi, kita terbitkan token sesi
 * acak yang disimpan sementara di CacheService (otomatis hilang
 * sendiri setelah beberapa jam). Semua aksi admin berikutnya
 * (tambah/edit/hapus siswa, generate token, dll) WAJIB menyertakan
 * token ini dan divalidasi ulang -- supaya orang yang tidak login
 * tidak bisa langsung memanggil endpoint admin walau tahu URL-nya.
 *
 * Catatan: CacheService Apps Script maksimal menyimpan data 6 jam
 * (21600 detik) -- cukup untuk 1 sesi kerja admin di sekolah.
 * ------------------------------------------------------------
 */
const DURASI_SESI_ADMIN_DETIK = 21600; // 6 jam

function buatSesiAdmin() {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('admin_sesi_' + token, 'valid', DURASI_SESI_ADMIN_DETIK);
  return token;
}

function validasiSesiAdmin(sessionToken) {
  if (!sessionToken) return false;
  const nilai = CacheService.getScriptCache().get('admin_sesi_' + sessionToken);
  return nilai === 'valid';
}

/**
 * Helper: hash password pakai SHA-256 (bawaan Apps Script, tanpa library luar).
 */
function hashPassword(password) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return bytes.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

/**
 * ------------------------------------------------------------
 * TEST MANUAL DI APPS SCRIPT EDITOR
 * 1. Jalankan generateTokenSiswaTest() dulu untuk isi token
 *    3 siswa dummy, lihat hasilnya di Log eksekusi.
 * 2. Copy salah satu token dari log / langsung cek di Sheet.
 * 3. Jalankan validateTokenTest() dengan token itu untuk
 *    memastikan validasi berjalan benar.
 * ------------------------------------------------------------
 */
function generateTokenSiswaTest() {
  generateTokenSiswa(''); // kosongkan = semua kelas

  // Tampilkan hasilnya di log biar gampang dicopy untuk tes berikutnya
  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  siswaList.forEach(s => {
    Logger.log(s.NISN + ' - ' + s.Nama_Siswa + ' - Token: ' + s.Token_Ujian);
  });
}

function validateTokenTest() {
  // GANTI nilai di bawah dengan NISN + token hasil dari generateTokenSiswaTest()
  const hasil = validateToken('0091234561', 'GANTI_DENGAN_TOKEN');
  Logger.log(JSON.stringify(hasil, null, 2));
}
