// ===================================
// Carmen Sandiego — Entry Point
// ===================================

const isGamePage = !!document.getElementById('briefing-screen');
const isMenuPage = !!document.getElementById('title-screen');

// ===== GAME PAGE =====
if (isGamePage) {
  (async () => {
    await Game.init();

    const pendingCase = localStorage.getItem('carmen_pending_case');
    if (pendingCase) {
      localStorage.removeItem('carmen_pending_case');
      await Game.startCase(parseInt(pendingCase, 10));
      return;
    }

    const doResume = localStorage.getItem('carmen_resume');
    if (doResume) {
      localStorage.removeItem('carmen_resume');
      await Game.continueGame();
      return;
    }

    await Game.startCase(1);
  })();
}

// ===== MENU PAGE =====
if (isMenuPage) {
  (async () => {
    await Game.init();

    // Queue intro music — will start playing on first user interaction
    // (browser autoplay policy requires a user gesture before audio can run)
    AudioManager.playIntro();

    const hasSave        = Game.hasSave();
    const rank           = Game.getRank();
    const completedCases = Game.getCompletedCases();

    const continueBtn   = document.getElementById('btn-continue');
    const caseSelectBtn = document.getElementById('btn-case-select');
    const rankDisplay   = document.getElementById('rank-display');

    if (continueBtn)   continueBtn.disabled   = !hasSave;
    if (caseSelectBtn) caseSelectBtn.disabled  = completedCases.length === 0;
    if (rankDisplay && hasSave) rankDisplay.textContent = `Rank: ${rank}`;

    document.getElementById('btn-new-game')?.addEventListener('click', () => {
      localStorage.setItem('carmen_pending_case', '1');
      window.location.href = 'game.html';
    });

    document.getElementById('btn-continue')?.addEventListener('click', () => {
      if (!hasSave) return;
      localStorage.setItem('carmen_resume', '1');
      window.location.href = 'game.html';
    });

    document.getElementById('btn-case-select')?.addEventListener('click', () => {
      renderCaseSelectScreen(completedCases);
    });

    document.getElementById('btn-back-from-cases')?.addEventListener('click', () => {
      showScreen('title-screen');
    });
  })();
}

// ===== Case Select =====
async function renderCaseSelectScreen(completedCases) {
  showScreen('case-select-screen');

  const allCases = getAllCases();
  const grid = document.getElementById('case-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const c of allCases) {
    const isCompleted = completedCases.includes(c.id);
    const isAvailable = c.id === 1 || completedCases.includes(c.id - 1) || isCompleted;
    const isLocked    = !isAvailable;

    const loc      = getLocationById(c.crimeCity);
    const cityName = loc ? loc.name : c.crimeCity.replace(/_/g,' ').replace(/\b\w/g,ch=>ch.toUpperCase());

    const card = document.createElement('div');
    card.className = `case-card ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`;

    const badgeText  = isCompleted ? 'Solved' : (isLocked ? 'Locked' : 'Available');
    const badgeClass = isCompleted ? 'completed' : (isLocked ? 'locked' : 'available');

    card.innerHTML = `
      <div class="case-num">Case ${c.id}</div>
      <div class="case-title">${c.title}</div>
      <div class="case-subtitle">${c.subtitle}</div>
      <div class="case-crime-city">📍 ${cityName}</div>
      <div class="case-status-badge ${badgeClass}">${badgeText}</div>
    `;

    if (!isLocked) {
      card.onclick = () => {
        localStorage.setItem('carmen_pending_case', String(c.id));
        window.location.href = 'game.html';
      };
    }

    grid.appendChild(card);
  }
}
