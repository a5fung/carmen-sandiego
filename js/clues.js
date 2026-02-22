// ===================================
// Carmen Sandiego — Clue System
// ===================================

function extractSuspectTrait(clueText, suspect) {
  if (!suspect || !clueText) return null;
  const text = clueText.toLowerCase();

  // Gender
  if ((text.includes(' man') || text.includes(' male') || text.includes(' gentleman') ||
       text.includes(' bloke') || text.includes(' fellow') || text.includes('older gentleman')) &&
      suspect.gender === 'Male') {
    return { trait: 'gender', value: 'Male' };
  }
  if ((text.includes(' woman') || text.includes(' female') || text.includes(' lady') ||
       text.includes(' girl')) && suspect.gender === 'Female') {
    return { trait: 'gender', value: 'Female' };
  }

  // Hair color
  const hairColors = {
    'brown hair': 'Brown', 'brown-haired': 'Brown',
    'blonde': 'Blonde', 'red hair': 'Red', 'red-haired': 'Red',
    'black hair': 'Black', 'silver hair': 'Silver',
    'purple hair': 'Purple'
  };
  for (const [key, val] of Object.entries(hairColors)) {
    if (text.includes(key) && suspect.hair === val) return { trait: 'hair', value: val };
  }

  // Eye color
  const eyeColors = {
    'blue eyes': 'Blue', 'green eyes': 'Green', 'hazel eyes': 'Hazel',
    'brown eyes': 'Brown', 'grey eyes': 'Grey', 'gray eyes': 'Grey'
  };
  for (const [key, val] of Object.entries(eyeColors)) {
    if (text.includes(key) && suspect.eyes === val) return { trait: 'eyes', value: val };
  }

  // Distinguishing feature
  const featureHints = {
    'eyebrow': 'Bushy eyebrows', 'scar': 'Scar on chin',
    'glasses': 'Thick glasses', 'nails': 'Long painted nails',
    'mustache': 'Handle-bar mustache', 'tattoo': 'Cyberpunk tattoos',
    'monocle': 'Monocle', 'masked': 'Always masked', 'mask': 'Always masked'
  };
  for (const [key, val] of Object.entries(featureHints)) {
    if (text.includes(key) && suspect.feature === val) return { trait: 'feature', value: val };
  }

  // Hobby
  const hobbyHints = {
    'gym bag': 'Bodybuilding', 'bodybuilding': 'Bodybuilding',
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
    if (text.includes(key) && suspect.hobby === val) return { trait: 'hobby', value: val };
  }

  return null;
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
