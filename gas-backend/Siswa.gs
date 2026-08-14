/**
 * ============================================================
 * SISWA.GS — Kelola Data Siswa (Modul Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Semua fungsi di file ini adalah aksi ADMIN dan WAJIB menyertakan
 * session_token yang valid (lihat Auth.gs -> validasiSesiAdmin).
 * Ini mencegah orang yang tidak login memanggil endpoint ini
 * langsung walau tahu URL Web App-nya.
 * ============================================================
 */

/**
 * Ambil seluruh data siswa (dipakai untuk menampilkan tabel di admin).
 */
function getSiswaList(sessionToken) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }
  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  return { ok: true, siswa: siswaList };
}

/**
 * Tambah 1 siswa baru secara manual.
 */
function addSiswa(sessionToken, data) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const nisn = String(data.NISN || '').trim();
  const nama = String(data.Nama_Siswa || '').trim();
  const kelas = String(data.Kelas || '').trim();

  if (!nisn || !nama || !kelas) {
    return { ok: false, error: 'NISN, Nama, dan Kelas wajib diisi.' };
  }

  const sheet = getSheet(SHEET_SISWA);
  const existing = sheetToObjects(sheet);

  if (existing.some(s => String(s.NISN).trim() === nisn)) {
    return { ok: false, error: 'NISN "' + nisn + '" sudah terdaftar. Gunakan NISN lain atau edit data yang sudah ada.' };
  }

  sheet.appendRow([nisn, nama, kelas, '', 'Belum Mulai']);
  return { ok: true };
}

/**
 * Edit data siswa yang sudah ada (Nama & Kelas -- NISN dipakai sebagai kunci pencarian, tidak diubah).
 */
function editSiswa(sessionToken, nisn, data) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_SISWA);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colNisn = headers.indexOf('NISN');
  const colNama = headers.indexOf('Nama_Siswa');
  const colKelas = headers.indexOf('Kelas');

  const nisnBersih = String(nisn).trim();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colNisn]).trim() === nisnBersih) { rowIndex = i; break; }
  }

  if (rowIndex === -1) {
    return { ok: false, error: 'Siswa dengan NISN "' + nisn + '" tidak ditemukan.' };
  }

  if (data.Nama_Siswa) sheet.getRange(rowIndex + 1, colNama + 1).setValue(String(data.Nama_Siswa).trim());
  if (data.Kelas) sheet.getRange(rowIndex + 1, colKelas + 1).setValue(String(data.Kelas).trim());

  return { ok: true };
}

/**
 * Hapus 1 siswa berdasarkan NISN.
 */
function deleteSiswa(sessionToken, nisn) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_SISWA);
  const values = sheet.getDataRange().getValues();
  const colNisn = values[0].indexOf('NISN');
  const nisnBersih = String(nisn).trim();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colNisn]).trim() === nisnBersih) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }

  return { ok: false, error: 'Siswa dengan NISN "' + nisn + '" tidak ditemukan.' };
}

/**
 * Import banyak siswa sekaligus (dari hasil parsing Excel di frontend).
 * Baris dengan NISN yang sudah ada akan DILEWATI (tidak menimpa), supaya
 * import ulang tidak sengaja merusak data/token yang sudah ada.
 *
 * @param {Array<{NISN, Nama_Siswa, Kelas}>} daftarSiswa
 */
function importSiswaBatch(sessionToken, daftarSiswa) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  if (!Array.isArray(daftarSiswa) || daftarSiswa.length === 0) {
    return { ok: false, error: 'Tidak ada data untuk diimport.' };
  }

  const sheet = getSheet(SHEET_SISWA);
  const existing = sheetToObjects(sheet);
  const nisnTerdaftar = new Set(existing.map(s => String(s.NISN).trim()));

  const barisBaru = [];
  const dilewati = [];

  daftarSiswa.forEach(row => {
    const nisn = String(row.NISN || '').trim();
    const nama = String(row.Nama_Siswa || '').trim();
    const kelas = String(row.Kelas || '').trim();

    if (!nisn || !nama || !kelas) {
      dilewati.push({ nisn: nisn || '(kosong)', alasan: 'Data tidak lengkap' });
      return;
    }
    if (nisnTerdaftar.has(nisn)) {
      dilewati.push({ nisn, alasan: 'NISN sudah terdaftar' });
      return;
    }

    barisBaru.push([nisn, nama, kelas, '', 'Belum Mulai']);
    nisnTerdaftar.add(nisn); // cegah duplikat dalam file yang sama
  });

  if (barisBaru.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, barisBaru.length, barisBaru[0].length).setValues(barisBaru);
  }

  return {
    ok: true,
    jumlah_ditambahkan: barisBaru.length,
    jumlah_dilewati: dilewati.length,
    detail_dilewati: dilewati
  };
}

/**
 * Generate ulang token untuk siswa (membungkus generateTokenSiswa dari Auth.gs
 * supaya bisa dipanggil lewat Web App dengan validasi sesi admin).
 */
function generateTokenSiswaAction(sessionToken, kelasFilter) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const jumlah = generateTokenSiswa(kelasFilter || '');
  return { ok: true, jumlah_diupdate: jumlah };
}
