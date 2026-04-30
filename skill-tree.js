// ── SKILL TREE ──────────────────────────────────────────────────────────────

const SKILLS = [
  // TRAIL
  {
    id: 'trail_length',
    section: 'Trail',
    icon: '∿',
    name: 'Echo Trail',
    desc: 'Your trace leaves a longer luminous ghost behind',
    maxLevel: 6,
    costs: [120, 280, 560, 1100, 2200, 4800],
    effect: (lvl) => ({ trailLength: 40 + lvl * 30 }),
  },
  {
    id: 'trail_glow',
    section: 'Trail',
    icon: '◉',
    name: 'Radiance',
    desc: 'Trail emits a wider, brighter halo of light',
    maxLevel: 5,
    costs: [200, 450, 900, 1800, 3800],
    effect: (lvl) => ({ trailGlow: lvl }),
  },
  {
    id: 'trail_color',
    section: 'Trail',
    icon: '≋',
    name: 'Spectral Shift',
    desc: 'Trail cycles through shifting hues as you move',
    maxLevel: 4,
    costs: [350, 800, 1600, 3500],
    effect: (lvl) => ({ trailSpectral: lvl }),
  },

  // CIRCLES
  {
    id: 'circle_pulse',
    section: 'Circles',
    icon: '○',
    name: 'Pulse Ring',
    desc: 'Circles emit expanding pulse rings as they wait',
    maxLevel: 4,
    costs: [180, 400, 850, 1800],
    effect: (lvl) => ({ circlePulse: lvl }),
  },
  {
    id: 'circle_burst',
    section: 'Circles',
    icon: '✦',
    name: 'Impact Burst',
    desc: 'Hitting a circle releases a larger particle explosion',
    maxLevel: 6,
    costs: [150, 320, 680, 1400, 2800, 5500],
    effect: (lvl) => ({ burstParticles: 8 + lvl * 10 }),
  },
  {
    id: 'circle_shockwave',
    section: 'Circles',
    icon: '◎',
    name: 'Shockwave',
    desc: 'A rippling shockwave expands outward on each hit',
    maxLevel: 3,
    costs: [500, 1200, 2800],
    effect: (lvl) => ({ shockwave: lvl }),
  },

  // SCORING
  {
    id: 'score_multi',
    section: 'Scoring',
    icon: '×',
    name: 'Multiplier',
    desc: 'Combo counter grows faster, decays slower',
    maxLevel: 5,
    costs: [300, 700, 1500, 3200, 7000],
    effect: (lvl) => ({ comboSpeed: lvl }),
  },
  {
    id: 'score_time',
    section: 'Scoring',
    icon: '◷',
    name: 'Time Dilation',
    desc: 'Circles linger on screen slightly longer before vanishing',
    maxLevel: 4,
    costs: [400, 900, 1900, 4000],
    effect: (lvl) => ({ extraTime: lvl * 600 }),
  },
  {
    id: 'score_lives',
    section: 'Scoring',
    icon: '♡',
    name: 'Resilience',
    desc: 'Begin each run with one additional life',
    maxLevel: 3,
    costs: [800, 2000, 5000],
    effect: (lvl) => ({ bonusLives: lvl }),
  },

  // AESTHETICS
  {
    id: 'fx_screenshake',
    section: 'Feedback',
    icon: '⌇',
    name: 'Screen Tremor',
    desc: 'Canvas shakes violently on each circle hit',
    maxLevel: 3,
    costs: [250, 600, 1400],
    effect: (lvl) => ({ screenShake: lvl }),
  },
  {
    id: 'fx_flash',
    section: 'Feedback',
    icon: '◼',
    name: 'Impact Flash',
    desc: 'A white flash strobes harder on each connection',
    maxLevel: 3,
    costs: [200, 500, 1100],
    effect: (lvl) => ({ flashIntensity: lvl }),
  },
  {
    id: 'fx_ink',
    section: 'Feedback',
    icon: '⬡',
    name: 'Ink Splatter',
    desc: 'Dark ink blots radiate outward from each hit',
    maxLevel: 4,
    costs: [350, 750, 1600, 3400],
    effect: (lvl) => ({ inkSplatter: lvl }),
  },
];

// ── SAVE / LOAD ──────────────────────────────────────────────────────────────

const ST = {
  levels: {},   // skillId → current level (0 = not bought)
  points: 0,    // lifetime points earned
  spent: 0,     // points spent

  available() { return this.points - this.spent; },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('trace_st') || '{}');
      this.levels = d.levels || {};
      this.points = d.points || 0;
      this.spent  = d.spent  || 0;
    } catch(e) { this.levels = {}; this.points = 0; this.spent = 0; }
  },

  save() {
    localStorage.setItem('trace_st', JSON.stringify({
      levels: this.levels, points: this.points, spent: this.spent
    }));
  },

  addPoints(n) {
    this.points += n;
    this.save();
  },

  buy(skillId) {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;
    const cur = this.levels[skillId] || 0;
    if (cur >= skill.maxLevel) return false;
    const cost = skill.costs[cur];
    if (this.available() < cost) return false;
    this.spent += cost;
    this.levels[skillId] = cur + 1;
    this.save();
    return true;
  },

  // Build merged effect object from all purchased skills
  effects() {
    const fx = {
      trailLength: 40,
      trailGlow: 0,
      trailSpectral: 0,
      circlePulse: 0,
      burstParticles: 8,
      shockwave: 0,
      comboSpeed: 0,
      extraTime: 0,
      bonusLives: 0,
      screenShake: 0,
      flashIntensity: 0,
      inkSplatter: 0,
    };
    for (const skill of SKILLS) {
      const lvl = this.levels[skill.id] || 0;
      if (lvl > 0) Object.assign(fx, skill.effect(lvl));
    }
    return fx;
  },
};

ST.load();

// ── SKILL TREE UI ────────────────────────────────────────────────────────────

function renderSkillTree() {
  const scroll = document.getElementById('st-scroll');
  const ptsEl  = document.getElementById('st-pts');
  ptsEl.textContent = ST.available().toLocaleString();

  const avail = ST.available();
  let html = '';
  let lastSection = null;

  for (const skill of SKILLS) {
    if (skill.section !== lastSection) {
      html += `<div class="skill-section-title">${skill.section}</div>`;
      lastSection = skill.section;
    }
    const lvl   = ST.levels[skill.id] || 0;
    const maxed = lvl >= skill.maxLevel;
    const cost  = maxed ? 0 : skill.costs[lvl];
    const canBuy = !maxed && avail >= cost;
    const cardClass = maxed ? 'maxed' : lvl > 0 ? 'unlocked' : '';

    html += `
    <div class="skill-card ${cardClass}" id="card-${skill.id}">
      <div class="skill-icon">${skill.icon}</div>
      <div class="skill-info">
        <div class="skill-name">${skill.name}</div>
        <div class="skill-desc">${skill.desc}</div>
        ${!maxed ? `<button class="skill-btn ${canBuy ? 'affordable' : ''}"
          onclick="buySkill('${skill.id}')"
          ${canBuy ? '' : 'disabled'}>
          ${cost.toLocaleString()} pts — upgrade
        </button>` : `<div class="skill-btn" style="opacity:0.4;pointer-events:none">Mastered</div>`}
      </div>
      <div class="skill-right">
        <div class="skill-level">${lvl}<span style="font-size:14px;color:var(--mid)">/${skill.maxLevel}</span></div>
        ${!maxed ? `<div class="skill-cost ${canBuy ? 'can-afford' : ''}">${cost.toLocaleString()} pts</div>` : ''}
      </div>
    </div>`;
  }

  scroll.innerHTML = html;
}

function buySkill(id) {
  if (ST.buy(id)) {
    renderSkillTree();
    // small haptic-like flash
    const flash = document.getElementById('flash');
    flash.style.opacity = '0.07';
    setTimeout(() => flash.style.opacity = '0', 120);
  }
}
