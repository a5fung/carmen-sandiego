// ===================================
// Carmen Sandiego — UI / Rendering
// ===================================

// ===== Screen System =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

// ===== Helpers =====
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text || '');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function getCharName(key) {
  return { kenny:'Dr. Kenny', al:'Al — Crime Net', yufu:'Yu-Fu Chen', silas:'Uncle Silas' }[key] || key;
}

function getCharEmoji(key) {
  return { kenny:'🧪', al:'📡', yufu:'🔎', silas:'🎩' }[key] || '👤';
}

function getFieldAgentDialogue(agentKey, caseId) {
  const d = {
    yufu: {
      default: 'The patterns here suggest deliberate misdirection. Stay methodical, Detective.',
      3: 'This is my territory. Watch and learn — but not too slowly.',
      6: 'I intercepted a communication. The target is more tech-savvy than most. Be cautious.',
      8: 'The trail ends here. I have never hunted anyone like this. Be ready for anything.'
    },
    silas: {
      default: 'In my day, we followed our gut. Your gut should be telling you something right now.',
      2: "Cairo hasn't changed in fifty years. Neither has a criminal's arrogance.",
      4: "I've tracked suspects from Buenos Aires to Nairobi. This one moves like a dancer — literally.",
      8: "I've been chasing Carmen Sandiego my entire career. Don't let her slip through your fingers, rookie."
    }
  };
  const ag = d[agentKey] || {};
  return ag[caseId] || ag.default || 'Keep your eyes open, Detective.';
}

// ===== Briefing Screen =====
let _briefingCallback = null;

function showBriefing(caseData, onBegin) {
  showScreen('briefing-screen');
  _briefingCallback = onBegin;

  const charKey = caseData.briefingCharacter;
  setEl('briefing-case-title', `Case ${caseData.id}: ${caseData.title}`);
  setEl('briefing-stolen-item', caseData.stolenItem);
  setEl('briefing-crime-location', `Location: ${caseData.crimeCity.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}`);
  setEl('briefing-text', caseData.briefingText);
  setEl('briefing-char-name', getCharName(charKey));

  const portrait = document.getElementById('briefing-portrait');
  if (portrait) portrait.innerHTML = `<span style="font-size:3rem">${getCharEmoji(charKey)}</span>`;

  const btn = document.getElementById('btn-begin-investigation');
  if (btn) { btn.onclick = null; btn.onclick = () => { if (_briefingCallback) _briefingCallback(); }; }
}

// ===== Location Screen =====
let _locCallbacks = {};

function showLocation(loc, caseData, state, fieldAgent, callbacks) {
  showScreen('location-screen');
  _locCallbacks = callbacks || {};

  if (!loc) return;

  // City visuals — real landmark photo with colour-tinted fallback
  const cityImage = document.getElementById('city-image');
  if (cityImage) {
    const imgPath = `assets/images/locations/${loc.id}.jpg`;
    cityImage.innerHTML = '';
    cityImage.style.backgroundImage = `url('${imgPath}')`;
    cityImage.style.backgroundSize  = 'cover';
    cityImage.style.backgroundPosition = 'center';
    // Fallback: if image fails to load, show gradient + emoji
    const testImg = new Image();
    testImg.onload = () => {};
    testImg.onerror = () => {
      cityImage.style.backgroundImage = 'none';
      cityImage.style.background = `linear-gradient(135deg, ${loc.color || '#1a1f36'} 0%, #0a0a15 100%)`;
      cityImage.innerHTML = `<span style="font-size:8rem">${getCityEmoji(loc.id)}</span>`;
    };
    testImg.src = imgPath;
  }

  setEl('city-name', loc.name);
  setEl('city-country', loc.country);
  setEl('city-region-badge', loc.region);
  setEl('city-description', loc.description || '');
  setEl('status-case-name', `${caseData.id}: ${caseData.title}`);
  setEl('status-moves', state.movesUsed);

  updateWarrantStatus(state.warrantIssued, state.warrantTarget);

  // Clue buttons
  ['witness', 'search', 'crimenet'].forEach(source => {
    const btn = document.getElementById(`btn-${source}`);
    if (!btn) return;
    const isUsed = (state.cluesUsed || []).includes(source);
    btn.classList.toggle('used', isUsed);
    btn.disabled = isUsed;
    const statusEl = document.getElementById(`clue-status-${source}`);
    if (statusEl) statusEl.textContent = isUsed ? '✓ Done' : '';
    btn.onclick = isUsed ? null : () => { if (_locCallbacks.onClue) _locCallbacks.onClue(source); };
  });

  // Hide clue reveal area
  document.getElementById('clue-reveal-area')?.classList.add('hidden');

  // Rebuild log
  rebuildClueLog(state.cluesCollected || []);

  // Dossier
  updateDossier(state.dossier);

  // Warrant button
  const confirmedCount = Object.values(state.dossier).filter(v => v !== null).length;
  updateWarrantButton(confirmedCount >= 3 && !state.warrantIssued);
  const warrantBtn = document.getElementById('btn-request-warrant');
  if (warrantBtn) warrantBtn.onclick = () => { if (_locCallbacks.onRequestWarrant) _locCallbacks.onRequestWarrant(); };

  // Destination / Arrest button
  const isFinal = caseData.path[caseData.path.length - 1] === state.currentCity;
  const hasClues = (state.cluesUsed || []).length >= 1;
  const destBtn = document.getElementById('btn-choose-destination');
  if (destBtn) {
    if (isFinal) {
      destBtn.textContent = '🚔 Make Arrest';
      destBtn.disabled = !hasClues;
      destBtn.onclick = hasClues ? () => { if (_locCallbacks.onArrest) _locCallbacks.onArrest(); } : null;
    } else {
      destBtn.textContent = 'Choose Next Destination →';
      destBtn.disabled = !hasClues;
      destBtn.onclick = hasClues ? () => { if (_locCallbacks.onChooseDestination) _locCallbacks.onChooseDestination(); } : null;
    }
  }

  // Field agent
  const agentPanel = document.getElementById('field-agent-panel');
  if (fieldAgent && agentPanel) {
    agentPanel.classList.remove('hidden');
    const agPic = document.getElementById('field-agent-portrait');
    const agName = document.getElementById('field-agent-name');
    const agSpeech = document.getElementById('field-agent-speech');
    if (agPic) agPic.innerHTML = `<span>${getCharEmoji(fieldAgent)}</span>`;
    if (agName) agName.textContent = getCharName(fieldAgent);
    if (agSpeech) agSpeech.textContent = getFieldAgentDialogue(fieldAgent, caseData.id);
  } else if (agentPanel) {
    agentPanel.classList.add('hidden');
  }

  // Audio toggle
  const audioBtn = document.getElementById('btn-toggle-audio');
  if (audioBtn) {
    audioBtn.onclick = () => {
      const enabled = AudioManager.toggle();
      audioBtn.textContent = enabled ? '♪ Music ON' : '♪ Music OFF';
    };
  }
}

function enableDestinationButton(enabled) {
  const btn = document.getElementById('btn-choose-destination');
  if (!btn) return;
  btn.disabled = !enabled;
  if (enabled && _locCallbacks.onChooseDestination) {
    btn.onclick = () => _locCallbacks.onChooseDestination();
  }
}

function showArrestOption(onArrest) {
  const btn = document.getElementById('btn-choose-destination');
  if (!btn) return;
  btn.textContent = '🚔 Make Arrest';
  btn.disabled = false;
  btn.onclick = () => onArrest();
}

// ===== Clue Reveal =====
function revealClue(source, text, label, state) {
  const revealArea = document.getElementById('clue-reveal-area');
  if (revealArea) revealArea.classList.remove('hidden');
  setEl('clue-source-label', label);

  const bubbleEl = document.getElementById('clue-bubble-text');
  if (bubbleEl) {
    bubbleEl.textContent = text;
    bubbleEl.classList.add('animate-in');
    setTimeout(() => bubbleEl.classList.remove('animate-in'), 500);
  }

  addClueToLog(source, text);

  // Mark button used
  const btn = document.getElementById(`btn-${source}`);
  if (btn) {
    btn.classList.add('used');
    btn.disabled = true;
    btn.onclick = null;
    const statusEl = document.getElementById(`clue-status-${source}`);
    if (statusEl) statusEl.textContent = '✓ Done';
  }

  // Enable destination button if not final city
  const destBtn = document.getElementById('btn-choose-destination');
  if (destBtn && destBtn.disabled) {
    destBtn.disabled = false;
    const isFinalArrest = destBtn.textContent.includes('Arrest');
    if (!isFinalArrest && _locCallbacks.onChooseDestination) {
      destBtn.onclick = () => _locCallbacks.onChooseDestination();
    } else if (isFinalArrest && _locCallbacks.onArrest) {
      destBtn.onclick = () => _locCallbacks.onArrest();
    }
  }
}

function rebuildClueLog(clues) {
  const log = document.getElementById('clues-log');
  if (!log) return;
  log.innerHTML = '';
  if (!clues || clues.length === 0) {
    log.innerHTML = '<p class="clues-empty">No clues yet. Start investigating!</p>';
    return;
  }
  clues.forEach(c => addClueToLog(c.source, c.text));
}

function addClueToLog(source, text) {
  const log = document.getElementById('clues-log');
  if (!log) return;
  const empty = log.querySelector('.clues-empty');
  if (empty) empty.remove();
  const icons = { witness: '👁', search: '🔍', crimenet: '📡' };
  const entry = document.createElement('div');
  entry.className = 'clue-entry animate-in';
  entry.innerHTML = `<span class="clue-entry-icon">${icons[source] || '📌'}</span><span class="clue-entry-text">${escapeHtml(text)}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// ===== Dossier =====
function updateDossier(dossier) {
  ['gender', 'hair', 'eyes', 'feature', 'hobby'].forEach(trait => {
    const row = document.getElementById(`dossier-${trait}`);
    if (!row) return;
    const valEl = row.querySelector('.dossier-value');
    if (!valEl) return;
    if (dossier[trait]) {
      valEl.textContent = dossier[trait];
      valEl.className = 'dossier-value confirmed';
      row.classList.add('confirmed');
    } else {
      valEl.textContent = 'Unknown';
      valEl.className = 'dossier-value unknown';
      row.classList.remove('confirmed');
    }
  });
}

function updateWarrantButton(enabled) {
  const btn = document.getElementById('btn-request-warrant');
  if (btn) btn.disabled = !enabled;
}

function updateWarrantStatus(issued, targetId) {
  const el = document.getElementById('status-warrant');
  if (!el) return;
  if (issued && targetId) {
    const name = targetId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
    el.textContent = `Issued: ${name}`;
    el.style.color = '#e74c3c';
  } else {
    el.textContent = 'Not Issued';
    el.style.color = '';
  }
}

// ===== Travel Screen =====
function showTravelScreen(choices, onSelect) {
  showScreen('travel-screen');
  const container = document.getElementById('destination-cards');
  if (!container) return;
  container.innerHTML = '';
  document.getElementById('cold-trail-msg')?.classList.add('hidden');
  container.classList.remove('hidden');

  choices.forEach(choice => {
    const card = document.createElement('div');
    card.className = 'dest-card animate-in';
    card.innerHTML = `
      <div class="dest-card-thumb" style="background-image:url('assets/images/locations/${choice.id}.jpg');background-size:cover;background-position:center;width:100%;height:110px;border-radius:8px;margin-bottom:12px;background-color:${choice.color||'#1a1f36'}"></div>
      <div class="dest-card-name">${escapeHtml(choice.name)}</div>
      <div class="dest-card-country">${escapeHtml(choice.country)}</div>
      <div class="dest-card-region">${escapeHtml(choice.region)}</div>
    `;
    card.onclick = () => onSelect(choice);
    container.appendChild(card);
  });
}

function showColdTrail(cityName, onContinue) {
  document.getElementById('destination-cards')?.classList.add('hidden');
  const coldTrail = document.getElementById('cold-trail-msg');
  if (coldTrail) coldTrail.classList.remove('hidden');
  setEl('cold-trail-text', `${cityName} was a dead end. The trail went cold here. You lost 2 moves.`);
  const btn = document.getElementById('btn-cold-continue');
  if (btn) btn.onclick = () => onContinue();
}

// ===== Warrant Screen =====
function showWarrantScreen(suspects, dossier, onIssue) {
  showScreen('warrant-screen');

  const traitLabels = { gender:'Gender', hair:'Hair', eyes:'Eyes', feature:'Feature', hobby:'Hobby' };
  const traitsPanel = document.getElementById('warrant-traits-summary');
  if (traitsPanel) {
    traitsPanel.innerHTML = ['gender','hair','eyes','feature','hobby'].map(t => `
      <div class="trait-summary-row">
        <span class="trait-summary-label">${traitLabels[t]}</span>
        <span class="trait-summary-value ${dossier[t] ? '' : 'unknown'}">${dossier[t] || 'Unknown'}</span>
      </div>`).join('');
  }

  const lineup = document.getElementById('suspects-lineup');
  if (!lineup) return;
  lineup.innerHTML = '';

  let selectedId = null;
  suspects.forEach(suspect => {
    const card = document.createElement('div');
    card.className = 'suspect-card';
    const pills = ['gender','hair','eyes','feature','hobby'].map(t => {
      const matches = dossier[t] && dossier[t] === suspect[t];
      return `<span class="trait-pill ${matches ? 'match' : ''}">${escapeHtml(suspect[t] || '?')}</span>`;
    }).join('');
    card.innerHTML = `
      <div class="suspect-mugshot">${getSuspectEmoji(suspect.id)}</div>
      <div class="suspect-name">${escapeHtml(suspect.name)}</div>
      <div class="suspect-trait-pills">${pills}</div>
    `;
    card.onclick = () => {
      lineup.querySelectorAll('.suspect-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedId = suspect.id;
      const issueBtn = document.getElementById('btn-issue-warrant');
      if (issueBtn) issueBtn.disabled = false;
    };
    lineup.appendChild(card);
  });

  const issueBtn = document.getElementById('btn-issue-warrant');
  if (issueBtn) {
    issueBtn.disabled = true;
    issueBtn.onclick = () => { if (selectedId) onIssue(selectedId); };
  }

  const backBtn = document.getElementById('btn-back-from-warrant');
  if (backBtn) backBtn.onclick = () => showScreen('location-screen');
}

// ===== Arrest Screen =====
function showArrestScreen(result, suspect, caseData, onContinue, failReason) {
  showScreen('arrest-screen');
  const container = document.getElementById('arrest-container');
  if (!container) return;

  if (result === 'success') {
    container.innerHTML = `
      <div class="arrest-success">
        <div class="arrest-badge">🚔</div>
        <h1 class="arrest-title">Arrested!</h1>
        <p class="arrest-description">
          You've apprehended <strong>${escapeHtml(suspect.name)}</strong>!<br><br>
          <em>${escapeHtml(suspect.description)}</em><br><br>
          The ${escapeHtml(caseData.stolenItem)} has been recovered and will be returned to its rightful place.
        </p>
        <button class="action-btn primary large" id="btn-arrest-continue">Continue →</button>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="arrest-failure">
        <div class="arrest-badge" style="font-size:5rem">${failReason && failReason.includes('no arrest') ? '📋' : '❌'}</div>
        <h1 class="arrest-title failure" style="font-family:var(--font-display);font-size:2rem;color:var(--acme-red)">
          ${failReason && failReason.includes('no arrest') ? 'Suspect Escaped!' : 'Wrong Suspect!'}
        </h1>
        <p class="arrest-description" style="color:var(--text-light);margin:16px 0 24px">${escapeHtml(failReason || '')}</p>
        <button class="action-btn primary" id="btn-arrest-continue">View Report</button>
      </div>`;
  }

  document.getElementById('btn-arrest-continue')?.addEventListener('click', onContinue, { once: true });
}

// ===== Debrief Screen =====
function showDebriefScreen(caseData, state, caseScore, speedBonus, rank, onNext, onMenu) {
  showScreen('debrief-screen');

  const charKey = caseData.debriefCharacter;
  const isLastCase = caseData.id === 8;

  setEl('debrief-title', 'Case Closed!');
  setEl('debrief-char-name', getCharName(charKey));
  setEl('debrief-speech', caseData.debriefText);
  setEl('score-moves', state.movesUsed);
  setEl('score-bonus', `+${speedBonus}`);
  setEl('score-total', caseScore);
  setEl('debrief-rank', rank);

  const portrait = document.getElementById('debrief-portrait');
  if (portrait) portrait.innerHTML = `<span style="font-size:3rem">${getCharEmoji(charKey)}</span>`;

  const nextBtn = document.getElementById('btn-next-case');
  if (nextBtn) {
    nextBtn.textContent = isLastCase ? '🏆 See Final Results' : 'Next Case →';
    nextBtn.onclick = () => onNext();
  }

  const menuBtn = document.getElementById('btn-main-menu');
  if (menuBtn) menuBtn.onclick = () => onMenu();
}

// ===== Game Over Screen =====
function showGameOverScreen(reason, caseData, callbacks) {
  showScreen('gameover-screen');
  const container = document.getElementById('gameover-container');
  if (!container) return;

  container.innerHTML = `
    <div style="font-size:5rem;margin-bottom:16px">😞</div>
    <h1 style="font-family:var(--font-display);font-size:2rem;color:var(--acme-red);margin-bottom:16px">Case Failed</h1>
    <p style="color:var(--text-light);margin-bottom:16px;line-height:1.6">${escapeHtml(reason)}</p>
    <p style="color:var(--text-light);font-size:0.9rem;margin-bottom:32px;font-style:italic">
      The ${escapeHtml(caseData.stolenItem)} remains missing...
    </p>
    <div style="display:flex;gap:16px;justify-content:center">
      <button class="action-btn primary" id="btn-retry-case">Retry Case</button>
      <button class="action-btn secondary" id="btn-gameover-menu">Main Menu</button>
    </div>`;

  document.getElementById('btn-retry-case')?.addEventListener('click', callbacks.onRetry, { once: true });
  document.getElementById('btn-gameover-menu')?.addEventListener('click', callbacks.onMenu, { once: true });
}

// ===== Win Screen =====
function showWinScreen(state, rank) {
  showScreen('win-screen');

  const statsEl = document.getElementById('win-stats-content');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="score-row"><span>Cases Solved:</span><span>${state.casesCompleted.length} / 8</span></div>
      <div class="score-row"><span>Total Score:</span><span>${state.totalScore}</span></div>`;
  }

  setEl('win-final-rank', rank);

  document.getElementById('btn-credits')?.addEventListener('click', () => showScreen('credits-screen'));
  document.getElementById('btn-win-main-menu')?.addEventListener('click', () => goToMainMenu());
  document.getElementById('btn-close-credits')?.addEventListener('click', () => showScreen('win-screen'));
}

// ===== Navigation =====
function goToMainMenu() {
  window.location.href = 'index.html';
}

function showMessage(msg) {
  // Simple modal-style alert (could be enhanced)
  alert(msg);
}
