// ===================================
// Carmen Sandiego — Audio Manager
// ===================================

const AudioManager = (() => {
  let currentTrack = null;
  let enabled = true;

  function getAudio() {
    return document.getElementById('bg-music');
  }

  function fadeTo(targetVol, duration = 800) {
    const audio = getAudio();
    if (!audio) return;
    const startVol = audio.volume;
    const diff = targetVol - startVol;
    const steps = 20;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      audio.volume = Math.max(0, Math.min(1, startVol + (diff * step / steps)));
      if (step >= steps) clearInterval(timer);
    }, interval);
  }

  function play(trackSrc) {
    const audio = getAudio();
    if (!enabled || !audio) return;
    if (trackSrc === currentTrack) return;
    fadeTo(0, 600);
    setTimeout(() => {
      audio.src = trackSrc;
      audio.volume = 0;
      audio.play().catch(() => {
        console.info('Music autoplay blocked. Click anything to start music.');
      });
      fadeTo(0.5, 800);
      currentTrack = trackSrc;
    }, 650);
  }

  function stop() {
    const audio = getAudio();
    if (!audio) return;
    fadeTo(0, 600);
    setTimeout(() => {
      audio.pause();
      audio.src = '';
      currentTrack = null;
    }, 650);
  }

  function toggle() {
    enabled = !enabled;
    if (!enabled) { stop(); } else if (currentTrack) { play(currentTrack); }
    return enabled;
  }

  function isEnabled() { return enabled; }

  document.addEventListener('click', () => {
    const audio = getAudio();
    if (enabled && audio && audio.paused && currentTrack) {
      audio.play().catch(() => {});
    }
  }, { once: true });

  return { play, stop, toggle, isEnabled };
})();
