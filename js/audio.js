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
  let pendingPlayRegion = null;

  // ── Profiles: per-city (35) + regional fallbacks + intro ────────────────
  const PROFILES = {
    // ── Regional fallbacks ──────────────────────────────────────────────────
    Europe:        { scale:[0,2,4,5,7,9,11], root:261.63, tempo:72,  timbre:'strings', pad:true,  arp:true,  bassNote:130.81 },
    Asia:          { scale:[0,2,4,7,9],       root:293.66, tempo:60,  timbre:'bells',   pad:true,  arp:true,  bassNote:146.83 },
    Americas:      { scale:[0,3,5,7,10],      root:261.63, tempo:90,  timbre:'guitar',  pad:true,  arp:true,  bassNote:130.81 },
    Africa:        { scale:[0,2,3,5,7,9,10],  root:220.00, tempo:100, timbre:'marimba', pad:false, arp:true,  bassNote:110.00 },
    Oceania:       { scale:[0,2,4,6,7,9,11],  root:261.63, tempo:55,  timbre:'pad',     pad:true,  arp:false, bassNote:130.81 },
    'Middle East': { scale:[0,1,4,5,7,8,10],  root:293.66, tempo:65,  timbre:'oud',     pad:true,  arp:true,  bassNote:146.83 },

    // ── Title screen intro ──────────────────────────────────────────────────
    '__intro__': { scale:[0,3,5,6,7,10], root:261.63, tempo:116, timbre:'brass', pad:false, arp:true, bassNote:130.81 },

    // ── Europe ─────────────────────────────────────────────────────────────
    rome:        { scale:[0,2,4,5,7,9,11], root:293.66, tempo:72,  timbre:'strings', pad:true,  arp:true,  bassNote:146.83 }, // D major — classical grandeur
    paris:       { scale:[0,2,4,6,7,9,11], root:349.23, tempo:66,  timbre:'strings', pad:true,  arp:true,  bassNote:174.61 }, // F Lydian — romantic, dreamy
    london:      { scale:[0,2,3,5,7,9,10], root:246.94, tempo:76,  timbre:'pad',     pad:true,  arp:true,  bassNote:123.47 }, // B Dorian — cool, misty
    berlin:      { scale:[0,1,3,5,7,8,10], root:329.63, tempo:90,  timbre:'marimba', pad:false, arp:true,  bassNote:164.81 }, // E Phrygian — industrial, driving
    madrid:      { scale:[0,1,3,5,7,8,10], root:220.00, tempo:84,  timbre:'guitar',  pad:false, arp:true,  bassNote:110.00 }, // A Phrygian — flamenco passion
    athens:      { scale:[0,2,3,5,7,9,10], root:392.00, tempo:58,  timbre:'bells',   pad:true,  arp:true,  bassNote:196.00 }, // G Dorian — ancient, philosophical
    amsterdam:   { scale:[0,2,4,5,7,9,11], root:277.18, tempo:82,  timbre:'marimba', pad:false, arp:true,  bassNote:138.59 }, // C# major — bright, bustling
    vienna:      { scale:[0,2,4,5,7,9,11], root:415.30, tempo:63,  timbre:'strings', pad:true,  arp:true,  bassNote:207.65 }, // Ab major — waltz, grand
    prague:      { scale:[0,2,3,5,7,8,10], root:369.99, tempo:60,  timbre:'oud',     pad:true,  arp:true,  bassNote:185.00 }, // F# minor — gothic, mysterious
    lisbon:      { scale:[0,3,5,7,10],     root:220.00, tempo:54,  timbre:'oud',     pad:true,  arp:true,  bassNote:110.00 }, // A min pent — fado, melancholic

    // ── Asia ───────────────────────────────────────────────────────────────
    tokyo:       { scale:[0,2,4,7,9],      root:329.63, tempo:92,  timbre:'bells',   pad:false, arp:true,  bassNote:164.81 }, // E pentatonic — bright, modern
    beijing:     { scale:[0,2,4,7,9],      root:261.63, tempo:54,  timbre:'strings', pad:true,  arp:true,  bassNote:130.81 }, // C pentatonic — imperial, ancient
    bangkok:     { scale:[0,2,4,5,7,9,10], root:233.08, tempo:74,  timbre:'pad',     pad:true,  arp:true,  bassNote:116.54 }, // Bb Mixolydian — tropical, ornate
    mumbai:      { scale:[0,1,4,5,7,9,10], root:392.00, tempo:100, timbre:'marimba', pad:false, arp:true,  bassNote:196.00 }, // G raga — high energy
    istanbul:    { scale:[0,1,4,5,7,8,10], root:293.66, tempo:66,  timbre:'oud',     pad:true,  arp:true,  bassNote:146.83 }, // D Hijaz — Ottoman crossroads
    seoul:       { scale:[0,2,4,7,9],      root:369.99, tempo:86,  timbre:'bells',   pad:false, arp:true,  bassNote:185.00 }, // F# pentatonic — crisp, modern
    singapore:   { scale:[0,2,4,6,7,9,11], root:277.18, tempo:90,  timbre:'pad',     pad:false, arp:true,  bassNote:138.59 }, // C# Lydian — futuristic, clean
    kathmandu:   { scale:[0,2,5,7,9],      root:349.23, tempo:46,  timbre:'bells',   pad:true,  arp:false, bassNote:174.61 }, // F sus — mystical, high altitude

    // ── Americas ───────────────────────────────────────────────────────────
    new_york:       { scale:[0,3,5,6,7,10],    root:233.08, tempo:112, timbre:'brass',   pad:false, arp:true, bassNote:116.54 }, // Bb blues — jazz bebop
    mexico_city:    { scale:[0,2,4,5,7,9,11],  root:392.00, tempo:104, timbre:'guitar',  pad:false, arp:true, bassNote:196.00 }, // G major — mariachi, festive
    buenos_aires:   { scale:[0,2,3,5,7,8,10],  root:329.63, tempo:86,  timbre:'strings', pad:true,  arp:true, bassNote:164.81 }, // E minor — tango, passionate
    rio_de_janeiro: { scale:[0,2,4,7,9],        root:293.66, tempo:116, timbre:'marimba', pad:false, arp:true, bassNote:146.83 }, // D pentatonic — samba carnival
    havana:         { scale:[0,2,4,5,7,9,11],   root:415.30, tempo:108, timbre:'brass',   pad:false, arp:true, bassNote:207.65 }, // Ab major — salsa, tropical
    lima:           { scale:[0,3,5,7,10],        root:349.23, tempo:70,  timbre:'bells',   pad:true,  arp:true, bassNote:174.61 }, // F min pent — Andean, serene

    // ── Africa ─────────────────────────────────────────────────────────────
    cairo:       { scale:[0,1,4,5,7,8,10], root:220.00, tempo:58,  timbre:'oud',     pad:true,  arp:true,  bassNote:110.00 }, // A Hijaz — Egyptian, ancient
    nairobi:     { scale:[0,2,4,7,9],      root:196.00, tempo:88,  timbre:'marimba', pad:false, arp:true,  bassNote:98.00  }, // G pentatonic — African rhythms
    cape_town:   { scale:[0,2,4,5,7,9,11], root:261.63, tempo:76,  timbre:'guitar',  pad:false, arp:true,  bassNote:130.81 }, // C major — open, hopeful
    casablanca:  { scale:[0,2,3,5,7,8,10], root:185.00, tempo:62,  timbre:'oud',     pad:true,  arp:true,  bassNote:92.50  }, // F# minor — Moroccan, mysterious
    marrakech:   { scale:[0,1,3,5,7,8,10], root:293.66, tempo:96,  timbre:'marimba', pad:false, arp:true,  bassNote:146.83 }, // D Phrygian — souk, vibrant

    // ── Oceania ────────────────────────────────────────────────────────────
    sydney:    { scale:[0,2,4,5,7,9,11], root:440.00, tempo:78, timbre:'strings', pad:true,  arp:true, bassNote:220.00 }, // A major — sunny harbour
    auckland:  { scale:[0,2,4,6,7,9,11], root:329.63, tempo:65, timbre:'pad',     pad:true,  arp:true, bassNote:164.81 }, // E Lydian — expansive, peaceful
    honolulu:  { scale:[0,2,4,7,9],      root:349.23, tempo:74, timbre:'marimba', pad:false, arp:true, bassNote:174.61 }, // F pentatonic — Hawaiian, relaxed

    // ── Middle East ────────────────────────────────────────────────────────
    dubai:      { scale:[0,2,4,6,8,10], root:277.18, tempo:98, timbre:'pad',     pad:false, arp:true, bassNote:138.59 }, // C# whole tone — ultramodern
    jerusalem:  { scale:[0,2,3,5,7,8,10], root:196.00, tempo:52, timbre:'strings', pad:true, arp:true, bassNote:98.00 }, // G minor — ancient, sacred
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
  function noteFreq(rootHz, s) { return rootHz * Math.pow(2, s / 12); }
  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ── Instruments ───────────────────────────────────────────────────────────

  function makeOsc(type, freq, gainVal, attack, decay, sustain, release, when, duration) {
    const c = getCtx(), osc = c.createOscillator(), g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gainVal, when + attack);
    g.gain.linearRampToValueAtTime(gainVal * sustain, when + attack + decay);
    g.gain.setValueAtTime(gainVal * sustain, when + duration - release);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + duration + 0.05);
    activeNodes.push(osc, g);
  }

  function playBell(freq, vol, when, duration) {
    const c = getCtx();
    [1, 2, 3, 4.2].forEach((h, i) => {
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * h, when);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol / (i + 1), when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      osc.connect(g); g.connect(masterGain);
      osc.start(when); osc.stop(when + duration + 0.05);
      activeNodes.push(osc, g);
    });
  }

  function playPad(freq, vol, when, duration) {
    const c = getCtx();
    [1, 1.5, 2, 3].forEach((h, i) => {
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * h, when);
      osc.detune.setValueAtTime((i - 1.5) * 4, when);
      const hVol = vol / (i + 1);
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(hVol, when + 1.5);
      g.gain.setValueAtTime(hVol, when + duration - 1.5);
      g.gain.linearRampToValueAtTime(0, when + duration);
      osc.connect(g); g.connect(masterGain);
      osc.start(when); osc.stop(when + duration + 0.1);
      activeNodes.push(osc, g);
    });
  }

  function playPluck(freq, vol, when) {
    const c = getCtx(), osc = c.createOscillator(), filt = c.createBiquadFilter(), g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(2000, when);
    filt.frequency.exponentialRampToValueAtTime(300, when + 0.4);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.8);
    osc.connect(filt); filt.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + 1.0);
    activeNodes.push(osc, filt, g);
  }

  function playMarimba(freq, vol, when) {
    makeOsc('triangle', freq,     vol,        0.005, 0.05, 0.3, 0.3, when, 0.8);
    makeOsc('triangle', freq * 4, vol * 0.15, 0.005, 0.03, 0.1, 0.1, when, 0.3);
  }

  function playOud(freq, vol, when, duration) {
    const c = getCtx(), osc = c.createOscillator(), filt = c.createBiquadFilter(), g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.linearRampToValueAtTime(freq * 1.005, when + duration * 0.5);
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(freq * 2, when);
    filt.Q.setValueAtTime(3, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.04);
    g.gain.setValueAtTime(vol * 0.7, when + duration * 0.3);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(filt); filt.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + duration + 0.1);
    activeNodes.push(osc, filt, g);
  }

  function playDrone(freq, vol, when, duration) {
    const c = getCtx(), osc = c.createOscillator(), g = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 2);
    g.gain.setValueAtTime(vol, when + duration - 2);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + duration + 0.1);
    activeNodes.push(osc, g);
  }

  function playBrass(freq, vol, when, duration) {
    const c = getCtx(), osc = c.createOscillator(), filt = c.createBiquadFilter(), g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.98, when);
    osc.frequency.linearRampToValueAtTime(freq, when + 0.05);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq * 6, when);
    filt.frequency.exponentialRampToValueAtTime(freq * 2.5, when + duration);
    filt.Q.setValueAtTime(1.5, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.03);
    g.gain.setValueAtTime(vol * 0.85, when + duration * 0.6);
    g.gain.linearRampToValueAtTime(0, when + duration);
    osc.connect(filt); filt.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + duration + 0.1);
    activeNodes.push(osc, filt, g);
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────
  const LOOK_AHEAD = 0.1, SCHEDULE_INT = 80;
  let beatTime = 0, beatIndex = 0, currentProfile = null;

  function scheduleNote(when) {
    if (!currentProfile) return;
    const p = currentProfile, bps = p.tempo / 60, beat = 1 / bps;

    // Bass: walking pattern every 4 beats for brass; drone every 16 for others
    const bassPeriod = (p.timbre === 'brass') ? 4 : 16;
    if (beatIndex % bassPeriod === 0) {
      if (p.timbre === 'brass') {
        const walk = [0, 3, 7, 10];
        makeOsc('triangle', noteFreq(p.bassNote, walk[(beatIndex / 4) % 4]), 0.14, 0.02, 0.05, 0.5, 0.1, when, beat * 3.8);
      } else {
        playDrone(p.bassNote, 0.08, when, beat * 16);
      }
    }

    if (p.arp) {
      const skipBeat = (p.timbre === 'brass') && (beatIndex % 8 === 1 || beatIndex % 8 === 5);
      if (!skipBeat) {
        const octave  = beatIndex % 8 < 4 ? 1 : 2;
        const freq    = noteFreq(p.root, randPick(p.scale) + (octave - 1) * 12);
        const noteDur = beat * (beatIndex % 3 === 0 ? 1.5 : 0.75);
        switch (p.timbre) {
          case 'bells':   playBell(freq, 0.12, when, noteDur * 3); break;
          case 'guitar':  playPluck(freq, 0.15, when); break;
          case 'marimba': playMarimba(freq, 0.18, when); break;
          case 'oud':     playOud(freq, 0.14, when, noteDur * 1.5); break;
          case 'strings': makeOsc('sawtooth', freq, 0.07, 0.15, 0.1, 0.8, 0.3, when, noteDur * 2); break;
          case 'brass':   playBrass(freq, 0.15, when, noteDur * 0.85); break;
        }
      }
    }

    if (p.pad && beatIndex % 8 === 0) {
      [p.scale[0], p.scale[2], p.scale[4]].filter(x => x !== undefined).forEach(s => {
        playPad(noteFreq(p.root, s), p.timbre === 'pad' ? 0.06 : 0.04, when, beat * 8);
      });
    }

    beatIndex++;
    beatTime += beat;
  }

  function scheduler() {
    if (!ctx || !currentProfile) return;
    while (beatTime < ctx.currentTime + LOOK_AHEAD) scheduleNote(beatTime);
  }

  // ── Tear down current music and switch to a new profile ───────────────────
  // startDelay ms: 0 = instant, 1600 = crossfade (default)
  function startRegion(region, profile, startDelay) {
    if (startDelay === undefined) startDelay = 1600;
    if (currentRegion !== region) return;

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + (startDelay > 0 ? 1.5 : 0.05));

    setTimeout(() => {
      if (currentRegion !== region) return;
      activeNodes.forEach(n => { try { n.stop ? n.stop() : n.disconnect(); } catch(e){} });
      activeNodes = [];
      clearInterval(schedulerTimer);
      schedulerTimer = null;
      currentProfile = profile;
      beatTime  = ctx.currentTime + 0.1;
      beatIndex = 0;
      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.7, ctx.currentTime + (startDelay > 0 ? 2 : 0.8));
      schedulerTimer = setInterval(scheduler, SCHEDULE_INT);
    }, startDelay);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  // forceRestart: always restart even if same profile is already playing
  // startDelay:   ms before audio begins (default 1600; 0 = instant)
  function play(region, forceRestart, startDelay) {
    if (!enabled) return;
    if (!forceRestart && region === currentRegion && schedulerTimer !== null) return;
    currentRegion = region;
    const profile = PROFILES[region] || PROFILES['Europe'];
    getCtx();
    if (ctx.state === 'suspended') {
      pendingPlayRegion = region;
      ctx.resume().then(() => {
        if (pendingPlayRegion === region) {
          pendingPlayRegion = null;
          startRegion(region, profile, startDelay);
        }
      }).catch(() => {});
    } else {
      startRegion(region, profile, startDelay);
    }
  }

  // Play the city-specific theme; always restarts for city-travel feedback
  function playCity(cityId) {
    play(cityId, true);
  }

  // Play title-screen intro immediately (fast 0.8s fade-in, no pre-delay)
  function playIntro() {
    play('__intro__', true, 0);
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
        const r = currentRegion;
        currentRegion = null;
        play(r);
      }
    }
    return enabled;
  }

  function isEnabled() { return enabled; }

  // Retry any pending play on first user gesture (autoplay policy)
  document.addEventListener('click', () => {
    if (!ctx) return;
    const tryPending = () => {
      if (pendingPlayRegion && enabled) {
        const r = pendingPlayRegion;
        pendingPlayRegion = null;
        currentRegion = null;
        play(r);
      }
    };
    if (ctx.state === 'suspended') ctx.resume().then(tryPending).catch(() => {});
    else tryPending();
  }, { once: true });

  return { play, playCity, playIntro, stop, toggle, isEnabled };
})();
