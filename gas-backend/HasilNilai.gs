/**
 * ============================================================
 * HASILNILAI.GS — Rekap Nilai & Analisis Butir Soal (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 */

/**
 * Rekap nilai untuk 1 sesi ujian, digabung dengan nama & kelas siswa.
 */
function getHasilNilai(sessionToken, idUjian) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  const siswaMap = {};
  siswaList.forEach(s => { siswaMap[s.NISN] = s; });

  const hasilList = sheetToObjects(getSheet(SHEET_HASIL)).filter(h => h.ID_Ujian === idUjian);

  const gabungan = hasilList.map(h => ({
    ID_Hasil: h.ID_Hasil,
    NISN: h.NISN,
    Nama_Siswa: siswaMap[h.NISN] ? siswaMap[h.NISN].Nama_Siswa : '(tidak ditemukan)',
    Kelas: siswaMap[h.NISN] ? siswaMap[h.NISN].Kelas : '-',
    Jawaban_Uraian: h.Jawaban_Uraian,
    Skor_PG: h.Skor_PG,
    Skor_Uraian: h.Skor_Uraian,
    Total_Nilai: h.Total_Nilai,
    Status_Submit: h.Status_Submit,
    Violations: h.Violations,
  }));

  return { ok: true, hasil: gabungan };
}

/**
 * Admin input/koreksi skor Uraian (1 angka total untuk semua soal
 * Uraian di ujian itu -- sesuai skema DB_Hasil yang sudah ada).
 * Total_Nilai otomatis dihitung ulang = Skor_PG + Skor_Uraian.
 */
function updateSkorUraian(sessionToken, idHasil, skorUraian) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_HASIL);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colId = headers.indexOf('ID_Hasil');
  const colSkorPG = headers.indexOf('Skor_PG');
  const colSkorUraian = headers.indexOf('Skor_Uraian');
  const colTotal = headers.indexOf('Total_Nilai');

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][colId] === idHasil) { rowIndex = i; break; }
  }
  if (rowIndex === -1) {
    return { ok: false, error: 'Data hasil tidak ditemukan.' };
  }

  const skorUraianAngka = Number(skorUraian) || 0;
  const skorPG = Number(data[rowIndex][colSkorPG]) || 0;
  const totalBaru = skorPG + skorUraianAngka;

  sheet.getRange(rowIndex + 1, colSkorUraian + 1).setValue(skorUraianAngka);
  sheet.getRange(rowIndex + 1, colTotal + 1).setValue(totalBaru);

  return { ok: true, total_nilai: totalBaru };
}

/**
 * Analisis butir soal: untuk tiap soal PG, hitung berapa % siswa
 * menjawab benar -- dipakai guru melihat soal mana yang terlalu
 * mudah/sulit atau mungkin kuncinya keliru.
 */
function getAnalisisButirSoal(sessionToken, idUjian, kodeMapel) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const soalList = sheetToObjects(getSheet(SHEET_SOAL)).filter(s => s.Kode_Mapel === kodeMapel && s.Jenis === 'PG');
  const hasilList = sheetToObjects(getSheet(SHEET_HASIL)).filter(h => h.ID_Ujian === idUjian && h.Status_Submit !== 'Autosave');

  const totalSiswa = hasilList.length;

  const analisis = soalList.map(soal => {
    let jumlahBenar = 0;
    hasilList.forEach(h => {
      try {
        const jawabanPG = JSON.parse(h.Jawaban_PG || '{}');
        if (jawabanPG[soal.ID_Soal] && String(jawabanPG[soal.ID_Soal]).toUpperCase() === String(soal.Kunci).toUpperCase()) {
          jumlahBenar++;
        }
      } catch (e) { /* lewati kalau JSON rusak */ }
    });

    const persen = totalSiswa > 0 ? Math.round((jumlahBenar / totalSiswa) * 100) : 0;
    return {
      ID_Soal: soal.ID_Soal,
      Pertanyaan: soal.Pertanyaan,
      jumlah_benar: jumlahBenar,
      total_siswa: totalSiswa,
      persen_benar: persen,
    };
  });

  return { ok: true, analisis };
}
