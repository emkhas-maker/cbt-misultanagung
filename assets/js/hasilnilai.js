/**
 * ============================================================
 * HASILNILAI.JS — Modul Hasil Nilai (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 */

const HasilNilaiModule = {
  ujianList: [],
  ujianDipilih: '',
  data: [],

  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderShell();
    this.bindEvents();

    const hasilUjian = await Api.post('getUjianListAdmin', { session_token: Auth.getAdminToken() });
    if (hasilUjian.ok && hasilUjian.ujian.length > 0) {
      this.ujianList = hasilUjian.ujian;
      document.getElementById('hasil-pilih-ujian').innerHTML = this.ujianList.map(u =>
        `<option value="${escapeHtml(u.ID_Ujian)}" data-mapel="${escapeHtml(u.Kode_Mapel)}">${escapeHtml(u.Nama_Ujian)}</option>`
      ).join('');
      this.ujianDipilih = this.ujianList[0].ID_Ujian;
      await this.muatSemua();
    } else {
      document.getElementById('hasil-tbody').innerHTML = `<tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Belum ada sesi ujian.</td></tr>`;
    }
  },

  renderShell() {
    return `
      <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <label class="text-sm text-ink/60">Ujian:</label>
          <select id="hasil-pilih-ujian" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"></select>
        </div>
        <button id="btn-export-excel" class="text-sm font-semibold px-3.5 py-2 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">
          Export ke Excel
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">Nama</th>
                <th class="px-4 py-3 font-semibold">Kelas</th>
                <th class="px-4 py-3 font-semibold">Skor PG</th>
                <th class="px-4 py-3 font-semibold">Skor Uraian</th>
                <th class="px-4 py-3 font-semibold">Total</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="hasil-tbody"><tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>

      <h3 class="font-display font-bold text-ink mb-3">Analisis Butir Soal</h3>
      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">Soal</th>
                <th class="px-4 py-3 font-semibold">Benar / Total</th>
                <th class="px-4 py-3 font-semibold w-1/3">Tingkat Kebenaran</th>
              </tr>
            </thead>
            <tbody id="analisis-tbody"><tr><td colspan="3" class="text-center text-sm text-ink/40 py-8">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>

      <!-- Modal Koreksi Uraian -->
      <div id="modal-koreksi" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="font-display font-bold text-lg text-ink mb-1">Koreksi Jawaban Uraian</h3>
          <p id="koreksi-nama-siswa" class="text-sm text-ink/50 mb-4"></p>
          <div id="koreksi-daftar-jawaban" class="space-y-3 mb-5"></div>
          <div>
            <label class="block text-xs font-semibold text-ink/70 mb-1">Skor Uraian (total semua soal Uraian)</label>
            <input id="koreksi-skor-uraian" type="number" min="0" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
          </div>
          <div class="flex gap-2 pt-4">
            <button type="button" id="btn-batal-koreksi" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
            <button type="button" id="btn-simpan-koreksi" class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Simpan</button>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('hasil-pilih-ujian').addEventListener('change', async (e) => {
      this.ujianDipilih = e.target.value;
      await this.muatSemua();
    });
    document.getElementById('btn-export-excel').addEventListener('click', () => this.exportExcel());
    document.getElementById('btn-batal-koreksi').addEventListener('click', () => {
      document.getElementById('modal-koreksi').style.display = 'none';
    });
    document.getElementById('btn-simpan-koreksi').addEventListener('click', () => this.simpanKoreksi());
  },

  async muatSemua() {
    const sessionToken = Auth.getAdminToken();
    const kodeMapel = document.getElementById('hasil-pilih-ujian').selectedOptions[0]?.dataset.mapel || '';

    const [hasilNilai, hasilAnalisis] = await Promise.all([
      Api.post('getHasilNilai', { session_token: sessionToken, id_ujian: this.ujianDipilih }),
      Api.post('getAnalisisButirSoal', { session_token: sessionToken, id_ujian: this.ujianDipilih, kode_mapel: kodeMapel }),
    ]);

    if (hasilNilai.ok) {
      this.data = hasilNilai.hasil;
      this.renderTabel();
    }
    if (hasilAnalisis.ok) {
      this.renderAnalisis(hasilAnalisis.analisis);
    }
  },

  renderTabel() {
    const tbody = document.getElementById('hasil-tbody');
    if (this.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Belum ada siswa yang mengerjakan ujian ini.</td></tr>`;
      return;
    }
    tbody.innerHTML = this.data.map(h => `
      <tr class="border-t border-black/5">
        <td class="px-4 py-2.5">${escapeHtml(h.Nama_Siswa)}</td>
        <td class="px-4 py-2.5">${escapeHtml(h.Kelas)}</td>
        <td class="px-4 py-2.5">${h.Skor_PG}</td>
        <td class="px-4 py-2.5">${h.Skor_Uraian === '' || h.Skor_Uraian === undefined ? '<span class="text-amber-500 font-semibold">Belum dikoreksi</span>' : h.Skor_Uraian}</td>
        <td class="px-4 py-2.5 font-semibold">${h.Total_Nilai}</td>
        <td class="px-4 py-2.5">${statusUjianBadge(h.Status_Submit === 'Submitted' ? 'Selesai' : h.Status_Submit === 'Force Submitted' ? 'Selesai' : 'Sedang Mengerjakan')}</td>
        <td class="px-4 py-2.5 text-right">
          <button data-id="${escapeHtml(h.ID_Hasil)}" class="btn-koreksi text-xs font-semibold text-teal-600 hover:underline">Koreksi Uraian</button>
        </td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.btn-koreksi').forEach(btn => btn.addEventListener('click', () => this.bukaKoreksi(btn.dataset.id)));
  },

  renderAnalisis(analisis) {
    const tbody = document.getElementById('analisis-tbody');
    if (!analisis || analisis.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-sm text-ink/40 py-8">Belum ada soal PG untuk dianalisis.</td></tr>`;
      return;
    }
    tbody.innerHTML = analisis.map(a => {
      const warna = a.persen_benar >= 70 ? 'bg-teal-500' : a.persen_benar >= 40 ? 'bg-amber-400' : 'bg-brick-400';
      return `
        <tr class="border-t border-black/5">
          <td class="px-4 py-2.5 max-w-md">${escapeHtml(a.ID_Soal)} — ${escapeHtml(pisahkanGambar(a.Pertanyaan).teks.slice(0, 60))}</td>
          <td class="px-4 py-2.5 text-xs">${a.jumlah_benar} / ${a.total_siswa}</td>
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 bg-black/5 rounded-full overflow-hidden"><div class="${warna} h-full" style="width:${a.persen_benar}%"></div></div>
              <span class="text-xs font-semibold w-10 text-right">${a.persen_benar}%</span>
            </div>
          </td>
        </tr>`;
    }).join('');
  },

  bukaKoreksi(idHasil) {
    const h = this.data.find(x => x.ID_Hasil === idHasil);
    if (!h) return;

    document.getElementById('koreksi-nama-siswa').textContent = `${h.Nama_Siswa} — ${h.Kelas}`;
    document.getElementById('koreksi-skor-uraian').value = h.Skor_Uraian || 0;
    document.getElementById('koreksi-skor-uraian').dataset.idHasil = idHasil;

    let jawabanUraian = {};
    try { jawabanUraian = JSON.parse(h.Jawaban_Uraian || '{}'); } catch (e) {}

    const daftarEl = document.getElementById('koreksi-daftar-jawaban');
    const entries = Object.entries(jawabanUraian);
    daftarEl.innerHTML = entries.length === 0
      ? '<p class="text-sm text-ink/40">Tidak ada jawaban Uraian.</p>'
      : entries.map(([idSoal, jawaban]) => `
          <div class="bg-black/[0.03] rounded-lg p-3">
            <p class="text-xs font-semibold text-ink/50 mb-1">${escapeHtml(idSoal)}</p>
            <p class="text-sm text-ink">${escapeHtml(jawaban) || '<span class="text-ink/30">(kosong)</span>'}</p>
          </div>
        `).join('');

    document.getElementById('modal-koreksi').style.display = 'flex';
  },

  async simpanKoreksi() {
    const input = document.getElementById('koreksi-skor-uraian');
    const idHasil = input.dataset.idHasil;
    const skor = input.value;
    const btn = document.getElementById('btn-simpan-koreksi');

    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const hasil = await Api.post('updateSkorUraian', { session_token: Auth.getAdminToken(), id_hasil: idHasil, skor_uraian: skor });

    btn.disabled = false;
    btn.textContent = 'Simpan';

    if (!hasil.ok) { alert(hasil.error || 'Gagal menyimpan.'); return; }

    document.getElementById('modal-koreksi').style.display = 'none';
    await this.muatSemua();
  },

  exportExcel() {
    if (this.data.length === 0) { alert('Tidak ada data untuk diexport.'); return; }

    const namaUjian = document.getElementById('hasil-pilih-ujian').selectedOptions[0]?.textContent || 'Hasil Ujian';
    const rows = this.data.map(h => ({
      NISN: h.NISN,
      'Nama Siswa': h.Nama_Siswa,
      Kelas: h.Kelas,
      'Skor PG': h.Skor_PG,
      'Skor Uraian': h.Skor_Uraian,
      'Total Nilai': h.Total_Nilai,
      Status: h.Status_Submit,
      Pelanggaran: h.Violations,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Nilai');
    XLSX.writeFile(wb, `Hasil_${namaUjian.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  },
};
