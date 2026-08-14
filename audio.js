/**
 * 🍰 Kawaii Bakery — Audio System (v2)
 * audio.js
 *
 * 100% procedural WebAudio — no external files, nothing to host, no CORS
 * issues inside the Oculus Browser. All sounds are synthesized, so they are
 * royalty-free by construction and there are no broken asset paths.
 *
 * Provides:
 *  - Looping bakery/café ambience (soft filtered noise + random gentle clinks)
 *  - Looping background music (slow kawaii sine-pad chord progression)
 *  - SPATIAL running-water sound at the sink   (4.5, 1.2, -4)
 *  - SPATIAL subtle oven hum at the oven       (-4, 1.0, -4.5)  [close range]
 *  - SPATIAL mall/food-court crowd at the door (0, 1.6, 6.0)
 *  - SFX: pickup, drop, success (correct placement), error, click, start, victory
 *
 * The listener follows the player's head every frame (game.js calls
 * updateListener()), so all three positional sources get louder as you walk
 * toward them and quieter as you walk away.
 *
 * Quest audio unlock: the AudioContext is created/resumed on the FIRST user
 * gesture (click / keydown / Enter-VR button). Entering VR counts as a
 * gesture, so audio starts automatically when the player enters VR.
 */

class BakeryAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.ambGain = null;
    this.started = false;
    this._musicTimer = null;
    this._clinkTimer = null;
    this._tmpPos = null;
  }

  /* ── Context bootstrap ────────────────────────────────────────── */
  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  /** Call once on the first user gesture. Safe to call repeatedly. */
  start() {
    if (!this._ensure()) return;
    if (this.started) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.started = true;
    this._startAmbience();
    this._startMusic();
    this._startOvenHum();
    this._startSinkWater();
    this._startDoorCrowd();
    this.play('start');
    console.log('[audio.js] audio started');
  }

  /* ── Tone helper ──────────────────────────────────────────────── */
  _tone(freq, dur, type, vol, when, dest, slideTo) {
    const t = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest || this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  _noise(dur, vol, when, filterFreq, filterType) {
    const t = this.ctx.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = filterType || 'lowpass';
    f.frequency.value = filterFreq || 800;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  /* ── SFX ──────────────────────────────────────────────────────── */
  play(name) {
    if (!this._ensure()) return;
    switch (name) {
      case 'pickup': // cheerful rising blip
        this._tone(520, 0.09, 'sine', 0.18, 0,    null, 780);
        this._tone(1040, 0.07, 'sine', 0.06, 0.05);
        break;
      case 'drop': // soft thud
        this._tone(150, 0.16, 'triangle', 0.22, 0, null, 70);
        this._noise(0.08, 0.10, 0, 500);
        break;
      case 'success': // CORRECT PLACEMENT — sparkly confirmation chime
        this._tone(659, 0.18, 'sine', 0.18, 0);
        this._tone(880, 0.18, 'sine', 0.18, 0.08);
        this._tone(1174, 0.30, 'sine', 0.16, 0.16);
        this._tone(1568, 0.36, 'sine', 0.09, 0.24);
        this._noise(0.25, 0.03, 0.18, 5000, 'highpass'); // little shimmer
        break;
      case 'error': // gentle double buzz
        this._tone(180, 0.12, 'square', 0.08, 0);
        this._tone(150, 0.16, 'square', 0.08, 0.14);
        break;
      case 'click':
        this._tone(850, 0.045, 'sine', 0.12, 0);
        break;
      case 'start': // welcoming rise
        this._tone(392, 0.15, 'sine', 0.12, 0);
        this._tone(523, 0.15, 'sine', 0.12, 0.12);
        this._tone(659, 0.30, 'sine', 0.12, 0.24);
        break;
      case 'victory': // little fanfare
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => {
          this._tone(f, 0.22, 'sine', 0.16, i * 0.13);
          this._tone(f / 2, 0.22, 'triangle', 0.06, i * 0.13);
        });
        this._noise(0.5, 0.05, 0.7, 4000, 'highpass'); // sparkle
        break;
    }
  }

  /* ── Ambience: warm filtered noise + occasional café clinks ───── */
  _startAmbience() {
    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.04;
    this.ambGain.connect(this.master);

    const src = this.ctx.createBufferSource();
    src.buffer = this._brownNoiseBuffer(3);
    src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    src.connect(lp).connect(this.ambGain);
    src.start();

    // Random gentle dish/cup clinks every few seconds.
    const clink = () => {
      if (!this.ctx) return;
      const f = 1800 + Math.random() * 1600;
      this._tone(f, 0.05, 'sine', 0.02 + Math.random() * 0.02, 0);
      this._tone(f * 1.5, 0.04, 'sine', 0.012, 0.01);
      this._clinkTimer = setTimeout(clink, 3500 + Math.random() * 7000);
    };
    this._clinkTimer = setTimeout(clink, 4000);
  }

  /* ── Noise buffer helpers ─────────────────────────────────────── */
  _whiteNoiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Cross-fade the seam so the loop doesn't click.
    const fade = Math.min(1000, Math.floor(len / 20));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
    return buf;
  }

  _brownNoiseBuffer(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    const fade = Math.min(1000, Math.floor(len / 20));
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i] * k + d[len - fade + i] * (1 - k);
    }
    return buf;
  }

  /* ── Panner helper ────────────────────────────────────────────── */
  _makePanner(x, y, z, refDistance, rolloff, maxDistance) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.rolloffFactor = rolloff;
    p.maxDistance = maxDistance || 20;
    if (p.positionX) {
      const t = this.ctx.currentTime;
      p.positionX.setValueAtTime(x, t);
      p.positionY.setValueAtTime(y, t);
      p.positionZ.setValueAtTime(z, t);
    } else if (p.setPosition) {
      p.setPosition(x, y, z);
    }
    return p;
  }

  /* ── SPATIAL: running water at the sink (4.5, 1.2, -4) ────────── */
  _startSinkWater() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._whiteNoiseBuffer(4);
    src.loop = true;

    // Band-passed hiss = water stream; a little LFO wobble = burbling.
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.6;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.7;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 550;
    lfo.connect(lfoGain).connect(bp.frequency);
    lfo.start();

    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 700;

    const g = this.ctx.createGain();
    g.gain.value = 0.30;

    // refDistance 0.9 + rolloff 2.2 → clearly localized at the sink and
    // noticeably louder as you walk up to it.
    const panner = this._makePanner(4.5, 1.2, -4, 0.9, 2.2, 14);

    src.connect(bp).connect(hp).connect(g).connect(panner).connect(this.master);
    src.start();
    this._sink = { src: src, gain: g, panner: panner };
  }

  /* ── SPATIAL: subtle oven hum (-4, 1.0, -4.5) — close range ───── */
  _startOvenHum() {
    // Tight rolloff so you only really notice it right next to the oven.
    const panner = this._makePanner(-4, 1.0, -4.5, 0.6, 3.2, 10);
    const g = this.ctx.createGain();
    g.gain.value = 0.085;

    const o1 = this.ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 62;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = 124.7; // slight beat for warmth

    // A whisper of fan noise on top.
    const fan = this.ctx.createBufferSource();
    fan.buffer = this._brownNoiseBuffer(3);
    fan.loop = true;
    const fanLp = this.ctx.createBiquadFilter();
    fanLp.type = 'lowpass';
    fanLp.frequency.value = 300;
    const fanGain = this.ctx.createGain();
    fanGain.gain.value = 0.35;

    o1.connect(g); o2.connect(g);
    fan.connect(fanLp).connect(fanGain).connect(g);
    g.connect(panner).connect(this.master);
    o1.start(); o2.start(); fan.start();
    this._oven = { gain: g, panner: panner };
  }

  /* ── SPATIAL: mall / food-court crowd at the doorway (0,1.6,6) ── */
  _startDoorCrowd() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._brownNoiseBuffer(4);
    src.loop = true;

    // Speech-band murmur.
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.5;

    const g = this.ctx.createGain();
    g.gain.value = 0.55;

    // Slow swell so the crowd breathes instead of sitting flat.
    const swell = this.ctx.createOscillator();
    swell.type = 'sine';
    swell.frequency.value = 0.09;
    const swellGain = this.ctx.createGain();
    swellGain.gain.value = 0.18;
    swell.connect(swellGain).connect(g.gain);
    swell.start();

    const panner = this._makePanner(0, 1.6, 6.0, 1.4, 1.9, 18);

    src.connect(bp).connect(g).connect(panner).connect(this.master);
    src.start();

    // Occasional distant chatter blips so it reads as people, not wind.
    const chatter = () => {
      if (!this.ctx) return;
      const base = 220 + Math.random() * 260;
      this._tone(base, 0.14 + Math.random() * 0.12, 'sawtooth', 0.012, 0, panner, base * (0.8 + Math.random() * 0.5));
      this._chatterTimer = setTimeout(chatter, 2200 + Math.random() * 5200);
    };
    this._chatterTimer = setTimeout(chatter, 2500);
    this._crowd = { src: src, gain: g, panner: panner };
  }

  /* ── Background music: slow kawaii sine-pad chords, loops ─────── */
  _startMusic() {
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.05; // subtle — never buries the SFX
    this.musicGain.connect(this.master);

    // F – C – Dm – Bb (pastel and pleasant), 4s per chord, 16s loop
    const chords = [
      [349.23, 440.00, 523.25],  // F
      [261.63, 329.63, 392.00],  // C
      [293.66, 349.23, 440.00],  // Dm
      [233.08, 293.66, 349.23],  // Bb
    ];
    const CHORD_DUR = 4;
    let idx = 0;

    const playChord = () => {
      if (!this.ctx) return;
      const notes = chords[idx % chords.length];
      idx++;
      const t = this.ctx.currentTime;
      notes.forEach((f, n) => {
        const osc = this.ctx.createOscillator();
        const det = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = f;
        det.type = 'sine'; det.frequency.value = f * 1.004; // soft chorus
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.6 / notes.length, t + 1.2);
        g.gain.linearRampToValueAtTime(0.0001, t + CHORD_DUR + 0.5);
        osc.connect(g); det.connect(g);
        g.connect(this.musicGain);
        osc.start(t); det.start(t);
        osc.stop(t + CHORD_DUR + 0.6); det.stop(t + CHORD_DUR + 0.6);
        // twinkly melody note on top, every other chord
        if (n === 2 && idx % 2 === 0) {
          this._toneTo(this.musicGain, f * 2, 0.9, 0.05, 1.5);
        }
      });
      this._musicTimer = setTimeout(playChord, CHORD_DUR * 1000);
    };
    playChord();
  }

  _toneTo(dest, freq, dur, vol, when) {
    this._tone(freq, dur, 'sine', vol, when, dest);
  }

  /* ── Spatial listener follows the player's head ───────────────── */
  updateListener(camObj3D) {
    if (!this.ctx || !this.started || !camObj3D) return;
    if (!this._tmpPos) {
      this._tmpPos = new THREE.Vector3();
      this._tmpFwd = new THREE.Vector3();
      this._tmpQuat = new THREE.Quaternion();
    }
    camObj3D.getWorldPosition(this._tmpPos);
    camObj3D.getWorldQuaternion(this._tmpQuat);
    this._tmpFwd.set(0, 0, -1).applyQuaternion(this._tmpQuat);
    const L = this.ctx.listener;
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setValueAtTime(this._tmpPos.x, t);
      L.positionY.setValueAtTime(this._tmpPos.y, t);
      L.positionZ.setValueAtTime(this._tmpPos.z, t);
      L.forwardX.setValueAtTime(this._tmpFwd.x, t);
      L.forwardY.setValueAtTime(this._tmpFwd.y, t);
      L.forwardZ.setValueAtTime(this._tmpFwd.z, t);
      L.upX.setValueAtTime(0, t); L.upY.setValueAtTime(1, t); L.upZ.setValueAtTime(0, t);
    } else if (L.setPosition) {
      L.setPosition(this._tmpPos.x, this._tmpPos.y, this._tmpPos.z);
      L.setOrientation(this._tmpFwd.x, this._tmpFwd.y, this._tmpFwd.z, 0, 1, 0);
    }
  }
}

window.bakeryAudio = new BakeryAudio();

// Unlock/start audio on the first user gesture — including the Enter-VR
// button press, so audio "just works" when the player enters VR on Quest.
(function () {
  const kick = () => window.bakeryAudio.start();
  window.addEventListener('click', kick, { once: false });
  window.addEventListener('keydown', kick, { once: false });
  window.addEventListener('touchstart', kick, { once: false });
  const scene = document.querySelector('a-scene');
  const hook = () => scene.addEventListener('enter-vr', kick);
  if (scene) hook();
  else window.addEventListener('DOMContentLoaded', () => {
    const s = document.querySelector('a-scene');
    if (s) s.addEventListener('enter-vr', kick);
  });
})();
