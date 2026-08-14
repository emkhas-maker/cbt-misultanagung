/**
 * ============================================================
 * RANDOMIZER.JS — Pengacakan Urutan Soal & Opsi Jawaban
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Diacak SEKALI per sesi (per ID_Ujian + NISN), disimpan di
 * sessionStorage supaya urutannya TETAP SAMA kalau halaman
 * di-refresh di tengah ujian (tidak berubah-ubah membingungkan
 * siswa), tapi beda lagi kalau login ujian baru.
 *
 * PENTING soal skor: saat opsi PG diacak, kita TIDAK mengubah
 * huruf kunci di database. Yang berubah cuma URUTAN TAMPIL.
 * Setiap opsi tetap "ingat" huruf aslinya (A/B/C/D/E), dan itu
 * yang dikirim ke server saat submit -- jadi penilaian di backend
 * (Scoring.gs) tidak perlu tahu soal pengacakan ini sama sekali.
 * ============================================================
 */

const Randomizer = {
  ambilUrutan(idUjian, nisn, soalList) {
    const key = `cbt_random_${idUjian}_${nisn}`;
    const tersimpan = sessionStorage.getItem(key);
    if (tersimpan) return JSON.parse(tersimpan);

    const urutanSoal = shuffleArray(soalList.map(s => s.ID_Soal));

    const opsiMap = {};
    soalList.forEach(s => {
      if (s.Jenis === 'PG') {
        const hurufTerisi = ['A', 'B', 'C', 'D', 'E'].filter(h => s['Opsi_' + h]);
        opsiMap[s.ID_Soal] = shuffleArray(hurufTerisi);
      }
    });

    const hasil = { urutanSoal, opsiMap };
    sessionStorage.setItem(key, JSON.stringify(hasil));
    return hasil;
  },
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
