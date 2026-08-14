/**
 * ============================================================
 * AUTOSAVE.JS — Autosave Jawaban Siswa
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Dua lapis penyimpanan:
 *  1. localStorage -- instan, jaga-jaga kalau koneksi internet
 *     putus atau tab tidak sengaja tertutup, jawaban tidak hilang
 *     saat siswa membuka lagi di perangkat yang sama.
 *  2. Sync ke server (Google Sheets) setiap beberapa detik --
 *     supaya panitia bisa lihat progres siswa secara live di
 *     Monitoring Ujian (Fase 6) dan jawaban tidak hilang total
 *     kalau perangkat siswa bermasalah.
 * ============================================================
 */

const Autosave = {
  _intervalId: null,

  mulai(getState, intervalMs = 15000) {
    this.berhenti();
    this._intervalId = setInterval(() => this.simpanSekarang(getState), intervalMs);
  },

  berhenti() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  },

  async simpanSekarang(getState) {
    const state = getState();
    this.simpanLokal(state);

    try {
      await Api.post('autosaveJawaban', {
        nisn: state.nisn,
        token: state.token,
        id_ujian: state.idUjian,
        jawaban_pg: state.jawabanPG,
        jawaban_uraian: state.jawabanUraian,
        violations: state.violations,
      });
    } catch (e) {
      // Gagal sync ke server tidak fatal -- data tetap aman di localStorage,
      // akan tersinkron lagi di percobaan autosave berikutnya.
    }
  },

  simpanLokal(state) {
    const key = 'cbt_autosave_' + state.idUjian + '_' + state.nisn;
    localStorage.setItem(key, JSON.stringify({
      jawabanPG: state.jawabanPG,
      jawabanUraian: state.jawabanUraian,
      violations: state.violations,
      disimpanPada: new Date().toISOString(),
    }));
  },

  muatLokal(idUjian, nisn) {
    const key = 'cbt_autosave_' + idUjian + '_' + nisn;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  hapusLokal(idUjian, nisn) {
    localStorage.removeItem('cbt_autosave_' + idUjian + '_' + nisn);
  },
};
