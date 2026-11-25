// Dapur Kilat — all sound is synthesised with WebAudio: no audio files.
// Chop thocks, sizzle, serve dings and a little pentatonic kitchen tune.

export class KitchenAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
    this.sizzleNodes = null;
  }

  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopSizzle();
    return this.muted;
  }

  tone(freq, seconds, type, volume, when = 0) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(this.context.destination);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  noiseBurst(seconds, volume, filterFreq) {
    if (!this.context || this.muted) return;
    const start = this.context.currentTime;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start(start);
  }

  pickup() { this.tone(520, 0.09, 'triangle', 0.16); this.tone(780, 0.08, 'triangle', 0.12, 0.05); }
  place() { this.tone(340, 0.08, 'triangle', 0.14); }
  chop() { this.noiseBurst(0.07, 0.5, 900); this.tone(180, 0.06, 'square', 0.1); }
  chopDone() { this.tone(660, 0.1, 'triangle', 0.16); this.tone(990, 0.12, 'triangle', 0.12, 0.07); }
  cookDone() { this.tone(587, 0.1, 'sine', 0.18); this.tone(880, 0.14, 'sine', 0.16, 0.08); }
  serve() { this.tone(880, 0.12, 'triangle', 0.2); this.tone(1174, 0.16, 'triangle', 0.2, 0.09); this.tone(1568, 0.22, 'triangle', 0.16, 0.18); }
  error() { this.tone(160, 0.16, 'sawtooth', 0.12); this.tone(120, 0.2, 'sawtooth', 0.1, 0.08); }
  orderArrive() { this.tone(1046, 0.1, 'sine', 0.14); this.tone(1318, 0.14, 'sine', 0.12, 0.09); }
  orderLost() { this.tone(392, 0.2, 'triangle', 0.14); this.tone(311, 0.3, 'triangle', 0.12, 0.12); }
  trash() { this.noiseBurst(0.16, 0.25, 300); }
  fanfare() {
    [523, 659, 784, 1046].forEach((freq, i) => this.tone(freq, 0.22, 'triangle', 0.18, i * 0.11));
  }

  startSizzle() {
    if (!this.context || this.muted || this.sizzleNodes) return;
    const length = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3800;
    const gain = this.context.createGain();
    gain.gain.value = 0.045;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.context.destination);
    source.start();
    this.sizzleNodes = { source, gain };
  }

  stopSizzle() {
    if (!this.sizzleNodes) return;
    try { this.sizzleNodes.source.stop(); } catch { /* already stopped */ }
    this.sizzleNodes = null;
  }

  // A cheerful pentatonic loop: bass note plus a wandering melody note.
  startMusic() {
    if (!this.context || this.musicTimer) return;
    const bass = [130.8, 98, 110, 146.8];
    const melody = [523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33];
    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.context) return;
      const step = this.musicStep;
      this.tone(bass[step % bass.length], 0.42, 'sine', 0.07);
      if (step % 2 === 0) this.tone(melody[(step * 3 + 1) % melody.length], 0.22, 'triangle', 0.05);
      this.musicStep += 1;
    }, 300);
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
