/**
 * ============================================================
 * SOAL.GS — Kelola Bank Soal (Modul Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Semua fungsi WAJIB session_token admin yang valid (lihat Auth.gs).
 * Berbeda dengan getSoal() di Ujian.gs (dipakai SISWA, kolom Kunci
 * disembunyikan), fungsi getSoalList() di sini untuk ADMIN dan
 * MENYERTAKAN kolom Kunci -- karena admin memang perlu melihat dan
 * mengubahnya.
 * ============================================================
 */

function getSoalList(sessionToken) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }
  const soalList = sheetToObjects(getSheet(SHEET_SOAL));
  return { ok: true, soal: soalList };
}

function addSoal(sessionToken, data) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const idSoal = String(data.ID_Soal || '').trim();
  const kodeMapel = String(data.Kode_Mapel || '').trim();
  const jenis = String(data.Jenis || '').trim();
  const pertanyaan = String(data.Pertanyaan || '').trim();
  const bobot = Number(data.Bobot) || 0;

  if (!idSoal || !kodeMapel || !jenis || !pertanyaan || !bobot) {
    return { ok: false, error: 'ID Soal, Kode Mapel, Jenis, Pertanyaan, dan Bobot wajib diisi.' };
  }
  if (jenis !== 'PG' && jenis !== 'Uraian') {
    return { ok: false, error: 'Jenis soal harus "PG" atau "Uraian".' };
  }
  if (jenis === 'PG' && !data.Kunci) {
    return { ok: false, error: 'Soal Pilihan Ganda wajib memiliki Kunci jawaban.' };
  }

  const sheet = getSheet(SHEET_SOAL);
  const existing = sheetToObjects(sheet);
  if (existing.some(s => String(s.ID_Soal).trim() === idSoal)) {
    return { ok: false, error: 'ID Soal "' + idSoal + '" sudah dipakai. Gunakan ID lain.' };
  }

  sheet.appendRow([
    idSoal, kodeMapel, jenis, pertanyaan,
    data.Opsi_A || '', data.Opsi_B || '', data.Opsi_C || '', data.Opsi_D || '', data.Opsi_E || '',
    data.Kunci || '', bobot
  ]);
  return { ok: true };
}

function editSoal(sessionToken, idSoal, data) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_SOAL);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const colId = headers.indexOf('ID_Soal');

  const idBersih = String(idSoal).trim();
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colId]).trim() === idBersih) { rowIndex = i; break; }
  }
  if (rowIndex === -1) {
    return { ok: false, error: 'Soal dengan ID "' + idSoal + '" tidak ditemukan.' };
  }

  const kolomBisaDiubah = ['Kode_Mapel', 'Jenis', 'Pertanyaan', 'Opsi_A', 'Opsi_B', 'Opsi_C', 'Opsi_D', 'Opsi_E', 'Kunci', 'Bobot'];
  kolomBisaDiubah.forEach(kolom => {
    if (data[kolom] !== undefined) {
      const colIndex = headers.indexOf(kolom);
      sheet.getRange(rowIndex + 1, colIndex + 1).setValue(data[kolom]);
    }
  });

  return { ok: true };
}

function deleteSoal(sessionToken, idSoal) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_SOAL);
  const values = sheet.getDataRange().getValues();
  const colId = values[0].indexOf('ID_Soal');
  const idBersih = String(idSoal).trim();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colId]).trim() === idBersih) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Soal dengan ID "' + idSoal + '" tidak ditemukan.' };
}

/**
 * Import banyak soal sekaligus dari Excel. Baris dengan ID_Soal yang
 * sudah ada akan DILEWATI (tidak menimpa).
 */
function importSoalBatch(sessionToken, daftarSoal) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }
  if (!Array.isArray(daftarSoal) || daftarSoal.length === 0) {
    return { ok: false, error: 'Tidak ada data untuk diimport.' };
  }

  const sheet = getSheet(SHEET_SOAL);
  const existing = sheetToObjects(sheet);
  const idTerdaftar = new Set(existing.map(s => String(s.ID_Soal).trim()));

  const barisBaru = [];
  const dilewati = [];

  daftarSoal.forEach(row => {
    const idSoal = String(row.ID_Soal || '').trim();
    const kodeMapel = String(row.Kode_Mapel || '').trim();
    const jenis = String(row.Jenis || '').trim();
    const pertanyaan = String(row.Pertanyaan || '').trim();
    const bobot = Number(row.Bobot) || 0;

    if (!idSoal || !kodeMapel || !jenis || !pertanyaan || !bobot) {
      dilewati.push({ id: idSoal || '(kosong)', alasan: 'Data tidak lengkap' });
      return;
    }
    if (idTerdaftar.has(idSoal)) {
      dilewati.push({ id: idSoal, alasan: 'ID Soal sudah ada' });
      return;
    }

    barisBaru.push([
      idSoal, kodeMapel, jenis, pertanyaan,
      row.Opsi_A || '', row.Opsi_B || '', row.Opsi_C || '', row.Opsi_D || '', row.Opsi_E || '',
      row.Kunci || '', bobot
    ]);
    idTerdaftar.add(idSoal);
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
