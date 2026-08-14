/**
 * ============================================================
 * MATERI.JS — Modul Materi & Kelas (Admin)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 */

const MateriModule = {
  materiList: [],

  async init() {
    const content = document.getElementById('app-content');
    content.innerHTML = this.renderShell();
    this.bindEvents();
    await this.muatSemua();
  },

  renderShell() {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div class="bg-white rounded-2xl border border-black/5 p-5">
          <h3 class="font-display font-bold text-ink mb-3">Ringkasan Kelas</h3>
          <div id="ringkasan-kelas" class="space-y-2"><p class="text-sm text-ink/40">Memuat...</p></div>
        </div>
        <div class="bg-white rounded-2xl border border-black/5 p-5">
          <h3 class="font-display font-bold text-ink mb-3">Ringkasan Mata Pelajaran</h3>
          <div id="ringkasan-mapel" class="space-y-2"><p class="text-sm text-ink/40">Memuat...</p></div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-3">
        <h3 class="font-display font-bold text-ink">Materi & Modul Pembelajaran</h3>
        <button id="btn-tambah-materi" class="text-sm font-semibold px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">
          + Tambah Materi
        </button>
      </div>

      <div class="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-teal-700 text-white text-left">
                <th class="px-4 py-3 font-semibold">Judul</th>
                <th class="px-4 py-3 font-semibold">Mapel</th>
                <th class="px-4 py-3 font-semibold">Kelas</th>
                <th class="px-4 py-3 font-semibold">Link</th>
                <th class="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="materi-tbody"></tbody>
          </table>
        </div>
      </div>

      <div id="modal-materi" class="fixed inset-0 z-50 items-center justify-center p-4" style="display:none; background:rgba(30,42,47,0.45);">
        <div class="bg-white rounded-2xl w-full max-w-sm p-6">
          <h3 class="font-display font-bold text-lg text-ink mb-4">Tambah Materi</h3>
          <form id="form-materi" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Judul</label>
              <input id="materi-form-judul" type="text" placeholder="Modul Bab 3 - Pecahan" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-ink/70 mb-1">Kode Mapel</label>
                <input id="materi-form-mapel" type="text" placeholder="MTK" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              </div>
              <div>
                <label class="block text-xs font-semibold text-ink/70 mb-1">Kelas</label>
                <input id="materi-form-kelas" type="text" placeholder="5A" class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink/70 mb-1">Link (Google Drive / PDF online)</label>
              <input id="materi-form-link" type="url" placeholder="https://drive.google.com/..." class="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
            </div>
            <p id="materi-form-error" class="text-xs text-brick-500 hidden"></p>
            <div class="flex gap-2 pt-2">
              <button type="button" id="btn-batal-materi" class="flex-1 text-sm font-semibold py-2 rounded-lg border border-black/10 hover:bg-black/5 transition">Batal</button>
              <button type="submit" class="flex-1 text-sm font-semibold py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Simpan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async muatSemua() {
    const sessionToken = Auth.getAdminToken();
    const [ringkasan, materi] = await Promise.all([
      Api.post('getRingkasanKelasMapel', { session_token: sessionToken }),
      Api.post('getMateriList', { session_token: sessionToken }),
    ]);

    if (ringkasan.ok) {
      document.getElementById('ringkasan-kelas').innerHTML = ringkasan.kelas.length
        ? ringkasan.kelas.map(k => barisRingkasan(k.kelas, k.jumlah_siswa, 'siswa')).join('')
        : '<p class="text-sm text-ink/40">Belum ada data siswa.</p>';
      document.getElementById('ringkasan-mapel').innerHTML = ringkasan.mapel.length
        ? ringkasan.mapel.map(m => barisRingkasan(m.mapel, m.jumlah_soal, 'soal')).join('')
        : '<p class="text-sm text-ink/40">Belum ada data soal.</p>';
    }

    if (materi.ok) {
      this.materiList = materi.materi;
      this.renderMateriTabel();
    }
  },

  renderMateriTabel() {
    const tbody = document.getElementById('materi-tbody');
    if (this.materiList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-sm text-ink/40 py-8">Belum ada materi. Klik "+ Tambah Materi" untuk menambahkan.</td></tr>`;
      return;
    }
    tbody.innerHTML = this.materiList.map(m => `
      <tr class="border-t border-black/5">
        <td class="px-4 py-2.5">${escapeHtml(m.Judul)}</td>
        <td class="px-4 py-2.5">${escapeHtml(m.Kode_Mapel)}</td>
        <td class="px-4 py-2.5">${escapeHtml(m.Kelas)}</td>
        <td class="px-4 py-2.5"><a href="${escapeHtml(m.Link)}" target="_blank" rel="noopener" class="text-teal-600 hover:underline text-xs">Buka Link ↗</a></td>
        <td class="px-4 py-2.5 text-right"><button data-id="${escapeHtml(m.ID_Materi)}" class="btn-hapus-materi text-xs font-semibold text-brick-500 hover:underline">Hapus</button></td>
      </tr>
    `).join('');
    tbody.querySelectorAll('.btn-hapus-materi').forEach(btn => {
      btn.addEventListener('click', () => this.hapusMateri(btn.dataset.id));
    });
  },

  bindEvents() {
    document.getElementById('btn-tambah-materi').addEventListener('click', () => {
      document.getElementById('form-materi').reset();
      document.getElementById('materi-form-error').classList.add('hidden');
      document.getElementById('modal-materi').style.display = 'flex';
    });
    document.getElementById('btn-batal-materi').addEventListener('click', () => {
      document.getElementById('modal-materi').style.display = 'none';
    });
    document.getElementById('form-materi').addEventListener('submit', (e) => this.submitForm(e));
  },

  async submitForm(e) {
    e.preventDefault();
    const payload = {
      Judul: document.getElementById('materi-form-judul').value.trim(),
      Kode_Mapel: document.getElementById('materi-form-mapel').value.trim(),
      Kelas: document.getElementById('materi-form-kelas').value.trim(),
      Link: document.getElementById('materi-form-link').value.trim(),
    };
    const errorEl = document.getElementById('materi-form-error');
    const btn = e.target.querySelector('button[type=submit]');

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';

    const hasil = await Api.post('addMateri', { session_token: Auth.getAdminToken(), materi: payload });

    btn.disabled = false;
    btn.textContent = 'Simpan';

    if (!hasil.ok) {
      errorEl.textContent = hasil.error || 'Gagal menyimpan.';
      errorEl.classList.remove('hidden');
      return;
    }

    document.getElementById('modal-materi').style.display = 'none';
    await this.muatSemua();
  },

  async hapusMateri(id) {
    if (!confirm('Hapus materi ini?')) return;
    const hasil = await Api.post('deleteMateri', { session_token: Auth.getAdminToken(), id_materi: id });
    if (!hasil.ok) { alert(hasil.error || 'Gagal menghapus.'); return; }
    await this.muatSemua();
  },
};

function barisRingkasan(label, jumlah, satuan) {
  return `
    <div class="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
      <span class="text-sm text-ink/70">${escapeHtml(label)}</span>
      <span class="text-sm font-semibold text-ink">${jumlah} ${satuan}</span>
    </div>
  `;
}
