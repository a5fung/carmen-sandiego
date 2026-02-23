// ===================================
// Carmen Sandiego — Game State Machine
// ===================================

// ===== Ranks =====
const RANKS = [
  { name: 'Rookie',           casesNeeded: 0 },
  { name: 'Sleuth',           casesNeeded: 2 },
  { name: 'Special Agent',    casesNeeded: 4 },
  { name: 'Super-Sleuth',     casesNeeded: 6 },
  { name: "Carmen's Nemesis", casesNeeded: 8 }
];

function getRank(casesCompleted) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (casesCompleted >= r.casesNeeded) rank = r;
  }
  return rank.name;
}

// ===== Save / Load =====
const SAVE_KEY = 'carmen_sandiego_save';

function getDefaultState() {
  return {
    currentCase: 1,
    currentCity: null,
    citiesVisited: [],
    cluesCollected: [],
    cluesUsed: [],
    dossier: { gender: null, hair: null, eyes: null, feature: null, hobby: null },
    warrantIssued: false,
    warrantTarget: null,
    movesUsed: 0,
    totalScore: 0,
    casesCompleted: [],
    fieldCharacterMet: { yuFuChen: false, uncleSilas: false }
  };
}

function saveState(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ===== Game Object =====
const Game = {
  state: null,
  currentCaseData: null,
  currentLocationData: null,
  currentSuspectData: null,
  destinationChoices: [],

  async init() {
    this.state = loadState() || getDefaultState();
    this.loadCurrentCaseData();
  },

  loadCurrentCaseData() {
    this.currentCaseData = getCaseById(this.state.currentCase);
    if (this.currentCaseData && this.state.currentCity) {
      this.currentLocationData = getLocationById(this.state.currentCity);
    }
    if (this.currentCaseData) {
      this.currentSuspectData = getSuspectById(this.currentCaseData.suspect);
    }
  },

  hasSave() { return !!loadState(); },

  getRank() { return getRank(this.state.casesCompleted.length); },

  getCompletedCases() { return this.state.casesCompleted; },

  // ===== Start a case =====
  async startCase(caseId) {
    const caseData = getCaseById(caseId);
    if (!caseData) return;

    this.currentCaseData = caseData;
    this.state.currentCase = caseId;
    this.state.currentCity = caseData.crimeCity;
    this.state.citiesVisited = [caseData.crimeCity];
    this.state.cluesCollected = [];
    this.state.cluesUsed = [];
    this.state.dossier = { gender: null, hair: null, eyes: null, feature: null, hobby: null };
    this.state.warrantIssued = false;
    this.state.warrantTarget = null;
    this.state.movesUsed = 0;
    this.state.fieldCharacterMet = { yuFuChen: false, uncleSilas: false };

    this.currentLocationData = getLocationById(caseData.crimeCity);
    this.currentSuspectData = getSuspectById(caseData.suspect);
    saveState(this.state);

    showBriefing(caseData, () => this.enterLocation());
  },

  // ===== Enter a city =====
  async enterLocation() {
    const loc = this.currentLocationData;
    const caseData = this.currentCaseData;

    // Play the case-specific theme (each of 8 cases has a distinct sound)
    // Always restarts so the player hears the travel fade-out/in on each city entry
    AudioManager.playCity(this.state.currentCity);

    const fieldAgent = this.getFieldAgentForCity();

    showLocation(loc, caseData, this.state, fieldAgent, {
      onClue:              (source) => this.handleClue(source),
      onChooseDestination: ()       => this.showDestinations(),
      onRequestWarrant:    ()       => this.showWarrant(),
      onArrest:            ()       => this.triggerArrest()
    });

    saveState(this.state);
  },

  // ===== Field agent =====
  getFieldAgentForCity() {
    const agent = this.currentCaseData?.fieldAgent;
    if (!agent) return null;

    const idx = (this.currentCaseData?.path || []).indexOf(this.state.currentCity);
    if (idx < 1) return null;

    if ((agent === 'yufu' || agent === 'both') && !this.state.fieldCharacterMet.yuFuChen) {
      this.state.fieldCharacterMet.yuFuChen = true;
      return 'yufu';
    }
    if ((agent === 'silas' || agent === 'both') && !this.state.fieldCharacterMet.uncleSilas) {
      this.state.fieldCharacterMet.uncleSilas = true;
      return 'silas';
    }
    return null;
  },

  // ===== Handle clue =====
  async handleClue(source) {
    if ((this.state.cluesUsed || []).includes(source)) return;

    const clueText = getClueText(this.currentCaseData, this.state.currentCity, source);

    const trait = extractSuspectTrait(clueText, this.currentSuspectData);
    if (trait && !this.state.dossier[trait.trait]) {
      this.state.dossier[trait.trait] = trait.value;
    }

    if (!this.state.cluesUsed) this.state.cluesUsed = [];
    if (!this.state.cluesCollected) this.state.cluesCollected = [];
    this.state.cluesUsed.push(source);
    this.state.cluesCollected.push({ source, text: clueText, trait: trait?.trait || null, value: trait?.value || null });

    const confirmed = countConfirmedTraits(this.state.dossier);
    saveState(this.state);

    revealClue(source, clueText, getSourceLabel(source), this.state);
    updateDossier(this.state.dossier);
    updateWarrantButton(confirmed >= 3 && !this.state.warrantIssued);

    if (this.state.cluesUsed.length >= 1) {
      const isFinal = isFinalCity(this.currentCaseData, this.state.currentCity);
      if (isFinal) {
        showArrestOption(() => this.triggerArrest());
      } else {
        enableDestinationButton(true);
      }
    }
  },

  // ===== Show destinations =====
  async showDestinations() {
    this.destinationChoices = buildDestinationChoices(this.currentCaseData, this.state.currentCity);
    showTravelScreen(this.destinationChoices, (choice) => this.handleDestination(choice));
  },

  // ===== Handle destination pick =====
  async handleDestination(choice) {
    this.state.movesUsed++;
    saveState(this.state);

    if (choice.isCorrect) {
      this.state.currentCity = choice.id;
      this.state.citiesVisited.push(choice.id);
      this.state.cluesUsed = [];
      this.currentLocationData = getLocationById(choice.id);
      saveState(this.state);
      this.enterLocation();
    } else {
      this.state.movesUsed++;
      saveState(this.state);
      showColdTrail(choice.name, () => this.showDestinations());
    }
  },

  // ===== Warrant =====
  async showWarrant() {
    const allSuspects = getAllSuspects();
    showWarrantScreen(allSuspects, this.state.dossier, (selectedId) => this.issueWarrant(selectedId));
  },

  async issueWarrant(suspectId) {
    this.state.warrantIssued = true;
    this.state.warrantTarget = suspectId;
    saveState(this.state);

    showLocation(this.currentLocationData, this.currentCaseData, this.state, null, {
      onClue:              (source) => this.handleClue(source),
      onChooseDestination: ()       => this.showDestinations(),
      onRequestWarrant:    ()       => this.showWarrant(),
      onArrest:            ()       => this.triggerArrest()
    });
    updateWarrantStatus(true, suspectId);
  },

  // ===== Arrest =====
  async triggerArrest() {
    if (!isFinalCity(this.currentCaseData, this.state.currentCity)) {
      showMessage("The suspect hasn't been cornered yet. Follow the trail!");
      return;
    }

    if (!this.state.warrantIssued) {
      this.showArrestResult('no_warrant');
    } else if (this.state.warrantTarget !== this.currentCaseData.suspect) {
      this.showArrestResult('wrong_warrant');
    } else {
      this.showArrestResult('success');
    }
  },

  async showArrestResult(result) {
    const suspect = this.currentSuspectData;
    const caseData = this.currentCaseData;

    if (result === 'success') {
      const baseScore  = 1000;
      const penalty    = this.state.movesUsed * 30;
      const speedBonus = Math.max(0, 500 - this.state.movesUsed * 50);
      const caseScore  = Math.max(100, baseScore - penalty + speedBonus);

      this.state.totalScore += caseScore;
      if (!this.state.casesCompleted.includes(caseData.id)) {
        this.state.casesCompleted.push(caseData.id);
      }
      saveState(this.state);

      showArrestScreen('success', suspect, caseData, () => this.showDebrief(caseScore, speedBonus));
    } else {
      const wrongName = this.state.warrantTarget
        ? this.state.warrantTarget.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())
        : 'unknown';
      const reason = result === 'no_warrant'
        ? 'You had no arrest warrant! The suspect escaped before you could make the arrest.'
        : `Wrong warrant! You had a warrant for ${wrongName}, but that wasn't the criminal. They got away!`;

      showArrestScreen('failure', suspect, caseData, () => this.showGameOver(reason, caseData), reason);
    }
  },

  // ===== Debrief =====
  async showDebrief(caseScore, speedBonus) {
    const rank = getRank(this.state.casesCompleted.length);
    const isLast = this.currentCaseData.id === 8;

    showDebriefScreen(
      this.currentCaseData, this.state, caseScore, speedBonus, rank,
      () => { isLast ? this.showWinScreen() : this.advanceToNextCase(); },
      () => goToMainMenu()
    );
  },

  async advanceToNextCase() {
    const nextId = this.state.currentCase + 1;
    const next = getCaseById(nextId);
    if (!next) { this.showWinScreen(); return; }
    await this.startCase(nextId);
  },

  showGameOver(reason, caseData) {
    showGameOverScreen(reason, caseData, {
      onRetry: () => this.startCase(this.state.currentCase),
      onMenu:  () => goToMainMenu()
    });
  },

  showWinScreen() {
    const rank = getRank(this.state.casesCompleted.length);
    showWinScreen(this.state, rank);
  },

  // ===== New game / Continue =====
  async newGame() {
    clearSave();
    this.state = getDefaultState();
    await this.startCase(1);
  },

  async continueGame() {
    this.loadCurrentCaseData();
    if (this.state.currentCity) {
      this.enterLocation();
    } else {
      await this.startCase(this.state.currentCase);
    }
  }
};
