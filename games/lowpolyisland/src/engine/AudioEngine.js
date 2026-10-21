import { CUSTOM_AUDIO_TRACKS } from '../config/audioTracks.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.bpm = 164;
    this.masterGain = null;
    this.visualizerData = new Uint8Array(16);
    this.analyser = null;

    // HTML5 Audio element for custom file playback
    this.audioEl = null;
    this.mediaSourceNode = null;

    // Track unlock registry (saved in localStorage)
    this.unlockedTapes = new Set();
    this._loadUnlockedTapes();

    // Default procedural synthesizer track presets
    this.proceduralTracks = [
      {
        id: "synth_atlantic",
        title: "ATLANTIC BREEZE (LIQUID MIX)",
        artist: "LOW-POLY SOUNDSYSTEM",
        bpm: 164,
        key: "F#m9",
        locked: false,
        chords: [
          [277.18, 369.99, 440.00, 554.37], // F#m9 (C#4, F#4, A4, C#5)
          [293.66, 369.99, 440.00, 587.33], // Dmaj7 (D4, F#4, A4, D5)
          [246.94, 329.63, 392.00, 493.88], // Bm7 (B3, E4, G4, B4)
          [220.00, 329.63, 440.00, 554.37], // Aadd9 (A3, E4, A4, C#5)
        ]
      },
      {
        id: "synth_twilight",
        title: "TWILIGHT OVER THE REEF",
        artist: "ORBITAL RUNNER",
        bpm: 162,
        key: "Ebm7",
        locked: false,
        chords: [
          [311.13, 369.99, 466.16, 554.37], // Ebm9
          [261.63, 329.63, 392.00, 523.25], // Cbmaj7
          [233.08, 349.23, 440.00, 523.25], // Bbm7
          [293.66, 369.99, 440.00, 587.33], // Abm7
        ]
      },
      {
        id: "synth_dreamcast",
        title: "DREAMCAST MEMORY (1998)",
        artist: "VIRTUAL HORIZON",
        bpm: 166,
        key: "C#m7",
        locked: false,
        chords: [
          [277.18, 329.63, 415.30, 493.88], // C#m7
          [220.00, 277.18, 329.63, 440.00], // Amaj7
          [246.94, 311.13, 369.99, 493.88], // Badd9
          [329.63, 415.30, 493.88, 659.25], // Emaj9
        ]
      },
      {
        id: "synth_rooftops",
        title: "CYBER ROOFTOPS (TECHSTEP VIP)",
        artist: "NEO TOKYO UNIT",
        bpm: 166,
        key: "Dm9",
        locked: false,
        chords: [
          [293.66, 349.23, 440.00, 523.25], // Dm7
          [261.63, 329.63, 392.00, 493.88], // Cmaj7
          [246.94, 311.13, 369.99, 440.00], // Bdim
          [233.08, 293.66, 349.23, 466.16], // Bbmaj7
        ]
      },
      {
        id: "synth_overpass",
        title: "NEON OVERPASS (LIQUID FUNK)",
        artist: "CIRCUIT RUNNER",
        bpm: 168,
        key: "Gm7",
        locked: false,
        chords: [
          [392.00, 466.16, 587.33, 739.99], // Gm9
          [349.23, 440.00, 523.25, 659.25], // Fmaj7
          [311.13, 392.00, 466.16, 587.33], // Ebmaj7
          [293.66, 369.99, 440.00, 554.37], // D7sus4
        ]
      }
    ];

    // Combine custom tracks with procedural presets
    this.tracks = this._buildTrackList();
    this.currentTrackIndex = 0;
    this.currentChordIndex = 0;
    this.step = 0;
    this.timerId = null;
    this.oceanNode = null;

    // Check for optional public/audio/playlist.json asynchronously
    this._fetchPublicPlaylist();
  }

  _buildTrackList() {
    const list = [];
    // 1. Add any custom tracks from src/config/audioTracks.js
    if (Array.isArray(CUSTOM_AUDIO_TRACKS) && CUSTOM_AUDIO_TRACKS.length > 0) {
      CUSTOM_AUDIO_TRACKS.forEach((t) => {
        if (t && t.title) list.push(t);
      });
    }
    // 2. Add procedural synth tracks
    this.proceduralTracks.forEach((pt) => list.push(pt));
    return list;
  }

  async _fetchPublicPlaylist() {
    try {
      const res = await fetch('/audio/playlist.json');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const valid = json.filter((t) => t.file && t.file.trim().length > 0);
          if (valid.length > 0) {
            // Prepend valid custom tracks
            const formatted = valid.map((t) => ({
              ...t,
              file: t.file.startsWith('/') || t.file.startsWith('http') ? t.file : `/audio/${t.file}`
            }));
            this.tracks = [...formatted, ...this.proceduralTracks];
            console.log(`[AudioEngine] Loaded ${formatted.length} custom audio tracks from /audio/playlist.json`);
          }
        }
      }
    } catch {
      // Ignore if playlist.json is not present or invalid
    }
  }

  _loadUnlockedTapes() {
    try {
      const stored = localStorage.getItem('lowpoly_unlocked_tapes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.unlockedTapes = new Set(parsed);
        }
      }
    } catch {
      this.unlockedTapes = new Set();
    }
  }

  unlockTape(tapeId) {
    if (!tapeId) return null;
    this.unlockedTapes.add(tapeId);
    try {
      localStorage.setItem('lowpoly_unlocked_tapes', JSON.stringify([...this.unlockedTapes]));
    } catch {}

    const unlocked = this.tracks.find((t) => t.tapeId === tapeId);
    if (unlocked) {
      unlocked.locked = false;
      return unlocked;
    }
    return null;
  }

  isTrackLocked(track) {
    if (!track) return false;
    if (!track.locked) return false;
    if (track.tapeId && this.unlockedTapes.has(track.tapeId)) {
      return false;
    }
    return true;
  }

  setTrack(index) {
    if (index >= 0 && index < this.tracks.length) {
      this.currentTrackIndex = index;
      this.bpm = this.tracks[index].bpm || 164;
      this.currentChordIndex = 0;
      this.step = 0;
      if (this.isPlaying) {
        this.stop();
        this.play();
      }
      return this.getCurrentTrack();
    }
    return this.getCurrentTrack();
  }

  _initContext() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

    // Analyser node for walkman visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 32;

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Ambient ocean waves sound generator
    this._startOceanWash();
  }

  getCurrentTrack() {
    const track = this.tracks[this.currentTrackIndex] || this.proceduralTracks[0];
    const isLocked = this.isTrackLocked(track);
    return {
      ...track,
      isLocked,
      displayTitle: isLocked ? `📼 ${track.title} [LOCKED]` : track.title,
      displayArtist: isLocked ? `FIND CASSETTE TAPE TO UNLOCK` : track.artist
    };
  }

  setVolume(vol) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }

  togglePlay() {
    this._initContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  play() {
    this._initContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;

    const track = this.getCurrentTrack();

    // If track is locked behind a tape collectible
    if (this.isTrackLocked(track)) {
      console.log(`[AudioEngine] Track "${track.title}" is locked. Find its cassette tape to unlock!`);
      this.stop();
      return;
    }

    // 1. If custom audio file is specified
    if (track.file) {
      this._playAudioFile(track);
      return;
    }

    // 2. Fallback to procedural DnB synthesizer
    this._playProceduralSynth(track);
  }

  _playAudioFile(track) {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';
      this.audioEl.addEventListener('ended', () => {
        this.nextTrack();
      });
      this.audioEl.addEventListener('error', (e) => {
        console.warn(`[AudioEngine] Could not load audio file "${track.file}". Falling back to procedural synth.`, e);
        this._playProceduralSynth(track);
      });
    }

    // Route audioEl through masterGain & analyser so Walkman visualizer and reels react!
    if (!this.mediaSourceNode && this.ctx) {
      try {
        this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioEl);
        this.mediaSourceNode.connect(this.masterGain);
      } catch (err) {
        console.warn('[AudioEngine] MediaElementSource note:', err);
      }
    }

    if (this.audioEl.src !== track.file && !this.audioEl.src.endsWith(track.file)) {
      this.audioEl.src = track.file;
      this.audioEl.load();
    }

    this.audioEl.play().catch((err) => {
      console.warn(`[AudioEngine] Audio element play failed, falling back to synth:`, err);
      this._playProceduralSynth(track);
    });
  }

  _playProceduralSynth(track) {
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }

    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }

    this.step = 0;
    this.currentChordIndex = 0;
    this.bpm = track.bpm || 164;

    const interval = (60 / this.bpm) / 4 * 1000; // 16th note in ms
    if (track.chords && track.chords.length > 0) {
      this._playPadChord();
    }
    this.timerId = setInterval(() => {
      this._onTick();
    }, interval);
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.currentChordIndex = 0;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
    return this.getCurrentTrack();
  }

  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.currentChordIndex = 0;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
    return this.getCurrentTrack();
  }

  _onTick() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const s = this.step % 16;

    // Atmospheric Breakbeat pattern (classic rolling jungle/dnb syncopation)
    // Kick: steps 0, 10
    if (s === 0 || s === 10) {
      this._triggerKick(now, s === 0 ? 1.0 : 0.7);
    }

    // Snare / Rim: steps 4, 12, plus syncopated ghost hit at step 7 or 15
    if (s === 4 || s === 12) {
      this._triggerSnare(now, 0.85);
    } else if (s === 7 || s === 15) {
      this._triggerSnare(now, 0.4, true); // Ghost snare
    }

    // Rolling Hi-hats: 16th notes with groove velocity
    let hatVel = 0.22;
    if (s % 2 === 0) hatVel = 0.45;
    if (s % 4 === 2) hatVel = 0.6;
    this._triggerHat(now, hatVel);

    // Deep sub / Reese bass trigger
    if (s === 0 || s === 6 || s === 10) {
      const track = this.tracks[this.currentTrackIndex];
      if (track && track.chords && track.chords[this.currentChordIndex]) {
        const baseFreq = track.chords[this.currentChordIndex][0] / 4; // 2 octaves below
        this._triggerSubBass(now, baseFreq);
      }
    }

    // Step progression
    this.step++;
    // Advance chord every 32 steps (2 bars)
    if (this.step % 32 === 0) {
      const track = this.tracks[this.currentTrackIndex];
      if (track && track.chords && track.chords.length > 0) {
        this.currentChordIndex = (this.currentChordIndex + 1) % track.chords.length;
        this._playPadChord();
      }
    }
  }

  _triggerKick(time, vel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    // Pitch envelope drop
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.7 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  _triggerSnare(time, vel, isGhost = false) {
    // Noise burst for snare snap
    const bufferSize = this.ctx.sampleRate * (isGhost ? 0.08 : 0.16);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(isGhost ? 1400 : 900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((isGhost ? 0.2 : 0.5) * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isGhost ? 0.09 : 0.18));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  _triggerHat(time, vel) {
    const osc = this.ctx.createOscillator();
    osc.type = 'highpass';
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2 * vel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  _triggerSubBass(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.45, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.52);
  }

  _playPadChord() {
    if (!this.ctx || !this.isPlaying) return;
    const track = this.tracks[this.currentTrackIndex];
    const chord = track.chords[this.currentChordIndex];
    const duration = (60 / this.bpm) * 8; // 2 bars duration

    const now = this.ctx.currentTime;

    // Filtered saw/sine pad with slow chorus detune
    chord.forEach((freq, idx) => {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const padGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.004, now); // slight chorus detuning

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 250, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(700, now + duration);

      // Smooth envelope attack and release
      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.linearRampToValueAtTime(0.09, now + 1.2);
      padGain.gain.setValueAtTime(0.09, now + duration - 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(padGain);
      padGain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    });
  }

  _startOceanWash() {
    if (!this.ctx) return;
    // Continuous soft ocean waves in background
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);

    // LFO for wave surges
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 second wave cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const oceanGain = this.ctx.createGain();
    oceanGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(oceanGain);
    oceanGain.connect(this.masterGain);

    whiteNoise.start();
    lfo.start();
  }

  getVisualizerData() {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.visualizerData);
    }
    return this.visualizerData;
  }
}
