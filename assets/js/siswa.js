/**
 * ============================================================
 * SISWA.JS — Modul Data Siswa (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 * Tabel data siswa, form tambah/edit, import dari Excel (SheetJS),
 * dan generate token ujian. Dipanggil dari app.js saat route
 * 'siswa' aktif (lihat renderPage()).
 * ============================================================
 */

const SiswaModule = {
  data: [],          // cache data siswa dari server
  filterKelas: '',
  filterCari: '',

  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderShell();
    this.bindShellEvents();
    await this.muatData();
  },

  async muatData() {
    const tbody = document.getElementById('siswa-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-ink/40 py-8">Memuat data...</td></tr>`;

    const hasil = await Api.post('getSiswaList', { session_token: Auth.getAdminToken() });

    if (!hasil.ok) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-brick-500 py-8">${escapeHtml(hasil.error || 'Gagal memuat data.')}</td></tr>`;
      return;
    }

    this.data = hasil.siswa;
    this.renderTabel();
    this.isiFilterKelas();
  },

  // ---------- Render kerangka halaman ----------
  renderShell() {
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div class="flex flex-wrap gap-2">
          <input id="siswa-search" type="text" placeholder="Cari nama / NISN..."
            class="rounded-lg border border-black/10 px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-400">
          <select id="siswa-filter-kelas" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">Semua Kelas</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-2">
          <button id="btn-import-excel" class="text-sm font-semibold px-3.5 py-2 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">
            Import Excel
          </button>
          <button id="btn-cetak-kartu" class="text-sm font-semibold px-3.5 py-2 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">
            Cetak Kartu Peserta
          </button>
          <button id="btn-generate-token" class="text-sm font-semibold px-3.5 py-2 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-50 transition">
            Generate Token
          </button>
          <button id="btn-tambah-siswa" class="text-sm font-semibold px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">
            + Tambah Siswa
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">NISN</th>
                <th class="px-4 py-3 font-semibold">Nama Siswa</th>
                <th class="px-4 py-3 font-semibold">Kelas</th>
                <th class="px-4 py-3 font-semibold">Token</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="siswa-tbody"></tbody>
          </table>
        </div>
      </div>

      <p id="siswa-count" class="text-xs text-ink/40 mt-3"></p>

      <!-- Modal Tambah/Edit -->
      <div id="modal-siswa" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6">
          <h3 id="modal-siswa-title" class="font-display font-bold text-lg text-ink mb-4">Tambah Siswa</h3>
          <form id="form-siswa" class="space-y-3">
            <input type="hidden" id="siswa-form-nisn-asli">
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">NISN</label>
              <input id="siswa-form-nisn" type="text" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Nama Siswa</label>
              <input id="siswa-form-nama" type="text" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Kelas</label>
              <input id="siswa-form-kelas" type="text" placeholder="Contoh: 5A" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <p id="siswa-form-error" class="text-xs text-brick-500 hidden"></p>
            <div class="flex gap-2 pt-2">
              <button type="button" id="btn-batal-siswa" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
              <button type="submit" class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Import Excel -->
      <div id="modal-import" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-md p-6">
          <h3 class="font-display font-bold text-lg text-ink mb-2">Import Data Siswa dari Excel</h3>
          <p class="text-xs text-ink/50 mb-4">File harus memiliki kolom header persis: <span class="font-mono">NISN</span>, <span class="font-mono">Nama_Siswa</span>, <span class="font-mono">Kelas</span>. Baris dengan NISN yang sudah terdaftar akan dilewati.</p>
          <input id="input-file-excel" type="file" accept=".xlsx,.xls,.csv" class="w-full text-sm mb-3">
          <div id="import-preview" class="text-sm text-ink/70 mb-3"></div>
          <p id="import-error" class="text-xs text-brick-500 mb-3 hidden"></p>
          <div class="flex gap-2 pt-1">
            <button type="button" id="btn-batal-import" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
            <button type="button" id="btn-proses-import" disabled class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition">Import Sekarang</button>
          </div>
        </div>
      </div>

      <!-- Modal Generate Token -->
      <div id="modal-token" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6">
          <h3 class="font-display font-bold text-lg text-ink mb-2">Generate Token Ujian</h3>
          <p class="text-xs text-ink/50 mb-4">Token lama akan ditimpa dan tidak berlaku lagi. Kartu Peserta perlu dicetak ulang setelah ini.</p>
          <label class="block text-xs font-semibold text-ink/70 mb-1">Kelas</label>
          <select id="token-filter-kelas" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">Semua Kelas</option>
          </select>
          <p id="token-error" class="text-xs text-brick-500 mb-3 hidden"></p>
          <div class="flex gap-2">
            <button type="button" id="btn-batal-token" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
            <button type="button" id="btn-proses-token" class="flex-1 text-sm font-semibold py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition">Generate</button>
          </div>
        </div>
      </div>
    `;
  },

  // ---------- Render isi tabel (dipanggil ulang tiap kali data/filter berubah) ----------
  renderTabel() {
    const tbody = document.getElementById('siswa-tbody');
    const filtered = this.data.filter(s => {
      const cocokKelas = !this.filterKelas || s.Kelas === this.filterKelas;
      const cariLower = this.filterCari.toLowerCase();
      const cocokCari = !cariLower ||
        String(s.Nama_Siswa).toLowerCase().includes(cariLower) ||
        String(s.NISN).toLowerCase().includes(cariLower);
      return cocokKelas && cocokCari;
    });

    document.getElementById('siswa-count').textContent =
      `Menampilkan ${filtered.length} dari ${this.data.length} siswa`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-ink/40 py-8">Tidak ada data yang cocok.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr class="border-t border-black/5">
        <td class="px-4 py-2.5 font-mono text-xs">${escapeHtml(s.NISN)}</td>
        <td class="px-4 py-2.5">${escapeHtml(s.Nama_Siswa)}</td>
        <td class="px-4 py-2.5">${escapeHtml(s.Kelas)}</td>
        <td class="px-4 py-2.5 font-mono text-xs">${s.Token_Ujian ? escapeHtml(s.Token_Ujian) : '<span class="text-ink/30">—</span>'}</td>
        <td class="px-4 py-2.5">${statusBadge(s.Status_Ujian)}</td>
        <td class="px-4 py-2.5 text-right whitespace-nowrap">
          <button data-aksi="edit" data-nisn="${escapeHtml(s.NISN)}" class="text-xs font-semibold text-teal-600 hover:underline mr-3">Edit</button>
          <button data-aksi="hapus" data-nisn="${escapeHtml(s.NISN)}" class="text-xs font-semibold text-brick-500 hover:underline">Hapus</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-aksi=edit]').forEach(btn => {
      btn.addEventListener('click', () => this.bukaModalEdit(btn.dataset.nisn));
    });
    tbody.querySelectorAll('[data-aksi=hapus]').forEach(btn => {
      btn.addEventListener('click', () => this.hapusSiswa(btn.dataset.nisn));
    });
  },

  isiFilterKelas() {
    const kelasList = [...new Set(this.data.map(s => s.Kelas).filter(Boolean))].sort();
    const opts = kelasList.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    document.getElementById('siswa-filter-kelas').innerHTML = `<option value="">Semua Kelas</option>${opts}`;
    document.getElementById('token-filter-kelas').innerHTML = `<option value="">Semua Kelas</option>${opts}`;
  },

  // ---------- Event binding utama ----------
  bindShellEvents() {
    document.getElementById('siswa-search').addEventListener('input', (e) => {
      this.filterCari = e.target.value;
      this.renderTabel();
    });
    document.getElementById('siswa-filter-kelas').addEventListener('change', (e) => {
      this.filterKelas = e.target.value;
      this.renderTabel();
    });

    document.getElementById('btn-tambah-siswa').addEventListener('click', () => this.bukaModalTambah());
    document.getElementById('btn-batal-siswa').addEventListener('click', () => this.tutupModal('modal-siswa'));
    document.getElementById('form-siswa').addEventListener('submit', (e) => this.submitFormSiswa(e));

    document.getElementById('btn-import-excel').addEventListener('click', () => this.bukaModalImport());
    document.getElementById('btn-batal-import').addEventListener('click', () => this.tutupModal('modal-import'));
    document.getElementById('input-file-excel').addEventListener('change', (e) => this.prosesFileExcel(e));
    document.getElementById('btn-proses-import').addEventListener('click', () => this.jalankanImport());

    document.getElementById('btn-generate-token').addEventListener('click', () => this.bukaModal('modal-token'));
    document.getElementById('btn-batal-token').addEventListener('click', () => this.tutupModal('modal-token'));
    document.getElementById('btn-proses-token').addEventListener('click', () => this.jalankanGenerateToken());

    document.getElementById('btn-cetak-kartu').addEventListener('click', () => this.cetakKartu());
  },

  async cetakKartu() {
    const filtered = this.data.filter(s => {
      const cocokKelas = !this.filterKelas || s.Kelas === this.filterKelas;
      const cariLower = this.filterCari.toLowerCase();
      const cocokCari = !cariLower || String(s.Nama_Siswa).toLowerCase().includes(cariLower) || String(s.NISN).toLowerCase().includes(cariLower);
      return cocokKelas && cocokCari;
    });

    if (filtered.length === 0) { alert('Tidak ada siswa untuk dicetak. Cek filter yang aktif.'); return; }
    if (filtered.some(s => !s.Token_Ujian)) {
      if (!confirm('Beberapa siswa belum punya token (belum di-generate). Tetap lanjut cetak? Kartu mereka akan kosong di bagian token.')) return;
    }

    const hasilUjian = await Api.post('getUjianListAdmin', { session_token: Auth.getAdminToken() });
    const ujianAktif = hasilUjian.ok ? hasilUjian.ujian.find(u => u.Status === 'Aktif') : null;
    const namaUjian = ujianAktif ? ujianAktif.Nama_Ujian : 'Ujian CBT';

    Cetak.kartuPeserta(filtered, namaUjian);
  },

  bukaModal(id) { document.getElementById(id).style.display = 'flex'; },
  tutupModal(id) { document.getElementById(id).style.display = 'none'; },

  // ---------- Tambah / Edit ----------
  bukaModalTambah() {
    document.getElementById('modal-siswa-title').textContent = 'Tambah Siswa';
    document.getElementById('siswa-form-nisn-asli').value = '';
    document.getElementById('siswa-form-nisn').value = '';
    document.getElementById('siswa-form-nisn').disabled = false;
    document.getElementById('siswa-form-nama').value = '';
    document.getElementById('siswa-form-kelas').value = '';
    document.getElementById('siswa-form-error').classList.add('hidden');
    this.bukaModal('modal-siswa');
  },

  bukaModalEdit(nisn) {
    const siswa = this.data.find(s => String(s.NISN) === String(nisn));
    if (!siswa) return;
    document.getElementById('modal-siswa-title').textContent = 'Edit Siswa';
    document.getElementById('siswa-form-nisn-asli').value = siswa.NISN;
    document.getElementById('siswa-form-nisn').value = siswa.NISN;
    document.getElementById('siswa-form-nisn').disabled = true; // NISN tidak diubah lewat form edit
    document.getElementById('siswa-form-nama').value = siswa.Nama_Siswa;
    document.getElementById('siswa-form-kelas').value = siswa.Kelas;
    document.getElementById('siswa-form-error').classList.add('hidden');
    this.bukaModal('modal-siswa');
  },

  async submitFormSiswa(e) {
    e.preventDefault();
    const nisnAsli = document.getElementById('siswa-form-nisn-asli').value;
    const nisn = document.getElementById('siswa-form-nisn').value.trim();
    const nama = document.getElementById('siswa-form-nama').value.trim();
    const kelas = document.getElementById('siswa-form-kelas').value.trim();
    const errorEl = document.getElementById('siswa-form-error');
    const btn = e.target.querySelector('button[type=submit]');

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const sessionToken = Auth.getAdminToken();
    let hasil;
    if (nisnAsli) {
      hasil = await Api.post('editSiswa', { session_token: sessionToken, nisn: nisnAsli, siswa: { Nama_Siswa: nama, Kelas: kelas } });
    } else {
      hasil = await Api.post('addSiswa', { session_token: sessionToken, siswa: { NISN: nisn, Nama_Siswa: nama, Kelas: kelas } });
    }

    btn.disabled = false;
    btn.textContent = 'Simpan';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal menyimpan data.';
      errorEl.classList.remove('hidden');
      return;
    }

    this.tutupModal('modal-siswa');
    await this.muatData();
  },

  async hapusSiswa(nisn) {
    const siswa = this.data.find(s => String(s.NISN) === String(nisn));
    const konfirmasi = confirm(`Hapus data siswa "${siswa ? siswa.Nama_Siswa : nisn}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!konfirmasi) return;

    const hasil = await Api.post('deleteSiswa', { session_token: Auth.getAdminToken(), nisn });
    if (!hasil.ok) {
      alert(hasil.error || 'Gagal menghapus data.');
      return;
    }
    await this.muatData();
  },

  // ---------- Import Excel ----------
  _dataImportSiap: [],

  bukaModalImport() {
    document.getElementById('input-file-excel').value = '';
    document.getElementById('import-preview').textContent = '';
    document.getElementById('import-error').classList.add('hidden');
    document.getElementById('btn-proses-import').disabled = true;
    this._dataImportSiap = [];
    this.bukaModal('modal-import');
  },

  prosesFileExcel(e) {
    const file = e.target.files[0];
    const errorEl = document.getElementById('import-error');
    const previewEl = document.getElementById('import-preview');
    errorEl.classList.add('hidden');
    previewEl.textContent = '';
    document.getElementById('btn-proses-import').disabled = true;
    this._dataImportSiap = [];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheetPertama = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheetPertama, { defval: '' });

        if (rows.length === 0) {
          errorEl.textContent = 'File kosong atau tidak terbaca.';
          errorEl.classList.remove('hidden');
          return;
        }

        const kolomWajib = ['NISN', 'Nama_Siswa', 'Kelas'];
        const kolomAda = Object.keys(rows[0]);
        const kolomHilang = kolomWajib.filter(k => !kolomAda.includes(k));

        if (kolomHilang.length > 0) {
          errorEl.textContent = `Kolom wajib tidak ditemukan: ${kolomHilang.join(', ')}. Pastikan header persis sama.`;
          errorEl.classList.remove('hidden');
          return;
        }

        this._dataImportSiap = rows.map(r => ({
          NISN: String(r.NISN).trim(),
          Nama_Siswa: String(r.Nama_Siswa).trim(),
          Kelas: String(r.Kelas).trim(),
        })).filter(r => r.NISN && r.Nama_Siswa && r.Kelas);

        previewEl.textContent = `${this._dataImportSiap.length} baris siap diimport dari ${rows.length} baris terbaca.`;
        document.getElementById('btn-proses-import').disabled = this._dataImportSiap.length === 0;
      } catch (err) {
        errorEl.textContent = 'Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.';
        errorEl.classList.remove('hidden');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  async jalankanImport() {
    const btn = document.getElementById('btn-proses-import');
    const errorEl = document.getElementById('import-error');
    btn.disabled = true;
    btn.textContent = 'Mengimport...';

    const hasil = await Api.post('importSiswaBatch', {
      session_token: Auth.getAdminToken(),
      daftar_siswa: this._dataImportSiap
    });

    btn.textContent = 'Import Sekarang';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal mengimport data.';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      return;
    }

    this.tutupModal('modal-import');
    await this.muatData();
    alert(`Import selesai.\nDitambahkan: ${hasil.jumlah_ditambahkan}\nDilewati: ${hasil.jumlah_dilewati}`);
  },

  // ---------- Generate Token ----------
  async jalankanGenerateToken() {
    const kelas = document.getElementById('token-filter-kelas').value;
    const errorEl = document.getElementById('token-error');
    const btn = document.getElementById('btn-proses-token');

    const konfirmasi = confirm(
      kelas
        ? `Generate ulang token untuk kelas ${kelas}? Token lama akan tidak berlaku lagi.`
        : `Generate ulang token untuk SEMUA siswa? Token lama akan tidak berlaku lagi.`
    );
    if (!konfirmasi) return;

    btn.disabled = true;
    btn.textContent = 'Memproses...';

    const hasil = await Api.post('generateTokenSiswa', { session_token: Auth.getAdminToken(), kelas });

    btn.disabled = false;
    btn.textContent = 'Generate';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal generate token.';
      errorEl.classList.remove('hidden');
      return;
    }

    this.tutupModal('modal-token');
    await this.muatData();
    alert(`Token berhasil digenerate untuk ${hasil.jumlah_diupdate} siswa.`);
  },
};

// ---------- Helper kecil ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str === null || str === undefined ? '' : String(str);
  return div.innerHTML;
}

function statusBadge(status) {
  const warna = {
    'Belum Mulai': 'bg-black/5 text-ink/60',
    'Sedang Mengerjakan': 'bg-amber-400/20 text-amber-500',
    'Terdeteksi Melanggar': 'bg-brick-400/20 text-brick-500',
    'Selesai': 'bg-teal-100 text-teal-700',
  };
  const kelas = warna[status] || 'bg-black/5 text-ink/60';
  return `<span class="text-xs font-semibold px-2 py-1 rounded-full ${kelas}">${escapeHtml(status || '-')}</span>`;
}
