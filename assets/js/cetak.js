/**
 * ============================================================
 * CETAK.JS — Generator Dokumen Cetak
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 * Kartu Peserta Ujian (A4), Daftar Hadir, dan Berita Acara Ujian.
 * Semua dirender ke #print-container (tersembunyi normal, cuma
 * tampil saat window.print() lewat CSS @media print di style.css).
 * ============================================================
 */

const NAMA_SEKOLAH = 'MI SULTAN AGUNG';
const ALAMAT_SEKOLAH = 'Depok, Sleman, Yogyakarta';

const Cetak = {
  /**
   * Kartu Peserta -- 1 kartu per siswa, disusun grid untuk cetak A4.
   * @param {Array} daftarSiswa - [{NISN, Nama_Siswa, Kelas, Token_Ujian}]
   * @param {string} namaUjian
   */
  kartuPeserta(daftarSiswa, namaUjian) {
    const kartuHtml = daftarSiswa.map(s => `
      <div class="kartu-peserta">
        <div class="kartu-header">
          <p class="kartu-sekolah">${escapeHtml(NAMA_SEKOLAH)}</p>
          <p class="kartu-label">KARTU PESERTA UJIAN</p>
        </div>
        <div class="kartu-body">
          <table class="kartu-tabel">
            <tr><td>Nama</td><td>: ${escapeHtml(s.Nama_Siswa)}</td></tr>
            <tr><td>NISN</td><td>: ${escapeHtml(s.NISN)}</td></tr>
            <tr><td>Kelas</td><td>: ${escapeHtml(s.Kelas)}</td></tr>
            <tr><td>Ujian</td><td>: ${escapeHtml(namaUjian)}</td></tr>
          </table>
          <div class="kartu-token">
            <p class="kartu-token-label">TOKEN UJIAN</p>
            <p class="kartu-token-value">${escapeHtml(s.Token_Ujian || '-')}</p>
          </div>
        </div>
        <div class="kartu-footer">
          <div><p>Panitia Ujian</p><div class="ttd-space"></div><p>(_______________)</p></div>
        </div>
      </div>
    `).join('');

    this._render(`<div class="grid-kartu">${kartuHtml}</div>`);
  },

  /**
   * Daftar Hadir -- tabel presensi untuk 1 sesi ujian.
   * @param {Array} daftarSiswa
   * @param {string} namaUjian
   * @param {string} tanggal
   */
  daftarHadir(daftarSiswa, namaUjian, tanggal) {
    const barisTabel = daftarSiswa.map((s, i) => `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${escapeHtml(s.NISN)}</td>
        <td>${escapeHtml(s.Nama_Siswa)}</td>
        <td class="text-center">${escapeHtml(s.Kelas)}</td>
        <td class="ttd-cell"></td>
      </tr>
    `).join('');

    this._render(`
      <div class="dok-cetak">
        <div class="kop-surat">
          <p class="kop-sekolah">${escapeHtml(NAMA_SEKOLAH)}</p>
          <p class="kop-alamat">${escapeHtml(ALAMAT_SEKOLAH)}</p>
        </div>
        <hr class="kop-garis">
        <h2 class="dok-judul">DAFTAR HADIR PESERTA UJIAN</h2>
        <table class="dok-info">
          <tr><td>Nama Ujian</td><td>: ${escapeHtml(namaUjian)}</td></tr>
          <tr><td>Tanggal</td><td>: ${escapeHtml(tanggal)}</td></tr>
          <tr><td>Jumlah Peserta</td><td>: ${daftarSiswa.length} siswa</td></tr>
        </table>
        <table class="dok-tabel">
          <thead>
            <tr><th>No</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>Tanda Tangan</th></tr>
          </thead>
          <tbody>${barisTabel}</tbody>
        </table>
        <div class="dok-ttd-panitia">
          <div><p>Mengetahui,</p><p>Kepala Madrasah</p><div class="ttd-space"></div><p>(_______________)</p></div>
          <div><p>${escapeHtml(ALAMAT_SEKOLAH.split(',').pop().trim())}, ${escapeHtml(tanggal)}</p><p>Panitia Ujian</p><div class="ttd-space"></div><p>(_______________)</p></div>
        </div>
      </div>
    `);
  },

  /**
   * Berita Acara -- dokumen resmi pelaksanaan ujian.
   */
  beritaAcara(dataUjian, jumlahSiswa, jumlahHadir, tanggal) {
    this._render(`
      <div class="dok-cetak">
        <div class="kop-surat">
          <p class="kop-sekolah">${escapeHtml(NAMA_SEKOLAH)}</p>
          <p class="kop-alamat">${escapeHtml(ALAMAT_SEKOLAH)}</p>
        </div>
        <hr class="kop-garis">
        <h2 class="dok-judul">BERITA ACARA PELAKSANAAN UJIAN</h2>

        <p class="dok-paragraf">
          Pada hari ini, tanggal ${escapeHtml(tanggal)}, telah dilaksanakan ujian
          <strong>${escapeHtml(dataUjian.Nama_Ujian)}</strong> dengan rincian sebagai berikut:
        </p>

        <table class="dok-info">
          <tr><td>Mata Pelajaran</td><td>: ${escapeHtml(dataUjian.Kode_Mapel)}</td></tr>
          <tr><td>Durasi</td><td>: ${escapeHtml(String(dataUjian.Waktu_Menit))} menit</td></tr>
          <tr><td>Jumlah Peserta Terdaftar</td><td>: ${jumlahSiswa} siswa</td></tr>
          <tr><td>Jumlah Peserta Hadir</td><td>: ${jumlahHadir} siswa</td></tr>
          <tr><td>Sistem Ujian</td><td>: Computer-Based Test (CBT)</td></tr>
        </table>

        <p class="dok-paragraf">
          Ujian berlangsung dengan tertib dan lancar. Demikian berita acara ini dibuat
          dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.
        </p>

        <div class="dok-ttd-panitia">
          <div><p>Pengawas Ujian</p><div class="ttd-space"></div><p>(_______________)</p></div>
          <div><p>${escapeHtml(ALAMAT_SEKOLAH.split(',').pop().trim())}, ${escapeHtml(tanggal)}</p><p>Kepala Madrasah</p><div class="ttd-space"></div><p>(_______________)</p></div>
        </div>
      </div>
    `);
  },

  _render(html) {
    document.getElementById('print-container').innerHTML = html;
    setTimeout(() => window.print(), 150);
  },
};
