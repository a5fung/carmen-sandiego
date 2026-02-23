// ===================================
// Carmen Sandiego — Entry Point
// ===================================

const isGamePage = !!document.getElementById('briefing-screen');
const isMenuPage = !!document.getElementById('title-screen');

// ===== GAME PAGE =====
if (isGamePage) {
  (async () => {
    await Game.init();

    // New Game: clear all previous progress before starting
    const isNewGame = localStorage.getItem('carmen_new_game');
    if (isNewGame) {
      localStorage.removeItem('carmen_new_game');
      await Game.newGame();
      return;
    }

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
      localStorage.setItem('carmen_new_game', '1');
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

    // ── Press-to-start handler ─────────────────────────────────────────────
    // Browser autoplay policy blocks audio until the first user gesture.
    // The press-start overlay captures that click, starts the intro music,
    // then fades away to reveal the interactive menu buttons.
    const pressStart  = document.getElementById('press-start');
    const menuButtons = document.getElementById('menu-buttons');

    if (pressStart) {
      document.addEventListener('click', () => {
        // Start intro music — now we have a user gesture so AudioContext works
        AudioManager.playIntro();

        // Fade out the press-start prompt
        pressStart.style.transition = 'opacity 0.4s ease';
        pressStart.style.opacity    = '0';
        setTimeout(() => { pressStart.style.display = 'none'; }, 400);

        // Reveal the menu buttons
        if (menuButtons) {
          menuButtons.style.transition  = 'opacity 0.5s ease 0.15s, transform 0.5s ease 0.15s';
          menuButtons.style.opacity     = '1';
          menuButtons.style.transform   = 'translateY(0)';
          menuButtons.style.pointerEvents = 'auto';
        }
      }, { once: true });
    }
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
