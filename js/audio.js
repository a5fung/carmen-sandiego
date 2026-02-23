// ===================================
// Carmen Sandiego — Ambient Music Engine
// Procedural Web Audio API synthesis.
// No audio files required — works offline.
// ===================================

const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let currentRegion = null;
  let enabled = true;
  let schedulerTimer = null;
  let activeNodes = [];
  let pendingPlayRegion = null;  // queued for when AudioContext can resume

  // ── Region → scale + timbre profile ──────────────────────────────────────
  const PROFILES = {
    Europe: {
      // Romantic-era string/piano feel — C major with a hint of minor
      scale:    [0, 2, 4, 5, 7, 9, 11],   // C D E F G A B
      root:     261.63,                     // C4
      tempo:    72,
      timbre:   'strings',
      pad:      true,
      arp:      true,
      bassNote: 130.81                      // C3
    },
    Asia: {
      // Pentatonic — Japanese/Chinese feel
      scale:    [0, 2, 4, 7, 9],           // C D E G A
      root:     293.66,                     // D4
      tempo:    60,
      timbre:   'bells',
      pad:      true,
      arp:      true,
      bassNote: 146.83                      // D3
    },
    Americas: {
      // Minor pentatonic with rhythmic feel
      scale:    [0, 3, 5, 7, 10],          // C Eb F G Bb
      root:     261.63,
      tempo:    90,
      timbre:   'guitar',
      pad:      true,
      arp:      true,
      bassNote: 130.81
    },
    Africa: {
      // Dorian mode — earthy, percussive
      scale:    [0, 2, 3, 5, 7, 9, 10],   // C D Eb F G A Bb
      root:     220.00,                     // A3
      tempo:    100,
      timbre:   'marimba',
      pad:      false,
      arp:      true,
      bassNote: 110.00                      // A2
    },
    Oceania: {
      // Lydian — open, bright, expansive
      scale:    [0, 2, 4, 6, 7, 9, 11],   // C D E F# G A B
      root:     261.63,
      tempo:    55,
      timbre:   'pad',
      pad:      true,
      arp:      false,
      bassNote: 130.81
    },
    'Middle East': {
      // Phrygian dominant — Arabic maqam feel
      scale:    [0, 1, 4, 5, 7, 8, 10],   // C Db E F G Ab Bb
      root:     293.66,
      tempo:    65,
      timbre:   'oud',
      pad:      true,
      arp:      true,
      bassNote: 146.83
    },
    '__intro__': {
      // Original ACME detective theme — jazzy spy feel
      // Minor blues scale: tense, mysterious, upbeat
      scale:    [0, 3, 5, 6, 7, 10],      // C Eb F F# G Bb
      root:     261.63,                     // C4
      tempo:    116,
      timbre:   'brass',
      pad:      false,
      arp:      true,
      bassNote: 130.81                      // C3
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.connect(ctx.destination);
    }
    return ctx;
  }

  function noteFreq(rootHz, semitoneOffset) {
    return rootHz * Math.pow(2, semitoneOffset / 12);
  }

  function randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ── Oscillator-based instruments ──────────────────────────────────────────

  function makeOsc(type, freq, gainVal, attack, decay, sustain, release, when, duration) {
    const c = getCtx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gainVal, when + attack);
    g.gain.linearRampToValueAtTime(gainVal * sustain, when + attack + decay);
    g.gain.setValueAtTime(gainVal * sustain, when + duration - release);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(when);
    osc.stop(when + duration + 0.05);
    activeNodes.push(osc, g);
    return osc;
  }

  // ── Bells (sine + high harmonics) ─────────────────────────────────────────
  function playBell(freq, vol, when, duration) {
    const c = getCtx();
    [1, 2, 3, 4.2].forEach((harmonic, i) => {
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * harmonic, when);
      const hVol = vol / (i + 1);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(hVol, when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(when);
      osc.stop(when + duration + 0.05);
      activeNodes.push(osc, g);
    });
  }

  // ── Pad (layered sines, slow attack) ──────────────────────────────────────
  function playPad(freq, vol, when, duration) {
    const c = getCtx();
    [1, 1.5, 2, 3].forEach((harmonic, i) => {
      const osc  = c.createOscillator();
      const g    = c.createGain();
      osc.type   = 'sine';
      osc.frequency.setValueAtTime(freq * harmonic, when);
      osc.detune.setValueAtTime((i - 1.5) * 4, when); // slight detuning for warmth
      const hVol = vol / (i + 1);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(hVol, when + 1.5);
      g.gain.setValueAtTime(hVol, when + duration - 1.5);
      g.gain.linearRampToValueAtTime(0, when + duration);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(when);
      osc.stop(when + duration + 0.1);
      activeNodes.push(osc, g);
    });
  }

  // ── Pluck (sawtooth + sharp decay) ────────────────────────────────────────
  function playPluck(freq, vol, when) {
    const c   = getCtx();
    const osc = c.createOscillator();
    const filt = c.createBiquadFilter();
    const g   = c.createGain();
    osc.type  = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2000, when);
    filt.frequency.exponentialRampToValueAtTime(300, when + 0.4);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.8);
    osc.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    osc.start(when);
    osc.stop(when + 1.0);
    activeNodes.push(osc, filt, g);
  }

  // ── Marimba-ish (triangle + fast decay) ───────────────────────────────────
  function playMarimba(freq, vol, when) {
    makeOsc('triangle', freq, vol, 0.005, 0.05, 0.3, 0.3, when, 0.8);
    makeOsc('triangle', freq * 4, vol * 0.15, 0.005, 0.03, 0.1, 0.1, when, 0.3);
  }

  // ── Oud-ish (sawtooth + resonant filter) ──────────────────────────────────
  function playOud(freq, vol, when, duration) {
    const c    = getCtx();
    const osc  = c.createOscillator();
    const filt = c.createBiquadFilter();
    const g    = c.createGain();
    osc.type   = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.linearRampToValueAtTime(freq * 1.005, when + duration * 0.5);
    filt.type  = 'bandpass';
    filt.frequency.setValueAtTime(freq * 2, when);
    filt.Q.setValueAtTime(3, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.04);
    g.gain.setValueAtTime(vol * 0.7, when + duration * 0.3);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    osc.start(when);
    osc.stop(when + duration + 0.1);
    activeNodes.push(osc, filt, g);
  }

  // ── Bass drone ────────────────────────────────────────────────────────────
  function playDrone(freq, vol, when, duration) {
    const c   = getCtx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type  = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 2);
    g.gain.setValueAtTime(vol, when + duration - 2);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(when);
    osc.stop(when + duration + 0.1);
    activeNodes.push(osc, g);
  }

  // ── Brass/Horn (sawtooth + lowpass — spy/detective feel) ──────────────────
  function playBrass(freq, vol, when, duration) {
    const c    = getCtx();
    const osc  = c.createOscillator();
    const filt = c.createBiquadFilter();
    const g    = c.createGain();
    osc.type   = 'sawtooth';
    // Slight pitch bend up — real brass embouchure feel
    osc.frequency.setValueAtTime(freq * 0.98, when);
    osc.frequency.linearRampToValueAtTime(freq, when + 0.05);
    filt.type  = 'lowpass';
    filt.frequency.setValueAtTime(freq * 6, when);
    filt.frequency.exponentialRampToValueAtTime(freq * 2.5, when + duration);
    filt.Q.setValueAtTime(1.5, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.03);   // snappy attack
    g.gain.setValueAtTime(vol * 0.85, when + duration * 0.6);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    osc.start(when);
    osc.stop(when + duration + 0.1);
    activeNodes.push(osc, filt, g);
  }

  // ── Scheduler — the main loop ─────────────────────────────────────────────
  const LOOK_AHEAD   = 0.1;   // seconds
  const SCHEDULE_INT = 80;    // ms

  let beatTime   = 0;
  let beatIndex  = 0;
  let currentProfile = null;

  function scheduleNote(when) {
    if (!currentProfile) return;
    const p    = currentProfile;
    const bps  = p.tempo / 60;
    const beat = 1 / bps;

    // -- Bass: every 16 beats normally; walking pattern every 4 beats for brass/intro
    const bassPeriod = (p.timbre === 'brass') ? 4 : 16;
    if (beatIndex % bassPeriod === 0) {
      if (p.timbre === 'brass') {
        // Walking bass — root → m3 → 5th → m7th
        const walk      = [0, 3, 7, 10];
        const walkFreq  = noteFreq(p.bassNote, walk[(beatIndex / 4) % walk.length]);
        makeOsc('triangle', walkFreq, 0.14, 0.02, 0.05, 0.5, 0.1, when, beat * 3.8);
      } else {
        playDrone(p.bassNote, 0.08, when, beat * 16);
      }
    }

    // -- Arpeggio / melody notes
    if (p.arp) {
      // Syncopation for brass/intro: skip beats 1 and 5 of each 8-beat phrase
      const skipThisBeat = (p.timbre === 'brass') &&
                           (beatIndex % 8 === 1 || beatIndex % 8 === 5);

      if (!skipThisBeat) {
        const octave   = beatIndex % 8 < 4 ? 1 : 2;
        const semitone = randPick(p.scale);
        const freq     = noteFreq(p.root, semitone + (octave - 1) * 12);
        const noteDur  = beat * (beatIndex % 3 === 0 ? 1.5 : 0.75);

        switch (p.timbre) {
          case 'bells':
            playBell(freq, 0.12, when, noteDur * 3);
            break;
          case 'guitar':
            playPluck(freq, 0.15, when);
            break;
          case 'marimba':
            playMarimba(freq, 0.18, when);
            break;
          case 'oud':
            playOud(freq, 0.14, when, noteDur * 1.5);
            break;
          case 'strings':
            makeOsc('sawtooth', freq, 0.07, 0.15, 0.1, 0.8, 0.3, when, noteDur * 2);
            break;
          case 'brass':
            playBrass(freq, 0.15, when, noteDur * 0.85);
            break;
          default:
            break;
        }
      }
    }

    // -- Pad chord every 8 beats (not for brass/intro)
    if (p.pad && beatIndex % 8 === 0) {
      const chordDegrees = [p.scale[0], p.scale[2], p.scale[4]].filter(x => x !== undefined);
      chordDegrees.forEach(semitone => {
        const freq = noteFreq(p.root, semitone);
        playPad(freq, p.timbre === 'pad' ? 0.06 : 0.04, when, beat * 8);
      });
    }

    beatIndex++;
    beatTime += beat;
  }

  function scheduler() {
    if (!ctx || !currentProfile) return;
    while (beatTime < ctx.currentTime + LOOK_AHEAD) {
      scheduleNote(beatTime);
    }
  }

  // ── Internal: tear down current music and start a new profile ─────────────
  function startRegion(region, profile) {
    // Guard: if play() was called again before our timeout fired, abort
    if (currentRegion !== region) return;

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1.5);

    setTimeout(() => {
      if (currentRegion !== region) return;

      // Stop old audio nodes
      activeNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch(e){} });
      activeNodes = [];

      // Reset scheduler state
      clearInterval(schedulerTimer);
      schedulerTimer = null;
      currentProfile = profile;
      beatTime  = ctx.currentTime + 0.1;
      beatIndex = 0;

      // Fade in
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2);

      // Start scheduler loop
      schedulerTimer = setInterval(scheduler, SCHEDULE_INT);
    }, 1600);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  // forceRestart = true: always restart even if same region (e.g. travelling to a new city)
  function play(region, forceRestart) {
    if (!enabled) return;

    // Skip only if same region is already playing AND caller didn't force a restart
    if (!forceRestart && region === currentRegion && schedulerTimer !== null) return;

    currentRegion = region;
    const profile = PROFILES[region] || PROFILES['Europe'];

    getCtx();

    if (ctx.state === 'suspended') {
      // Store as pending; click handler below will retry once context resumes
      pendingPlayRegion = region;
      ctx.resume().then(() => {
        if (pendingPlayRegion === region) {
          pendingPlayRegion = null;
          startRegion(region, profile);
        }
      }).catch(() => { /* retry happens via click handler */ });
    } else {
      startRegion(region, profile);
    }
  }

  function playIntro() {
    play('__intro__', true);
  }

  function stop() {
    enabled = false;
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    if (!ctx) return;
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1);
    setTimeout(() => {
      activeNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch(e){} });
      activeNodes = [];
      currentProfile = null;
    }, 1200);
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) {
      stop();
    } else {
      enabled = true;
      if (currentRegion) {
        // Restart the current region (schedulerTimer is null after stop)
        const r = currentRegion;
        currentRegion = null;  // force play() to not skip
        play(r);
      }
    }
    return enabled;
  }

  function isEnabled() { return enabled; }

  // Resume AudioContext and retry any pending play on first user gesture
  document.addEventListener('click', () => {
    if (!ctx) return;
    const tryPending = () => {
      if (pendingPlayRegion && enabled) {
        const r = pendingPlayRegion;
        pendingPlayRegion = null;
        currentRegion = null;  // force play() to proceed
        play(r);
      }
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(tryPending).catch(() => {});
    } else {
      tryPending();
    }
  }, { once: true });

  return { play, stop, toggle, isEnabled, playIntro };
})();
