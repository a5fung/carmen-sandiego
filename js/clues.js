// ===================================
// Carmen Sandiego — Clue System
// ===================================

// Returns ALL matching suspect traits from a single clue (a clue can reveal multiple traits).
function extractSuspectTraits(clueText, suspect) {
  if (!suspect || !clueText) return [];
  const text = clueText.toLowerCase();
  const found = {};

  // Gender
  if ((text.includes(' man') || text.includes(' male') || text.includes(' gentleman') ||
       text.includes(' bloke') || text.includes(' fellow') || text.includes('older gentleman')) &&
      suspect.gender === 'Male') {
    found.gender = 'Male';
  } else if ((text.includes(' woman') || text.includes(' female') || text.includes(' lady') ||
       text.includes(' girl')) && suspect.gender === 'Female') {
    found.gender = 'Female';
  }

  // Hair color
  const hairColors = {
    'brown hair': 'Brown', 'brown-haired': 'Brown',
    'blonde': 'Blonde', 'red hair': 'Red', 'red-haired': 'Red',
    'black hair': 'Black', 'silver hair': 'Silver', 'purple hair': 'Purple'
  };
  for (const [key, val] of Object.entries(hairColors)) {
    if (text.includes(key) && suspect.hair === val && !found.hair) found.hair = val;
  }

  // Eye color
  const eyeColors = {
    'blue eyes': 'Blue', 'green eyes': 'Green', 'hazel eyes': 'Hazel',
    'brown eyes': 'Brown', 'grey eyes': 'Grey', 'gray eyes': 'Grey'
  };
  for (const [key, val] of Object.entries(eyeColors)) {
    if (text.includes(key) && suspect.eyes === val && !found.eyes) found.eyes = val;
  }

  // Distinguishing feature
  const featureHints = {
    'eyebrow': 'Bushy eyebrows', 'scar': 'Scar on chin',
    'glasses': 'Thick glasses', 'nails': 'Long painted nails',
    'mustache': 'Handle-bar mustache', 'tattoo': 'Cyberpunk tattoos',
    'monocle': 'Monocle', 'masked': 'Always masked', 'mask': 'Always masked'
  };
  for (const [key, val] of Object.entries(featureHints)) {
    if (text.includes(key) && suspect.feature === val && !found.feature) found.feature = val;
  }

  // Hobby
  const hobbyHints = {
    'gym bag': 'Bodybuilding', 'bodybuilding': 'Bodybuilding', 'bodybuilder': 'Bodybuilding',
    'flexing': 'Bodybuilding', 'explosives': 'Explosives',
    'fuse': 'Explosives', 'gunpowder': 'Explosives',
    'gadgets': 'Inventing gadgets', 'inventing': 'Inventing gadgets',
    'circuit board': 'Inventing gadgets', 'gyroscope': 'Inventing gadgets',
    'ballet': 'Ballet', 'pirouett': 'Ballet', 'danc': 'Ballet',
    'poker': 'Gambling', 'gambling': 'Gambling', 'casino': 'Gambling',
    'jackpot': 'Gambling', 'betting': 'Gambling',
    'hacking': 'Hacking', 'hack': 'Hacking', 'decrypts': 'Hacking',
    'three phones': 'Hacking', 'opera': 'Opera', 'aria': 'Opera',
    'humming': 'Opera', 'masked figure': 'Stealth', 'smoke': 'Stealth'
  };
  for (const [key, val] of Object.entries(hobbyHints)) {
    if (text.includes(key) && suspect.hobby === val && !found.hobby) found.hobby = val;
  }

  return Object.entries(found).map(([trait, value]) => ({ trait, value }));
}

// Legacy single-trait wrapper (kept for compatibility)
function extractSuspectTrait(clueText, suspect) {
  const traits = extractSuspectTraits(clueText, suspect);
  return traits[0] || null;
}

function getClueText(caseData, cityId, source) {
  const cityClues = caseData.clues[cityId];
  if (!cityClues) return 'Nothing more to find here.';
  return cityClues[source] || 'Nothing more to find here.';
}

function getSourceLabel(source) {
  const labels = {
    witness: '👁 Witness Interview',
    search: '🔍 Area Search',
    crimenet: '📡 Crime Net'
  };
  return labels[source] || source;
}
