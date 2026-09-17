(function (global) {
  class AudioBus {
    constructor() {
      this.enabled = true;
      this.ctx = null;
      this.master = null;
      this.sfx = null;
      this.music = null;
      this.heartbeat = null;
      this.musicNodes = [];
      this.mood = "base";
    }
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.45 : 0;
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.0;
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
    }
    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      if (this.enabled) this.startMusic(this.mood);
    }
    toggle() {
      this.enabled = !this.enabled;
      if (this.master) this.master.gain.value = this.enabled ? 0.45 : 0;
      if (this.enabled) this.startMusic(this.mood);
      else this.stopMusic();
      return this.enabled;
    }
    out() {
      return this.sfx || this.master;
    }
    tone(freq, dur, type, gain, at) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const t = (at || 0) + this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.12, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.out());
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    noise(dur, gain, cutoff) {
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.4);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = gain || 0.08;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff || 800;
      src.connect(f);
      f.connect(g);
      g.connect(this.out());
      src.start();
    }
    reelTick() {
      this.tone(170 + Math.random() * 50, 0.035, "square", 0.025);
    }
    land() {
      this.tone(88, 0.1, "triangle", 0.08);
      this.noise(0.06, 0.035, 600);
    }
    scatter(n) {
      n = Math.max(1, n || 1);
      const g = 0.16 + n * 0.07;
      this.noise(0.12 + n * 0.04, 0.06 + n * 0.03, 1400);
      this.tone(98, 0.22, "sine", g * 0.7);
      this.tone(196 + n * 18, 0.38, "sine", g);
      this.tone(294 + n * 24, 0.42, "triangle", g * 0.55, 0.05);
      this.tone(392 + n * 30, 0.36, "sine", g * 0.35, 0.12);
      if (n >= 2) {
        this.tone(523, 0.5, "sine", 0.08 + n * 0.03, 0.16);
        this.tone(48, 0.55, "sine", 0.14, 0.02);
      }
      if (n >= 3) {
        this.tone(659, 0.7, "triangle", 0.1, 0.2);
        this.noise(0.28, 0.1, 900);
      }
    }
    teaseStart(books) {
      this.stopHeartbeat();
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const pace = books >= 2 ? 520 : 720;
      const beat = () => {
        this.tone(62, 0.14, "sine", 0.18);
        this.tone(92, 0.1, "sine", 0.1, 0.12);
        this.tone(180 + books * 40, 0.2, "triangle", 0.05, 0.02);
      };
      beat();
      this.heartbeat = setInterval(beat, pace);
      this.tone(140, 0.8, "sine", 0.06);
      this.tone(220, 1.1, "triangle", 0.04, 0.1);
    }
    stopTease() {
      this.stopHeartbeat();
    }
    cursedLand() {
      this.tone(155, 0.22, "sine", 0.12);
      this.tone(233, 0.28, "triangle", 0.09, 0.03);
      this.tone(311, 0.35, "sine", 0.05, 0.08);
      this.noise(0.12, 0.04, 900);
    }
    expandReel() {
      this.tone(98, 0.28, "sawtooth", 0.05);
      this.tone(196, 0.32, "sine", 0.08, 0.02);
      this.noise(0.18, 0.06, 1200);
    }
    win(x) {
      this.tone(261, 0.18, "sine", 0.08);
      this.tone(329, 0.22, "sine", 0.07, 0.08);
      if (x > 5) this.tone(392, 0.3, "triangle", 0.06, 0.16);
      if (x > 20) this.tone(523, 0.4, "sine", 0.05, 0.24);
    }
    bonusStart() {
      this.setMood("bonus");
      this.tone(65, 0.55, "sine", 0.16);
      this.tone(98, 0.7, "triangle", 0.08, 0.08);
      this.tone(196, 0.55, "sine", 0.06, 0.2);
    }
    heartbeatStart() {
      this.stopHeartbeat();
      if (!this.enabled) return;
      this.ensure();
      if (!this.ctx) return;
      const beat = () => {
        this.tone(68, 0.16, "sine", 0.16);
        this.tone(86, 0.1, "sine", 0.08, 0.18);
      };
      beat();
      this.heartbeat = setInterval(beat, 780);
    }
    stopHeartbeat() {
      if (this.heartbeat) {
        clearInterval(this.heartbeat);
        this.heartbeat = null;
      }
    }
    fullCurse() {
      this.stopHeartbeat();
      this.setMood("full");
      this.tone(36, 1.0, "sine", 0.22);
      this.noise(0.7, 0.14, 400);
      this.tone(48, 1.2, "triangle", 0.1, 0.15);
    }
    maxWin() {
      this.tone(49, 1.3, "sine", 0.2);
      this.tone(73, 1.1, "triangle", 0.08, 0.2);
    }
    duck(to, ms) {
      if (!this.music || !this.ctx) return;
      const now = this.ctx.currentTime;
      const t = Math.max(0.05, (ms || 400) / 1000);
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(Math.max(this.music.gain.value, 0.001), now);
      this.music.gain.linearRampToValueAtTime(Math.max(to, 0.0001), now + t);
    }
    silence(ms) {
      this.duck(0.0001, 180);
      if (this.track && !this.track.paused) {
        this._wasPlaying = true;
        this.track.pause();
      }
      if (ms) setTimeout(() => this.restoreMusic(), ms);
    }
    restoreMusic() {
      if (!this.enabled) return;
      if (this.track && this._wasPlaying) {
        const p = this.track.play();
        if (p && p.catch) p.catch(() => {});
        this._wasPlaying = false;
      }
      this.startMusic(this.mood);
    }
    setMood(mood) {
      this.mood = mood || "base";
      if (!this.enabled) return;
      this.startMusic(this.mood);
    }
    stopMusic() {
      if (this.track) {
        this.track.pause();
      }
      this.musicNodes.forEach((n) => {
        try {
          if (n.stop) n.stop();
          if (n.disconnect) n.disconnect();
        } catch (e) {}
      });
      this.musicNodes = [];
    }
    ensureTrack() {
      if (this.track) return this.track;
      const el = new Audio("assets/the-vault-breathes.mp3");
      el.loop = true;
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      this.track = el;
      return el;
    }
    connectTrack() {
      if (this.trackNode || !this.ctx || !this.track) return;
      try {
        this.trackNode = this.ctx.createMediaElementSource(this.track);
        this.trackNode.connect(this.music);
      } catch (e) {
        this.trackNode = true;
      }
    }
    startMusic(mood) {
      this.ensure();
      if (!this.ctx || !this.enabled) return;
      mood = mood || this.mood || "base";
      this.mood = mood;
      const el = this.ensureTrack();
      this.connectTrack();
      const now = this.ctx.currentTime;
      const target = mood === "full" ? 0.72 : mood === "bonus" ? 0.55 : 0.42;
      this.music.gain.cancelScheduledValues(now);
      this.music.gain.setValueAtTime(Math.max(this.music.gain.value, 0.001), now);
      this.music.gain.linearRampToValueAtTime(target, now + 0.8);
      el.playbackRate = mood === "full" ? 0.96 : 1;
      if (el.paused) {
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      }
    }
  }

  global.BOC.AudioBus = AudioBus;
})(typeof window !== "undefined" ? window : global);
