/**
 * ============================================================
 * MATERI.GS — Ringkasan Kelas & Mapel + Kelola Materi (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Kelas & Kode_Mapel tidak punya tabel master sendiri -- keduanya
 * cukup teks bebas di DB_Siswa dan DB_Soal. Jadi "manajemen kelas
 * & mapel" di sini berupa RINGKASAN yang dihitung otomatis dari
 * data yang sudah ada (jumlah siswa per kelas, jumlah soal per
 * mapel), bukan tabel master terpisah.
 *
 * Materi pembelajaran (link Google Drive dkk) baru fitur yang
 * benar-benar butuh data baru -> disimpan di sheet DB_Materi.
 * ============================================================
 */

function getRingkasanKelasMapel(sessionToken) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const siswaList = sheetToObjects(getSheet(SHEET_SISWA));
  const soalList = sheetToObjects(getSheet(SHEET_SOAL));

  const kelasMap = {};
  siswaList.forEach(s => {
    const k = s.Kelas || '(tanpa kelas)';
    kelasMap[k] = (kelasMap[k] || 0) + 1;
  });

  const mapelMap = {};
  soalList.forEach(s => {
    const m = s.Kode_Mapel || '(tanpa mapel)';
    mapelMap[m] = (mapelMap[m] || 0) + 1;
  });

  const ringkasanKelas = Object.keys(kelasMap).sort().map(k => ({ kelas: k, jumlah_siswa: kelasMap[k] }));
  const ringkasanMapel = Object.keys(mapelMap).sort().map(m => ({ mapel: m, jumlah_soal: mapelMap[m] }));

  return { ok: true, kelas: ringkasanKelas, mapel: ringkasanMapel };
}

function getMateriList(sessionToken) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }
  const materiList = sheetToObjects(getSheet(SHEET_MATERI));
  return { ok: true, materi: materiList };
}

function addMateri(sessionToken, data) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const judul = String(data.Judul || '').trim();
  const link = String(data.Link || '').trim();
  const kodeMapel = String(data.Kode_Mapel || '').trim();
  const kelas = String(data.Kelas || '').trim();

  if (!judul || !link || !kodeMapel || !kelas) {
    return { ok: false, error: 'Judul, Link, Kode Mapel, dan Kelas wajib diisi.' };
  }

  const sheet = getSheet(SHEET_MATERI);
  const idMateri = 'MAT-' + new Date().getTime();
  sheet.appendRow([idMateri, kodeMapel, kelas, judul, link, new Date()]);
  return { ok: true };
}

function deleteMateri(sessionToken, idMateri) {
  if (!validasiSesiAdmin(sessionToken)) {
    return { ok: false, error: 'Sesi admin tidak valid atau sudah kedaluwarsa. Silakan login ulang.' };
  }

  const sheet = getSheet(SHEET_MATERI);
  const values = sheet.getDataRange().getValues();
  const colId = values[0].indexOf('ID_Materi');
  const idBersih = String(idMateri).trim();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colId]).trim() === idBersih) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Materi tidak ditemukan.' };
}
