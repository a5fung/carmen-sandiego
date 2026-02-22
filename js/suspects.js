// ===================================
// Carmen Sandiego — Suspects Module
// (data embedded for offline use)
// ===================================

const _SUSPECTS_DATA = {"suspects":[{"id":"nick_brunt","name":"Nick Brunt","case":1,"gender":"Male","hair":"Brown","eyes":"Blue","feature":"Bushy eyebrows","hobby":"Bodybuilding","description":"A brutish enforcer who uses his massive frame to intimidate witnesses. Surprisingly good at art theft.","mugshot":"assets/images/suspects/nick_brunt.svg"},{"id":"sarah_nade","name":"Sarah Nade","case":2,"gender":"Female","hair":"Blonde","eyes":"Green","feature":"Scar on chin","hobby":"Explosives","description":"A former demolitions expert who went rogue. Leaves a trail of dramatic exits.","mugshot":"assets/images/suspects/sarah_nade.svg"},{"id":"ivor_idea","name":"Ivor Idea","case":3,"gender":"Male","hair":"Red","eyes":"Hazel","feature":"Thick glasses","hobby":"Inventing gadgets","description":"A rogue inventor who builds elaborate contraptions for V.I.L.E. heists.","mugshot":"assets/images/suspects/ivor_idea.svg"},{"id":"nadia_slinsk","name":"Nadia Slinsk","case":4,"gender":"Female","hair":"Black","eyes":"Brown","feature":"Long painted nails","hobby":"Ballet","description":"Graceful and deadly. A former prima ballerina who now pirouettes through security systems.","mugshot":"assets/images/suspects/nadia_slinsk.svg"},{"id":"lars_vegas","name":"Lars Vegas","case":5,"gender":"Male","hair":"Blonde","eyes":"Blue","feature":"Handle-bar mustache","hobby":"Gambling","description":"A smooth-talking gambler who treats every heist like a high-stakes game.","mugshot":"assets/images/suspects/lars_vegas.svg"},{"id":"dee_cryption","name":"Dee Cryption","case":6,"gender":"Female","hair":"Purple","eyes":"Grey","feature":"Cyberpunk tattoos","hobby":"Hacking","description":"A cyberpunk prodigy who can crack any system. Her tattoos glow faintly in the dark.","mugshot":"assets/images/suspects/dee_cryption.svg"},{"id":"victor_flaute","name":"Victor Flauté","case":7,"gender":"Male","hair":"Silver","eyes":"Brown","feature":"Monocle","hobby":"Opera","description":"An aristocratic opera aficionado who steals masterpieces with theatrical flair.","mugshot":"assets/images/suspects/victor_flaute.svg"},{"id":"the_shadow","name":"The Shadow","case":8,"gender":"Unknown","hair":"Black","eyes":"Unknown","feature":"Always masked","hobby":"Stealth","description":"An enigma — a master of disguise who leaves no fingerprints and no witnesses.","mugshot":"assets/images/suspects/the_shadow.svg"}],"traitLabels":{"gender":"Gender","hair":"Hair Color","eyes":"Eye Color","feature":"Distinguishing Feature","hobby":"Known Hobby"}};

function getSuspectById(id) {
  return _SUSPECTS_DATA.suspects.find(s => s.id === id) || null;
}

function getAllSuspects() {
  return _SUSPECTS_DATA.suspects;
}

function countConfirmedTraits(dossier) {
  return ['gender', 'hair', 'eyes', 'feature', 'hobby']
    .filter(t => dossier[t] !== null && dossier[t] !== undefined).length;
}

function suspectMatchesDossier(suspect, dossier) {
  for (const trait of ['gender', 'hair', 'eyes', 'feature', 'hobby']) {
    if (dossier[trait] && dossier[trait] !== suspect[trait]) return false;
  }
  return true;
}

function getSuspectEmoji(suspectId) {
  const icons = {
    nick_brunt: '💪', sarah_nade: '💣', ivor_idea: '🔬',
    nadia_slinsk: '🦰', lars_vegas: '🎲', dee_cryption: '💻',
    victor_flaute: '🎭', the_shadow: '🕵️'
  };
  return icons[suspectId] || '👤';
}
