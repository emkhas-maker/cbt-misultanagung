/**
 * ============================================================
 * UJIAN.JS — Halaman Pengerjaan Ujian Siswa
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 * Mengorkestrasi randomizer.js, lockdown.js, dan autosave.js
 * menjadi satu alur ujian utuh: layar pembuka -> mengerjakan
 * (dengan timer, navigasi soal, lockdown aktif, autosave
 * berkala) -> submit (manual atau paksa) -> layar selesai.
 * ============================================================
 */

const UjianModule = {
  siswa: null,
  ujian: null,
  soalTerurut: [],
  opsiMap: {},
  jawabanPG: {},
  jawabanUraian: {},
  indexAktif: 0,
  sisaDetik: 0,
  timerInterval: null,
  sudahMulai: false,
  sudahSelesai: false,

  async init() {
    const session = Auth.getSession();
    this.siswa = session.siswa;
    this.render_loading();

    const nisn = this.siswa.NISN;
    const token = this.siswa.Token_Ujian;

    const hasilUjian = await Api.post('getUjianAktif', { nisn, token });
    if (!hasilUjian.ok) {
      this.render_error(hasilUjian.error);
      return;
    }
    this.ujian = hasilUjian.ujian;
    this.sisaDetik = hasilUjian.sisa_detik;

    const hasilSoal = await Api.post('getSoal', { nisn, token, kode_mapel: this.ujian.Kode_Mapel });
    if (!hasilSoal.ok) {
      this.render_error(hasilSoal.error);
      return;
    }

    const rand = Randomizer.ambilUrutan(this.ujian.ID_Ujian, nisn, hasilSoal.soal);
    this.soalTerurut = rand.urutanSoal.map(id => hasilSoal.soal.find(s => s.ID_Soal === id));
    this.opsiMap = rand.opsiMap;

    // Pulihkan jawaban dari autosave lokal kalau ini kelanjutan sesi yang sempat terputus
    const lokal = Autosave.muatLokal(this.ujian.ID_Ujian, nisn);
    if (lokal) {
      this.jawabanPG = lokal.jawabanPG || {};
      this.jawabanUraian = lokal.jawabanUraian || {};
    }

    this.render_intro();
  },

  // ---------- Layar: Loading & Error ----------
  render_loading() {
    document.getElementById('view-siswa').innerHTML = `
      <div class="min-h-screen flex items-center justify-center">
        <p class="text-sm text-ink/50">Memuat data ujian...</p>
      </div>`;
  },

  render_error(pesan) {
    document.getElementById('view-siswa').innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4">
        <div class="text-center max-w-sm">
          <p class="font-display font-bold text-lg text-ink mb-2">Tidak Bisa Memuat Ujian</p>
          <p class="text-sm text-ink/60 mb-6">${escapeHtml(pesan || 'Terjadi kesalahan.')}</p>
          <button id="btn-keluar-error" class="text-sm text-teal-600 font-semibold underline underline-offset-2">Keluar</button>
        </div>
      </div>`;
    document.getElementById('btn-keluar-error').addEventListener('click', () => {
      Auth.logout();
      window.location.hash = '';
      showView('view-login');
    });
  },

  // ---------- Layar: Pembuka (sebelum mulai) ----------
  render_intro() {
    document.getElementById('view-siswa').innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4">
        <div class="bg-white rounded-2xl border border-black/5 p-7 max-w-md w-full">
          <div class="pattern-band mb-5"></div>
          <h2 class="font-display font-bold text-xl text-ink mb-1">${escapeHtml(this.ujian.Nama_Ujian)}</h2>
          <p class="text-sm text-ink/50 mb-5">Halo, ${escapeHtml(this.siswa.Nama_Siswa)} — kelas ${escapeHtml(this.siswa.Kelas)}</p>

          <div class="space-y-2 text-sm text-ink/70 mb-6">
            <div class="flex justify-between"><span>Jumlah Soal</span><span class="font-semibold text-ink">${this.soalTerurut.length}</span></div>
            <div class="flex justify-between"><span>Durasi</span><span class="font-semibold text-ink">${this.ujian.Waktu_Menit} menit</span></div>
            <div class="flex justify-between"><span>Sisa Waktu Saat Ini</span><span class="font-semibold text-ink">${formatWaktu(this.sisaDetik)}</span></div>
          </div>

          <div class="bg-amber-400/10 border border-amber-400/30 rounded-lg p-3.5 mb-6 text-xs text-ink/70 space-y-1">
            <p class="font-semibold text-amber-500 mb-1">⚠️ Perhatian sebelum mulai:</p>
            <p>• Jangan berpindah tab atau keluar dari layar ujian.</p>
            <p>• Setelah 3x pelanggaran, ujian akan otomatis dikumpulkan.</p>
            <p>• Jawaban tersimpan otomatis secara berkala.</p>
          </div>

          <button id="btn-mulai-ujian" class="w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-3 rounded-lg transition">
            Mulai Ujian Sekarang
          </button>
        </div>
      </div>`;

    document.getElementById('btn-mulai-ujian').addEventListener('click', () => this.mulaiUjian());
  },

  // ---------- Mulai mengerjakan ----------
  mulaiUjian() {
    this.sudahMulai = true;
    Lockdown.masukFullscreen();

    Lockdown.onViolation = (count, batas) => this.tampilkanPeringatanPelanggaran(count, batas);
    Lockdown.onForceSubmit = () => this.submitAkhir(true);
    Lockdown.mulai();

    Autosave.mulai(() => this.ambilState(), 15000);

    this.mulaiTimer();
    this.render_soal();
  },

  ambilState() {
    return {
      nisn: this.siswa.NISN,
      token: this.siswa.Token_Ujian,
      idUjian: this.ujian.ID_Ujian,
      jawabanPG: this.jawabanPG,
      jawabanUraian: this.jawabanUraian,
      violations: Lockdown.violationCount,
    };
  },

  mulaiTimer() {
    this.timerInterval = setInterval(() => {
      this.sisaDetik--;
      const el = document.getElementById('ujian-timer');
      if (el) {
        el.textContent = formatWaktu(this.sisaDetik);
        el.classList.toggle('text-brick-500', this.sisaDetik <= 60);
      }
      if (this.sisaDetik <= 0) {
        clearInterval(this.timerInterval);
        this.submitAkhir(true, 'Waktu ujian telah habis.');
      }
    }, 1000);
  },

  tampilkanPeringatanPelanggaran(count, batas) {
    const banner = document.getElementById('ujian-peringatan');
    if (!banner) return;
    banner.textContent = `⚠️ Pelanggaran terdeteksi (${count}/${batas})! Ujian akan otomatis dikumpulkan jika terjadi lagi ${batas - count > 0 ? 'sebanyak ' + (batas - count) + 'x lagi' : ''}.`;
    banner.style.display = 'block';
    setTimeout(() => { if (banner) banner.style.display = 'none'; }, 5000);
  },

  // ---------- Layar: Mengerjakan Soal ----------
  render_soal() {
    const soal = this.soalTerurut[this.indexAktif];
    const { teks, gambarUrl } = pisahkanGambar(soal.Pertanyaan);
    const nomorTampil = this.indexAktif + 1;

    let htmlOpsi = '';
    if (soal.Jenis === 'PG') {
      const urutanHuruf = this.opsiMap[soal.ID_Soal] || ['A', 'B', 'C', 'D', 'E'];
      const labelTampil = ['A', 'B', 'C', 'D', 'E'];
      htmlOpsi = urutanHuruf.map((hurufAsli, i) => {
        const teksOpsi = soal['Opsi_' + hurufAsli];
        const terpilih = this.jawabanPG[soal.ID_Soal] === hurufAsli;
        return `
          <button data-huruf="${hurufAsli}" class="btn-opsi-pg w-full text-left px-4 py-3 rounded-lg border-2 transition mb-2 ${terpilih ? 'border-teal-600 bg-teal-50' : 'border-black/10 hover:border-teal-300'}">
            <span class="inline-block w-6 h-6 rounded-full text-xs font-bold text-center leading-6 mr-2 ${terpilih ? 'bg-teal-600 text-white' : 'bg-black/5 text-ink/60'}">${labelTampil[i]}</span>
            <span class="text-sm">${escapeHtml(teksOpsi)}</span>
          </button>`;
      }).join('');
    } else {
      htmlOpsi = `
        <textarea id="input-uraian" rows="6" placeholder="Tulis jawaban di sini..."
          class="w-full rounded-lg border border-black/10 px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">${escapeHtml(this.jawabanUraian[soal.ID_Soal] || '')}</textarea>`;
    }

    document.getElementById('view-siswa').innerHTML = `
      <div class="min-h-screen bg-canvas">
        <div id="ujian-peringatan" class="hidden fixed top-0 inset-x-0 z-50 bg-brick-500 text-white text-sm font-semibold text-center py-2.5" style="display:none;"></div>

        <header class="bg-white border-b border-black/5 px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <div>
            <p class="text-xs text-ink/50">${escapeHtml(this.ujian.Nama_Ujian)}</p>
            <p class="text-sm font-semibold text-ink">${escapeHtml(this.siswa.Nama_Siswa)}</p>
          </div>
          <div id="ujian-timer" class="font-mono font-bold text-lg text-teal-700">${formatWaktu(this.sisaDetik)}</div>
        </header>

        <main class="max-w-2xl mx-auto px-5 py-6 pb-28">
          <div class="flex flex-wrap gap-1.5 mb-5">
            ${this.soalTerurut.map((s, i) => {
              const terjawab = s.Jenis === 'PG' ? !!this.jawabanPG[s.ID_Soal] : !!this.jawabanUraian[s.ID_Soal];
              const aktif = i === this.indexAktif;
              return `<button data-index="${i}" class="btn-nomor-soal w-8 h-8 rounded-lg text-xs font-semibold transition ${aktif ? 'bg-teal-600 text-white' : terjawab ? 'bg-teal-100 text-teal-700' : 'bg-white border border-black/10 text-ink/50'}">${i + 1}</button>`;
            }).join('')}
          </div>

          <div class="bg-white rounded-2xl border border-black/5 p-6">
            <p class="text-xs font-semibold text-teal-600 mb-2">Soal ${nomorTampil} dari ${this.soalTerurut.length} &middot; ${soal.Bobot} poin</p>
            ${gambarUrl ? `<img src="${escapeHtml(gambarUrl)}" alt="Gambar soal" class="rounded-lg border border-black/10 mb-4 max-h-64 object-contain">` : ''}
            <p class="text-sm text-ink mb-5 leading-relaxed">${escapeHtml(teks)}</p>
            ${htmlOpsi}
          </div>

          <div class="flex justify-between mt-5">
            <button id="btn-soal-prev" ${this.indexAktif === 0 ? 'disabled' : ''} class="text-sm font-semibold px-4 py-2 rounded-lg border border-black/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 transition">← Sebelumnya</button>
            ${this.indexAktif === this.soalTerurut.length - 1
              ? `<button id="btn-selesai-ujian" class="text-sm font-semibold px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Selesai & Kumpulkan</button>`
              : `<button id="btn-soal-next" class="text-sm font-semibold px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition">Selanjutnya →</button>`
            }
          </div>
        </main>
      </div>`;

    this.bindSoalEvents(soal);
  },

  bindSoalEvents(soal) {
    document.querySelectorAll('.btn-opsi-pg').forEach(btn => {
      btn.addEventListener('click', () => {
        this.jawabanPG[soal.ID_Soal] = btn.dataset.huruf;
        this.render_soal();
      });
    });

    const inputUraian = document.getElementById('input-uraian');
    if (inputUraian) {
      inputUraian.addEventListener('input', (e) => {
        this.jawabanUraian[soal.ID_Soal] = e.target.value;
      });
    }

    document.querySelectorAll('.btn-nomor-soal').forEach(btn => {
      btn.addEventListener('click', () => { this.indexAktif = Number(btn.dataset.index); this.render_soal(); });
    });

    const btnPrev = document.getElementById('btn-soal-prev');
    if (btnPrev) btnPrev.addEventListener('click', () => { this.indexAktif--; this.render_soal(); });

    const btnNext = document.getElementById('btn-soal-next');
    if (btnNext) btnNext.addEventListener('click', () => { this.indexAktif++; this.render_soal(); });

    const btnSelesai = document.getElementById('btn-selesai-ujian');
    if (btnSelesai) btnSelesai.addEventListener('click', () => {
      const belumTerjawab = this.soalTerurut.filter(s =>
        s.Jenis === 'PG' ? !this.jawabanPG[s.ID_Soal] : !this.jawabanUraian[s.ID_Soal]
      ).length;
      const pesan = belumTerjawab > 0
        ? `Masih ada ${belumTerjawab} soal belum dijawab. Yakin ingin mengumpulkan sekarang?`
        : 'Yakin ingin mengumpulkan jawaban sekarang? Jawaban tidak bisa diubah lagi setelah ini.';
      if (confirm(pesan)) this.submitAkhir(false);
    });
  },

  // ---------- Submit ----------
  async submitAkhir(dipaksa, alasanTambahan) {
    if (this.sudahSelesai) return; // cegah submit ganda dari sisi client
    this.sudahSelesai = true;

    clearInterval(this.timerInterval);
    Lockdown.berhenti();
    Autosave.berhenti();

    const action = dipaksa ? 'forceSubmitJawaban' : 'submitJawaban';
    const hasil = await Api.post(action, {
      nisn: this.siswa.NISN,
      token: this.siswa.Token_Ujian,
      id_ujian: this.ujian.ID_Ujian,
      jawaban_pg: this.jawabanPG,
      jawaban_uraian: this.jawabanUraian,
      violations: Lockdown.violationCount,
    });

    Autosave.hapusLokal(this.ujian.ID_Ujian, this.siswa.NISN);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

    this.render_selesai(hasil, dipaksa, alasanTambahan);
  },

  render_selesai(hasil, dipaksa, alasanTambahan) {
    document.getElementById('view-siswa').innerHTML = `
      <div class="min-h-screen flex items-center justify-center px-4">
        <div class="text-center max-w-sm">
          <div class="pattern-band mb-5 mx-auto"></div>
          <h2 class="font-display font-bold text-xl text-ink mb-2">${dipaksa ? 'Ujian Dikumpulkan Otomatis' : 'Ujian Selesai'}</h2>
          <p class="text-sm text-ink/60 mb-1">
            ${dipaksa ? (alasanTambahan || 'Terjadi pelanggaran melebihi batas yang diizinkan.') : 'Terima kasih, jawaban Bapak/Ibu guru sudah tersimpan.'}
          </p>
          ${hasil && hasil.ok ? `<p class="text-xs text-ink/40 mt-4">Skor Pilihan Ganda sementara: <span class="font-semibold text-ink">${hasil.skor_pg}</span></p>` : ''}
          ${hasil && !hasil.ok ? `<p class="text-xs text-brick-500 mt-4">${escapeHtml(hasil.error || '')}</p>` : ''}
          <button id="btn-keluar-selesai" class="mt-6 text-sm text-teal-600 font-semibold underline underline-offset-2">Keluar</button>
        </div>
      </div>`;
    document.getElementById('btn-keluar-selesai').addEventListener('click', () => {
      Auth.logout();
      window.location.hash = '';
      showView('view-login');
    });
  },
};

// ---------- Helper ----------
function formatWaktu(totalDetik) {
  const d = Math.max(0, totalDetik);
  const menit = Math.floor(d / 60).toString().padStart(2, '0');
  const detik = Math.floor(d % 60).toString().padStart(2, '0');
  return `${menit}:${detik}`;
}
