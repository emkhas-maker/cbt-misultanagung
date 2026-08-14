/**
 * ============================================================
 * MONITORING.GS — Pantau Status Ujian Real-time (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 */

/**
 * Gabungkan data DB_Siswa (status umum) dengan DB_Hasil (progres di
 * ujian tertentu) supaya admin bisa lihat status tiap siswa untuk
 * SATU sesi ujian yang dipilih.
 */
function getMonitoringData(sessionToken, idUjian) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  const hasilList = sheetToObjects(getSheet(SHEET_HASIL)).filter(h => h.ID_Ujian === idUjian);

  const hasilMap = {};
  hasilList.forEach(h => { hasilMap[h.NISN] = h; });

  const gabungan = siswaList.map(s => {
    const h = hasilMap[s.NISN];
    return {
      NISN: s.NISN,
      Nama_Siswa: s.Nama_Siswa,
      Kelas: s.Kelas,
      Status_Ujian: s.Status_Ujian,
      Violations: h ? h.Violations : 0,
      Status_Submit: h ? h.Status_Submit : '-',
      Total_Nilai: h ? h.Total_Nilai : '-',
      Last_Autosave: h ? h.Last_Autosave : '-',
    };
  });

  return { ok: true, data: gabungan };
}

/**
 * Admin memaksa submit jawaban siswa yang macet/bermasalah,
 * memakai jawaban terakhir yang sempat ter-autosave.
 */
function forceSubmitSiswaAdmin(sessionToken, nisn, idUjian) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const hasilList = sheetToObjects(getSheet(SHEET_HASIL));
  const existing = hasilList.find(h => h.NISN === nisn && h.ID_Ujian === idUjian);

  const jawabanPG = existing && existing.Jawaban_PG ? JSON.parse(existing.Jawaban_PG) : {};
  const jawabanUraian = existing && existing.Jawaban_Uraian ? JSON.parse(existing.Jawaban_Uraian) : {};
  const violations = existing ? existing.Violations : 0;

  // Pakai token siswa yang sebenarnya supaya validateToken() di submitJawaban lolos
  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  const siswa = siswaList.find(s => s.NISN === nisn);
  if (!siswa) return { ok: false, error: 'Siswa tidak ditemukan.' };

  return submitJawaban(nisn, siswa.Token_Ujian, idUjian, jawabanPG, jawabanUraian, violations, 'Force Submitted');
}

/**
 * Reset status siswa kembali ke "Belum Mulai" -- dipakai kalau ada
 * kendala teknis (device error, listrik mati, dll). Hanya boleh
 * dilakukan kalau siswa BELUM submit final (submitted/force submitted),
 * supaya tidak disalahgunakan untuk mengulang ujian yang sudah selesai.
 */
function resetLoginSiswaAdmin(sessionToken, nisn, idUjian) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheetHasil = getSheet(SHEET_HASIL);
  const dataHasil = sheetHasil.getDataRange().getValues();
  const headersHasil = dataHasil[0];
  const colNisn = headersHasil.indexOf('NISN');
  const colIdUjian = headersHasil.indexOf('ID_Ujian');
  const colStatusSubmit = headersHasil.indexOf('Status_Submit');

  let rowIndex = -1;
  for (let i = 1; i < dataHasil.length; i++) {
    if (dataHasil[i][colNisn] === nisn && dataHasil[i][colIdUjian] === idUjian) { rowIndex = i; break; }
  }

  if (rowIndex !== -1) {
    const statusSekarang = dataHasil[rowIndex][colStatusSubmit];
    if (statusSekarang === 'Submitted' || statusSekarang === 'Force Submitted') {
      return { ok: false, error: 'Siswa ini sudah menyelesaikan ujian secara final. Reset tidak diizinkan untuk mencegah ujian diulang.' };
    }
    sheetHasil.deleteRow(rowIndex + 1); // hapus progres autosave, mulai bersih
  }

  updateStatusUjianSiswa(nisn, 'Belum Mulai');
  return { ok: true };
}
