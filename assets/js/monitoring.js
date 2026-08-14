/**
 * ============================================================
 * MONITORING.JS — Modul Monitoring Ujian (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 */

const MonitoringModule = {
  ujianList: [],
  ujianDipilih: '',
  data: [],
  _pollInterval: null,

  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderShell();
    this.bindEvents();

    const hasilUjian = await Api.post('getUjianListAdmin', { session_token: Auth.getAdminToken() });
    if (hasilUjian.ok && hasilUjian.ujian.length > 0) {
      this.ujianList = hasilUjian.ujian;
      const opts = this.ujianList.map(u => `<option value="${escapeHtml(u.ID_Ujian)}">${escapeHtml(u.Nama_Ujian)} ${u.Status === 'Aktif' ? '🟢' : ''}</option>`).join('');
      document.getElementById('monitoring-pilih-ujian').innerHTML = opts;

      const aktif = this.ujianList.find(u => u.Status === 'Aktif');
      this.ujianDipilih = aktif ? aktif.ID_Ujian : this.ujianList[0].ID_Ujian;
      document.getElementById('monitoring-pilih-ujian').value = this.ujianDipilih;

      await this.muatData();
      this.mulaiPolling();
    } else {
      document.getElementById('monitoring-tbody').innerHTML = `<tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Belum ada sesi ujian dibuat.</td></tr>`;
    }
  },

  renderShell() {
    return `
      <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <label class="text-sm text-ink/60">Pantau ujian:</label>
          <select id="monitoring-pilih-ujian" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"></select>
        </div>
        <p id="monitoring-info" class="text-xs text-ink/40">Diperbarui otomatis setiap 10 detik</p>
      </div>

      <div class="flex justify-end gap-2 mb-4">
        <button id="btn-cetak-daftar-hadir" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">Cetak Daftar Hadir</button>
        <button id="btn-cetak-berita-acara" class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">Cetak Berita Acara</button>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div class="stat-card"><p class="text-xs font-semibold text-ink/50 uppercase">Belum Mulai</p><p id="ringkas-belum" class="font-display font-extrabold text-2xl mt-1">-</p></div>
        <div class="stat-card"><p class="text-xs font-semibold text-ink/50 uppercase">Mengerjakan</p><p id="ringkas-mengerjakan" class="font-display font-extrabold text-2xl mt-1 text-amber-500">-</p></div>
        <div class="stat-card"><p class="text-xs font-semibold text-ink/50 uppercase">Melanggar</p><p id="ringkas-melanggar" class="font-display font-extrabold text-2xl mt-1 text-brick-500">-</p></div>
        <div class="stat-card"><p class="text-xs font-semibold text-ink/50 uppercase">Selesai</p><p id="ringkas-selesai" class="font-display font-extrabold text-2xl mt-1 text-teal-600">-</p></div>
      </div>

      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">Nama</th>
                <th class="px-4 py-3 font-semibold">Kelas</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 font-semibold">Pelanggaran</th>
                <th class="px-4 py-3 font-semibold">Nilai</th>
                <th class="px-4 py-3 font-semibold">Autosave Terakhir</th>
                <th class="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="monitoring-tbody"><tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Memuat...</td></tr></tbody>
          </table>
        </div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('monitoring-pilih-ujian').addEventListener('change', async (e) => {
      this.ujianDipilih = e.target.value;
      await this.muatData();
    });
    document.getElementById('btn-cetak-daftar-hadir').addEventListener('click', () => this.cetakDaftarHadir());
    document.getElementById('btn-cetak-berita-acara').addEventListener('click', () => this.cetakBeritaAcara());
  },

  cetakDaftarHadir() {
    if (this.data.length === 0) { alert('Belum ada data siswa untuk dicetak.'); return; }
    const ujian = this.ujianList.find(u => u.ID_Ujian === this.ujianDipilih);
    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    Cetak.daftarHadir(this.data, ujian ? ujian.Nama_Ujian : 'Ujian', tanggal);
  },

  cetakBeritaAcara() {
    const ujian = this.ujianList.find(u => u.ID_Ujian === this.ujianDipilih);
    if (!ujian) { alert('Data ujian tidak ditemukan.'); return; }
    const jumlahHadir = this.data.filter(d => d.Status_Ujian !== 'Belum Mulai').length;
    const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    Cetak.beritaAcara(ujian, this.data.length, jumlahHadir, tanggal);
  },

  mulaiPolling() {
    if (this._pollInterval) clearInterval(this._pollInterval);
    this._pollInterval = setInterval(() => this.muatData(true), 10000);
  },

  berhentiPolling() {
    if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
  },

  async muatData(silent = false) {
    if (!silent) document.getElementById('monitoring-tbody').innerHTML = `<tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Memuat...</td></tr>`;

    const hasil = await Api.post('getMonitoringData', { session_token: Auth.getAdminToken(), id_ujian: this.ujianDipilih });
    if (!hasil.ok) {
      document.getElementById('monitoring-tbody').innerHTML = `<tr><td colspan="7" class="text-center text-sm text-brick-500 py-8">${escapeHtml(hasil.error)}</td></tr>`;
      return;
    }

    this.data = hasil.data;
    this.renderRingkasan();
    this.renderTabel();
  },

  renderRingkasan() {
    const hitung = (status) => this.data.filter(d => d.Status_Ujian === status).length;
    document.getElementById('ringkas-belum').textContent = hitung('Belum Mulai');
    document.getElementById('ringkas-mengerjakan').textContent = hitung('Sedang Mengerjakan');
    document.getElementById('ringkas-melanggar').textContent = hitung('Terdeteksi Melanggar');
    document.getElementById('ringkas-selesai').textContent = hitung('Selesai');
  },

  renderTabel() {
    const tbody = document.getElementById('monitoring-tbody');
    if (this.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-sm text-ink/40 py-8">Belum ada data siswa.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.data.map(d => `
      <tr class="border-t border-black/5">
        <td class="px-4 py-2.5">${escapeHtml(d.Nama_Siswa)}</td>
        <td class="px-4 py-2.5">${escapeHtml(d.Kelas)}</td>
        <td class="px-4 py-2.5">${statusUjianBadge(d.Status_Ujian)}</td>
        <td class="px-4 py-2.5">${d.Violations > 0 ? `<span class="text-brick-500 font-semibold">${d.Violations}x</span>` : '-'}</td>
        <td class="px-4 py-2.5">${d.Total_Nilai}</td>
        <td class="px-4 py-2.5 text-xs text-ink/50">${formatWaktuSingkat(d.Last_Autosave)}</td>
        <td class="px-4 py-2.5 text-right whitespace-nowrap">
          ${d.Status_Ujian === 'Sedang Mengerjakan' || d.Status_Ujian === 'Terdeteksi Melanggar'
            ? `<button data-aksi="force" data-nisn="${escapeHtml(d.NISN)}" class="text-xs font-semibold text-brick-500 hover:underline mr-3">Force Submit</button>`
            : ''}
          ${d.Status_Ujian !== 'Selesai'
            ? `<button data-aksi="reset" data-nisn="${escapeHtml(d.NISN)}" class="text-xs font-semibold text-teal-600 hover:underline">Reset Login</button>`
            : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-aksi=force]').forEach(btn => btn.addEventListener('click', () => this.forceSubmit(btn.dataset.nisn)));
    tbody.querySelectorAll('[data-aksi=reset]').forEach(btn => btn.addEventListener('click', () => this.resetLogin(btn.dataset.nisn)));
  },

  async forceSubmit(nisn) {
    const siswa = this.data.find(d => d.NISN === nisn);
    if (!confirm(`Paksa kumpulkan jawaban ${siswa ? siswa.Nama_Siswa : nisn} sekarang? Dipakai kalau siswa mengalami kendala teknis.`)) return;
    const hasil = await Api.post('forceSubmitSiswaAdmin', { session_token: Auth.getAdminToken(), nisn, id_ujian: this.ujianDipilih });
    if (!hasil.ok) { alert(hasil.error || 'Gagal force submit.'); return; }
    await this.muatData();
  },

  async resetLogin(nisn) {
    const siswa = this.data.find(d => d.NISN === nisn);
    if (!confirm(`Reset status ${siswa ? siswa.Nama_Siswa : nisn} kembali ke "Belum Mulai"? Progres yang belum final akan dihapus.`)) return;
    const hasil = await Api.post('resetLoginSiswaAdmin', { session_token: Auth.getAdminToken(), nisn, id_ujian: this.ujianDipilih });
    if (!hasil.ok) { alert(hasil.error || 'Gagal reset.'); return; }
    await this.muatData();
  },
};

function statusUjianBadge(status) {
  const warna = {
    'Belum Mulai': 'bg-black/5 text-ink/60',
    'Sedang Mengerjakan': 'bg-amber-400/20 text-amber-500',
    'Terdeteksi Melanggar': 'bg-brick-400/20 text-brick-500',
    'Selesai': 'bg-teal-100 text-teal-700',
  };
  const kelas = warna[status] || 'bg-black/5 text-ink/60';
  return `<span class="text-xs font-semibold px-2 py-1 rounded-full ${kelas}">${escapeHtml(status || '-')}</span>`;
}

function formatWaktuSingkat(iso) {
  if (!iso || iso === '-') return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return '-'; }
}
