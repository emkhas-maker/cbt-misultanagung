/**
 * ============================================================
 * SOAL.JS — Modul Bank Soal (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 * Tabel soal, form tambah/edit (field menyesuaikan Jenis: PG/Uraian),
 * import dari Excel, dan dukungan gambar lewat URL (memakai penanda
 * {{img:URL}} di dalam teks Pertanyaan -- dirender otomatis jadi
 * gambar di preview & nanti di halaman ujian siswa).
 * ============================================================
 */

const SoalModule = {
  data: [],
  filterMapel: '',
  filterJenis: '',

  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderShell();
    this.bindShellEvents();
    await this.muatData();
  },

  async muatData() {
    const tbody = document.getElementById('soal-tbody');
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-ink/40 py-8">Memuat data...</td></tr>`;

    const hasil = await Api.post('getSoalList', { session_token: Auth.getAdminToken() });
    if (!hasil.ok) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-brick-500 py-8">${escapeHtml(hasil.error || 'Gagal memuat data.')}</td></tr>`;
      return;
    }

    this.data = hasil.soal;
    this.renderTabel();
    this.isiFilterMapel();
  },

  renderShell() {
    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div class="flex flex-wrap gap-2">
          <input id="soal-search" type="text" placeholder="Cari pertanyaan / ID..."
            class="rounded-lg border border-black/10 px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-teal-400">
          <select id="soal-filter-mapel" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">Semua Mapel</option>
          </select>
          <select id="soal-filter-jenis" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">Semua Jenis</option>
            <option value="PG">Pilihan Ganda</option>
            <option value="Uraian">Uraian</option>
          </select>
        </div>
        <div class="flex flex-wrap gap-2">
          <button id="btn-import-soal" class="text-sm font-semibold px-3.5 py-2 rounded-lg border border-teal-600 text-teal-700 hover:bg-teal-50 transition">
            Import Excel
          </button>
          <button id="btn-tambah-soal" class="text-sm font-semibold px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">
            + Tambah Soal
          </button>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">ID Soal</th>
                <th class="px-4 py-3 font-semibold">Mapel</th>
                <th class="px-4 py-3 font-semibold">Jenis</th>
                <th class="px-4 py-3 font-semibold">Pertanyaan</th>
                <th class="px-4 py-3 font-semibold">Bobot</th>
                <th class="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="soal-tbody"></tbody>
          </table>
        </div>
      </div>
      <p id="soal-count" class="text-xs text-ink/40 mt-3"></p>

      <!-- Modal Tambah/Edit Soal -->
      <div id="modal-soal" class="fixed inset-0 z-50 items-center justify-center p-4 overflow-y-auto" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-lg p-6 my-8">
          <h3 id="modal-soal-title" class="font-display font-bold text-lg text-ink mb-4">Tambah Soal</h3>
          <form id="form-soal" class="space-y-3">
            <input type="hidden" id="soal-form-id-asli">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-ink/70 mb-1">ID Soal</label>
                <input id="soal-form-id" type="text" placeholder="MTK-004" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400">
              </div>
              <div>
                <label class="block text-xs font-semibold text-ink/70 mb-1">Kode Mapel</label>
                <input id="soal-form-mapel" type="text" placeholder="MTK" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Jenis Soal</label>
              <select id="soal-form-jenis" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="PG">Pilihan Ganda</option>
                <option value="Uraian">Uraian</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Pertanyaan</label>
              <textarea id="soal-form-pertanyaan" rows="3" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"></textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">URL Gambar (opsional)</label>
              <input id="soal-form-gambar" type="url" placeholder="https://..." class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <p class="text-[11px] text-ink/40 mt-1">Kalau diisi, gambar otomatis ditampilkan di atas pertanyaan saat ujian.</p>
            </div>

            <div id="soal-form-opsi-wrapper" class="space-y-2">
              <label class="block text-xs font-semibold text-ink/70">Opsi Jawaban</label>
              <div class="grid grid-cols-2 gap-2">
                <input id="soal-form-opsi-a" type="text" placeholder="A" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <input id="soal-form-opsi-b" type="text" placeholder="B" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <input id="soal-form-opsi-c" type="text" placeholder="C" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <input id="soal-form-opsi-d" type="text" placeholder="D" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <input id="soal-form-opsi-e" type="text" placeholder="E (opsional)" class="rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 col-span-2">
              </div>
              <div>
                <label class="block text-xs font-semibold text-ink/70 mb-1 mt-2">Kunci Jawaban</label>
                <select id="soal-form-kunci" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="E">E</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Bobot Nilai</label>
              <input id="soal-form-bobot" type="number" min="1" placeholder="5" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>

            <p id="soal-form-error" class="text-xs text-brick-500 hidden"></p>
            <div class="flex gap-2 pt-2">
              <button type="button" id="btn-batal-soal" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
              <button type="submit" class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Simpan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Import Excel -->
      <div id="modal-import-soal" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-md p-6">
          <h3 class="font-display font-bold text-lg text-ink mb-2">Import Soal dari Excel</h3>
          <p class="text-xs text-ink/50 mb-4">Kolom header harus persis: <span class="font-mono">ID_Soal, Kode_Mapel, Jenis, Pertanyaan, Opsi_A, Opsi_B, Opsi_C, Opsi_D, Opsi_E, Kunci, Bobot</span>. ID Soal yang sudah ada akan dilewati.</p>
          <input id="input-file-soal" type="file" accept=".xlsx,.xls,.csv" class="w-full text-sm mb-3">
          <div id="import-soal-preview" class="text-sm text-ink/70 mb-3"></div>
          <p id="import-soal-error" class="text-xs text-brick-500 mb-3 hidden"></p>
          <div class="flex gap-2 pt-1">
            <button type="button" id="btn-batal-import-soal" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
            <button type="button" id="btn-proses-import-soal" disabled class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition">Import Sekarang</button>
          </div>
        </div>
      </div>
    `;
  },

  renderTabel() {
    const tbody = document.getElementById('soal-tbody');
    const filtered = this.data.filter(s => {
      const cocokMapel = !this.filterMapel || s.Kode_Mapel === this.filterMapel;
      const cocokJenis = !this.filterJenis || s.Jenis === this.filterJenis;
      const cariLower = document.getElementById('soal-search').value.toLowerCase();
      const cocokCari = !cariLower ||
        String(s.Pertanyaan).toLowerCase().includes(cariLower) ||
        String(s.ID_Soal).toLowerCase().includes(cariLower);
      return cocokMapel && cocokJenis && cocokCari;
    });

    document.getElementById('soal-count').textContent = `Menampilkan ${filtered.length} dari ${this.data.length} soal`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-sm text-ink/40 py-8">Tidak ada data yang cocok.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const { teks } = pisahkanGambar(s.Pertanyaan);
      const cuplikan = teks.length > 70 ? teks.slice(0, 70) + '...' : teks;
      return `
        <tr class="border-t border-black/5 align-top">
          <td class="px-4 py-2.5 font-mono text-xs">${escapeHtml(s.ID_Soal)}</td>
          <td class="px-4 py-2.5">${escapeHtml(s.Kode_Mapel)}</td>
          <td class="px-4 py-2.5">${jenisBadge(s.Jenis)}</td>
          <td class="px-4 py-2.5 max-w-sm">${escapeHtml(cuplikan)}</td>
          <td class="px-4 py-2.5">${escapeHtml(s.Bobot)}</td>
          <td class="px-4 py-2.5 text-right whitespace-nowrap">
            <button data-aksi="edit" data-id="${escapeHtml(s.ID_Soal)}" class="text-xs font-semibold text-teal-600 hover:underline mr-3">Edit</button>
            <button data-aksi="hapus" data-id="${escapeHtml(s.ID_Soal)}" class="text-xs font-semibold text-brick-500 hover:underline">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('[data-aksi=edit]').forEach(btn => btn.addEventListener('click', () => this.bukaModalEdit(btn.dataset.id)));
    tbody.querySelectorAll('[data-aksi=hapus]').forEach(btn => btn.addEventListener('click', () => this.hapusSoal(btn.dataset.id)));
  },

  isiFilterMapel() {
    const mapelList = [...new Set(this.data.map(s => s.Kode_Mapel).filter(Boolean))].sort();
    const opts = mapelList.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    document.getElementById('soal-filter-mapel').innerHTML = `<option value="">Semua Mapel</option>${opts}`;
  },

  bindShellEvents() {
    document.getElementById('soal-search').addEventListener('input', () => this.renderTabel());
    document.getElementById('soal-filter-mapel').addEventListener('change', (e) => { this.filterMapel = e.target.value; this.renderTabel(); });
    document.getElementById('soal-filter-jenis').addEventListener('change', (e) => { this.filterJenis = e.target.value; this.renderTabel(); });

    document.getElementById('btn-tambah-soal').addEventListener('click', () => this.bukaModalTambah());
    document.getElementById('btn-batal-soal').addEventListener('click', () => this.tutupModal('modal-soal'));
    document.getElementById('form-soal').addEventListener('submit', (e) => this.submitFormSoal(e));
    document.getElementById('soal-form-jenis').addEventListener('change', () => this.toggleFieldOpsi());

    document.getElementById('btn-import-soal').addEventListener('click', () => this.bukaModalImport());
    document.getElementById('btn-batal-import-soal').addEventListener('click', () => this.tutupModal('modal-import-soal'));
    document.getElementById('input-file-soal').addEventListener('change', (e) => this.prosesFileExcel(e));
    document.getElementById('btn-proses-import-soal').addEventListener('click', () => this.jalankanImport());
  },

  bukaModal(id) { document.getElementById(id).style.display = 'flex'; },
  tutupModal(id) { document.getElementById(id).style.display = 'none'; },

  toggleFieldOpsi() {
    const jenis = document.getElementById('soal-form-jenis').value;
    document.getElementById('soal-form-opsi-wrapper').style.display = jenis === 'PG' ? 'block' : 'none';
  },

  bukaModalTambah() {
    document.getElementById('modal-soal-title').textContent = 'Tambah Soal';
    document.getElementById('soal-form-id-asli').value = '';
    ['id', 'mapel', 'pertanyaan', 'gambar', 'opsi-a', 'opsi-b', 'opsi-c', 'opsi-d', 'opsi-e', 'bobot'].forEach(f => {
      document.getElementById('soal-form-' + f).value = '';
    });
    document.getElementById('soal-form-id').disabled = false;
    document.getElementById('soal-form-jenis').value = 'PG';
    document.getElementById('soal-form-kunci').value = 'A';
    document.getElementById('soal-form-error').classList.add('hidden');
    this.toggleFieldOpsi();
    this.bukaModal('modal-soal');
  },

  bukaModalEdit(idSoal) {
    const soal = this.data.find(s => String(s.ID_Soal) === String(idSoal));
    if (!soal) return;
    const { teks, gambarUrl } = pisahkanGambar(soal.Pertanyaan);

    document.getElementById('modal-soal-title').textContent = 'Edit Soal';
    document.getElementById('soal-form-id-asli').value = soal.ID_Soal;
    document.getElementById('soal-form-id').value = soal.ID_Soal;
    document.getElementById('soal-form-id').disabled = true;
    document.getElementById('soal-form-mapel').value = soal.Kode_Mapel;
    document.getElementById('soal-form-jenis').value = soal.Jenis;
    document.getElementById('soal-form-pertanyaan').value = teks;
    document.getElementById('soal-form-gambar').value = gambarUrl || '';
    document.getElementById('soal-form-opsi-a').value = soal.Opsi_A || '';
    document.getElementById('soal-form-opsi-b').value = soal.Opsi_B || '';
    document.getElementById('soal-form-opsi-c').value = soal.Opsi_C || '';
    document.getElementById('soal-form-opsi-d').value = soal.Opsi_D || '';
    document.getElementById('soal-form-opsi-e').value = soal.Opsi_E || '';
    document.getElementById('soal-form-kunci').value = soal.Kunci || 'A';
    document.getElementById('soal-form-bobot').value = soal.Bobot;
    document.getElementById('soal-form-error').classList.add('hidden');
    this.toggleFieldOpsi();
    this.bukaModal('modal-soal');
  },

  async submitFormSoal(e) {
    e.preventDefault();
    const idAsli = document.getElementById('soal-form-id-asli').value;
    const id = document.getElementById('soal-form-id').value.trim();
    const mapel = document.getElementById('soal-form-mapel').value.trim();
    const jenis = document.getElementById('soal-form-jenis').value;
    const teksPertanyaan = document.getElementById('soal-form-pertanyaan').value.trim();
    const gambarUrl = document.getElementById('soal-form-gambar').value.trim();
    const bobot = document.getElementById('soal-form-bobot').value;
    const errorEl = document.getElementById('soal-form-error');
    const btn = e.target.querySelector('button[type=submit]');

    const pertanyaanFinal = gambarUrl ? `{{img:${gambarUrl}}}${teksPertanyaan}` : teksPertanyaan;

    const payload = {
      ID_Soal: id, Kode_Mapel: mapel, Jenis: jenis, Pertanyaan: pertanyaanFinal, Bobot: bobot,
    };
    if (jenis === 'PG') {
      payload.Opsi_A = document.getElementById('soal-form-opsi-a').value.trim();
      payload.Opsi_B = document.getElementById('soal-form-opsi-b').value.trim();
      payload.Opsi_C = document.getElementById('soal-form-opsi-c').value.trim();
      payload.Opsi_D = document.getElementById('soal-form-opsi-d').value.trim();
      payload.Opsi_E = document.getElementById('soal-form-opsi-e').value.trim();
      payload.Kunci = document.getElementById('soal-form-kunci').value;
    } else {
      payload.Opsi_A = payload.Opsi_B = payload.Opsi_C = payload.Opsi_D = payload.Opsi_E = '';
      payload.Kunci = '';
    }

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const sessionToken = Auth.getAdminToken();
    const hasil = idAsli
      ? await Api.post('editSoal', { session_token: sessionToken, id_soal: idAsli, soal: payload })
      : await Api.post('addSoal', { session_token: sessionToken, soal: payload });

    btn.disabled = false;
    btn.textContent = 'Simpan';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal menyimpan data.';
      errorEl.classList.remove('hidden');
      return;
    }

    this.tutupModal('modal-soal');
    await this.muatData();
  },

  async hapusSoal(idSoal) {
    const konfirmasi = confirm(`Hapus soal "${idSoal}"? Tindakan ini tidak bisa dibatalkan.`);
    if (!konfirmasi) return;
    const hasil = await Api.post('deleteSoal', { session_token: Auth.getAdminToken(), id_soal: idSoal });
    if (!hasil.ok) { alert(hasil.error || 'Gagal menghapus soal.'); return; }
    await this.muatData();
  },

  // ---------- Import Excel ----------
  _dataImportSiap: [],

  bukaModalImport() {
    document.getElementById('input-file-soal').value = '';
    document.getElementById('import-soal-preview').textContent = '';
    document.getElementById('import-soal-error').classList.add('hidden');
    document.getElementById('btn-proses-import-soal').disabled = true;
    this._dataImportSiap = [];
    this.bukaModal('modal-import-soal');
  },

  prosesFileExcel(e) {
    const file = e.target.files[0];
    const errorEl = document.getElementById('import-soal-error');
    const previewEl = document.getElementById('import-soal-preview');
    errorEl.classList.add('hidden');
    previewEl.textContent = '';
    document.getElementById('btn-proses-import-soal').disabled = true;
    this._dataImportSiap = [];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });

        if (rows.length === 0) {
          errorEl.textContent = 'File kosong atau tidak terbaca.';
          errorEl.classList.remove('hidden');
          return;
        }

        const kolomWajib = ['ID_Soal', 'Kode_Mapel', 'Jenis', 'Pertanyaan', 'Bobot'];
        const kolomHilang = kolomWajib.filter(k => !Object.keys(rows[0]).includes(k));
        if (kolomHilang.length > 0) {
          errorEl.textContent = `Kolom wajib tidak ditemukan: ${kolomHilang.join(', ')}.`;
          errorEl.classList.remove('hidden');
          return;
        }

        this._dataImportSiap = rows;
        previewEl.textContent = `${rows.length} baris siap diimport.`;
        document.getElementById('btn-proses-import-soal').disabled = false;
      } catch (err) {
        errorEl.textContent = 'Gagal membaca file. Pastikan formatnya .xlsx, .xls, atau .csv.';
        errorEl.classList.remove('hidden');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  async jalankanImport() {
    const btn = document.getElementById('btn-proses-import-soal');
    const errorEl = document.getElementById('import-soal-error');
    btn.disabled = true;
    btn.textContent = 'Mengimport...';

    const hasil = await Api.post('importSoalBatch', { session_token: Auth.getAdminToken(), daftar_soal: this._dataImportSiap });

    btn.textContent = 'Import Sekarang';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal mengimport data.';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      return;
    }

    this.tutupModal('modal-import-soal');
    await this.muatData();
    alert(`Import selesai.\nDitambahkan: ${hasil.jumlah_ditambahkan}\nDilewati: ${hasil.jumlah_dilewati}`);
  },
};

// ---------- Helper ----------
function jenisBadge(jenis) {
  const kelas = jenis === 'PG' ? 'bg-teal-100 text-teal-700' : 'bg-amber-400/20 text-amber-500';
  return `<span class="text-xs font-semibold px-2 py-1 rounded-full ${kelas}">${escapeHtml(jenis)}</span>`;
}

/** Pisahkan penanda {{img:URL}} dari teks pertanyaan biasa. */
function pisahkanGambar(pertanyaan) {
  if (!pertanyaan) return { teks: '', gambarUrl: null };
  const match = String(pertanyaan).match(/^\{\{img:(.+?)\}\}([\s\S]*)$/);
  if (match) {
    return { gambarUrl: match[1], teks: match[2] };
  }
  return { teks: pertanyaan, gambarUrl: null };
}
