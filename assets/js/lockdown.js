/**
 * ============================================================
 * LOCKDOWN.JS — Keamanan Ujian (Lockdown Mode)
 * MI Sultan Agung — Sistem CBT
 * ============================================================
 *
 * Mendeteksi 3 jenis pelanggaran:
 *  1. visibilitychange -> siswa pindah tab / minimize browser
 *  2. blur pada window  -> jendela browser kehilangan fokus
 *  3. fullscreenchange  -> siswa keluar dari mode layar penuh
 *
 * Debounce 1 detik dipakai supaya 1 tindakan siswa (misal pindah
 * tab) yang memicu beberapa event sekaligus tidak dihitung
 * berkali-kali sebagai pelanggaran terpisah.
 *
 * CATATAN JUJUR (bukan menutup-nutupi keterbatasan):
 * Ini lapisan pencegahan client-side, BUKAN jaminan mutlak.
 * Siswa yang mematikan JavaScript atau pakai perangkat lain di
 * luar pengawasan tetap bisa melewatinya. Pengawasan manual
 * panitia ujian tetap diperlukan sebagai lapisan kedua.
 * ============================================================
 */

const Lockdown = {
  violationCount: 0,
  batasPelanggaran: 3,
  aktif: false,
  onViolation: null,     // callback(count, batas)
  onForceSubmit: null,   // callback() -- dipanggil saat count >= batas
  _lastTrigger: 0,

  mulai(violationAwal = 0) {
    this.violationCount = violationAwal;
    this.aktif = true;
    document.addEventListener('visibilitychange', Lockdown._handleVisibility);
    window.addEventListener('blur', Lockdown._handleBlur);
    document.addEventListener('fullscreenchange', Lockdown._handleFullscreen);
  },

  berhenti() {
    this.aktif = false;
    document.removeEventListener('visibilitychange', Lockdown._handleVisibility);
    window.removeEventListener('blur', Lockdown._handleBlur);
    document.removeEventListener('fullscreenchange', Lockdown._handleFullscreen);
  },

  masukFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  },

  _trigger() {
    if (!Lockdown.aktif) return;
    const now = Date.now();
    if (now - Lockdown._lastTrigger < 1000) return; // debounce
    Lockdown._lastTrigger = now;

    Lockdown.violationCount++;
    if (Lockdown.onViolation) Lockdown.onViolation(Lockdown.violationCount, Lockdown.batasPelanggaran);

    if (Lockdown.violationCount >= Lockdown.batasPelanggaran) {
      Lockdown.aktif = false; // cegah trigger berulang saat proses force submit berjalan
      if (Lockdown.onForceSubmit) Lockdown.onForceSubmit();
    }
  },

  _handleVisibility() { if (document.hidden) Lockdown._trigger(); },
  _handleBlur() { Lockdown._trigger(); },
  _handleFullscreen() { if (!document.fullscreenElement) Lockdown._trigger(); },
};
