const SKILLS = [
  // ── TRAIL ──────────────────────────────────────────────
  {
    id: 'trail_length', section: 'Trail', tier: 1,
    icon: '∿', name: 'Echo Trail',
    desc: 'Your trace leaves a longer luminous ghost behind you',
    maxLevel: 8, costs: [80, 180, 380, 760, 1500, 3000, 6000, 12000],
    effect: (lvl) => ({ trailLength: 40 + lvl * 35 }),
  },
  {
    id: 'trail_glow', section: 'Trail', tier: 1,
    icon: '◉', name: 'Radiance',
    desc: 'Trail emits a wider, brighter halo of diffused light',
    maxLevel: 6, costs: [150, 350, 750, 1600, 3400, 7200],
    effect: (lvl) => ({ trailGlow: lvl }),
  },
  {
    id: 'trail_width', section: 'Trail', tier: 1,
    icon: '═', name: 'Thick Line',
    desc: 'Your trace becomes broader and more imposing',
    maxLevel: 5, costs: [120, 280, 600, 1300, 2800],
    effect: (lvl) => ({ trailWidth: 2.5 + lvl * 1.8 }),
  },
  {
    id: 'trail_color', section: 'Trail', tier: 2,
    icon: '≋', name: 'Spectral Shift',
    desc: 'Trail cycles through shifting spectral hues as you move',
    maxLevel: 5, costs: [300, 700, 1500, 3200, 7000],
    effect: (lvl) => ({ trailSpectral: lvl }),
    requires: 'trail_glow',
  },
  {
    id: 'trail_fire', section: 'Trail', tier: 2,
    icon: '🔥', name: 'Ember Wake',
    desc: 'Tiny embers drift upward from your trail as you move',
    maxLevel: 4, costs: [500, 1200, 2600, 5800],
    effect: (lvl) => ({ trailEmbers: lvl }),
    requires: 'trail_length',
  },
  {
    id: 'trail_ghost', section: 'Trail', tier: 3,
    icon: '◌', name: 'Phantom Echo',
    desc: 'A second ghost trail lags behind at half opacity',
    maxLevel: 3, costs: [2000, 5000, 11000],
    effect: (lvl) => ({ trailGhost: lvl }),
    requires: 'trail_color',
  },

  // ── CIRCLES ────────────────────────────────────────────
  {
    id: 'circle_pulse', section: 'Circles', tier: 1,
    icon: '○', name: 'Pulse Ring',
    desc: 'Circles emit expanding pulse rings as they wait to be hit',
    maxLevel: 5, costs: [150, 350, 750, 1600, 3500],
    effect: (lvl) => ({ circlePulse: lvl }),
  },
  {
    id: 'circle_burst', section: 'Circles', tier: 1,
    icon: '✦', name: 'Impact Burst',
    desc: 'Hitting a circle releases a larger particle explosion',
    maxLevel: 8, costs: [100, 220, 480, 1000, 2100, 4400, 9000, 18000],
    effect: (lvl) => ({ burstParticles: 8 + lvl * 12 }),
  },
  {
    id: 'circle_shockwave', section: 'Circles', tier: 2,
    icon: '◎', name: 'Shockwave',
    desc: 'A rippling shockwave expands outward from each hit',
    maxLevel: 5, costs: [400, 950, 2100, 4600, 10000],
    effect: (lvl) => ({ shockwave: lvl }),
    requires: 'circle_pulse',
  },
  {
    id: 'circle_chain', section: 'Circles', tier: 2,
    icon: '⬡', name: 'Chain React',
    desc: 'Hitting a circle sends a shockwave that can trigger nearby circles too',
    maxLevel: 3, costs: [1200, 3000, 7000],
    effect: (lvl) => ({ chainRadius: lvl * 60 }),
    requires: 'circle_burst',
  },
  {
    id: 'circle_magnet', section: 'Circles', tier: 2,
    icon: '⊕', name: 'Gravity Well',
    desc: 'Circles slowly drift toward your cursor while you hold',
    maxLevel: 4, costs: [600, 1400, 3100, 6800],
    effect: (lvl) => ({ magnetStrength: lvl * 0.4 }),
    requires: 'circle_pulse',
  },
  {
    id: 'circle_aura', section: 'Circles', tier: 3,
    icon: '❋', name: 'Corona Aura',
    desc: 'A warm corona glows around each circle proportional to its remaining life',
    maxLevel: 3, costs: [3000, 7500, 16000],
    effect: (lvl) => ({ circleAura: lvl }),
    requires: 'circle_shockwave',
  },
  {
    id: 'circle_split', section: 'Circles', tier: 3,
    icon: '⊛', name: 'Fission',
    desc: 'Large circles split into two smaller ones on hit instead of vanishing',
    maxLevel: 3, costs: [4000, 9000, 20000],
    effect: (lvl) => ({ circleSplit: lvl }),
    requires: 'circle_chain',
  },

  // ── SCORING ────────────────────────────────────────────
  {
    id: 'score_multi', section: 'Scoring', tier: 1,
    icon: '×', name: 'Multiplier',
    desc: 'Combo counter grows faster and decays more slowly',
    maxLevel: 7, costs: [200, 480, 1000, 2100, 4400, 9200, 19000],
    effect: (lvl) => ({ comboSpeed: lvl }),
  },
  {
    id: 'score_time', section: 'Scoring', tier: 1,
    icon: '◷', name: 'Time Dilation',
    desc: 'Circles linger on screen longer before vanishing',
    maxLevel: 6, costs: [300, 700, 1500, 3200, 6800, 14500],
    effect: (lvl) => ({ extraTime: lvl * 550 }),
  },
  {
    id: 'score_lives', section: 'Scoring', tier: 1,
    icon: '♡', name: 'Resilience',
    desc: 'Begin each run with one additional life',
    maxLevel: 5, costs: [600, 1500, 3500, 8000, 18000],
    effect: (lvl) => ({ bonusLives: lvl }),
  },
  {
    id: 'score_perfect', section: 'Scoring', tier: 2,
    icon: '◈', name: 'Perfect Touch',
    desc: 'Hitting circles in the dead-center grants bonus points',
    maxLevel: 5, costs: [500, 1200, 2600, 5600, 12000],
    effect: (lvl) => ({ perfectBonus: lvl * 0.5 }),
    requires: 'score_multi',
  },
  {
    id: 'score_momentum', section: 'Scoring', tier: 2,
    icon: '⟁', name: 'Momentum',
    desc: 'Moving fast earns more points — speed is rewarded',
    maxLevel: 5, costs: [450, 1050, 2300, 5000, 11000],
    effect: (lvl) => ({ momentumBonus: lvl }),
    requires: 'score_time',
  },
  {
    id: 'score_saver', section: 'Scoring', tier: 2,
    icon: '⊹', name: 'Last Stand',
    desc: 'On your final life, score multiplier permanently doubles',
    maxLevel: 3, costs: [1800, 4500, 10000],
    effect: (lvl) => ({ lastStandMult: 1 + lvl * 0.8 }),
    requires: 'score_lives',
  },
  {
    id: 'score_streak', section: 'Scoring', tier: 3,
    icon: '∞', name: 'Infinite Streak',
    desc: 'Combo can grow beyond 16× — the cap is removed entirely',
    maxLevel: 1, costs: [25000],
    effect: () => ({ unlimitedCombo: true }),
    requires: 'score_perfect',
  },

  // ── FEEDBACK ───────────────────────────────────────────
  {
    id: 'fx_screenshake', section: 'Feedback', tier: 1,
    icon: '⌇', name: 'Screen Tremor',
    desc: 'Canvas shakes violently on each circle hit',
    maxLevel: 5, costs: [180, 420, 950, 2100, 4600],
    effect: (lvl) => ({ screenShake: lvl }),
  },
  {
    id: 'fx_flash', section: 'Feedback', tier: 1,
    icon: '◼', name: 'Impact Flash',
    desc: 'A white flash strobes harder on each successful connection',
    maxLevel: 5, costs: [150, 350, 780, 1700, 3800],
    effect: (lvl) => ({ flashIntensity: lvl }),
  },
  {
    id: 'fx_ink', section: 'Feedback', tier: 1,
    icon: '⬟', name: 'Ink Splatter',
    desc: 'Dark ink blots radiate outward from each hit location',
    maxLevel: 5, costs: [250, 600, 1300, 2800, 6200],
    effect: (lvl) => ({ inkSplatter: lvl }),
  },
  {
    id: 'fx_vignette', section: 'Feedback', tier: 2,
    icon: '▣', name: 'Dark Vignette',
    desc: 'Screen edges darken dynamically as danger increases',
    maxLevel: 3, costs: [800, 2000, 4500],
    effect: (lvl) => ({ vignette: lvl }),
    requires: 'fx_flash',
  },
  {
    id: 'fx_ripple', section: 'Feedback', tier: 2,
    icon: '≈', name: 'Impact Ripple',
    desc: 'The whole canvas warps with a subtle ripple on each hit',
    maxLevel: 3, costs: [1000, 2500, 5500],
    effect: (lvl) => ({ ripple: lvl }),
    requires: 'fx_screenshake',
  },
  {
    id: 'fx_chromatic', section: 'Feedback', tier: 3,
    icon: '⟐', name: 'Chromatic Bleed',
    desc: 'RGB channels split apart on impact for a glitch-art effect',
    maxLevel: 3, costs: [4000, 9500, 21000],
    effect: (lvl) => ({ chromatic: lvl }),
    requires: 'fx_ripple',
  },

  // ── HAZARDS (new section — gameplay modifiers) ─────────
  {
    id: 'hz_shrink', section: 'Mastery', tier: 1,
    icon: '⊖', name: 'Shrink Protocol',
    desc: 'Circles are smaller on spawn — harder to hit, more rewarding',
    maxLevel: 4, costs: [700, 1700, 3800, 8500],
    effect: (lvl) => ({ circleShrink: lvl }),
  },
  {
    id: 'hz_speed', section: 'Mastery', tier: 1,
    icon: '⟶', name: 'Overclock',
    desc: 'Circles spawn faster — the pace is unrelenting',
    maxLevel: 5, costs: [500, 1200, 2700, 6000, 13000],
    effect: (lvl) => ({ spawnBoost: lvl }),
  },
  {
    id: 'hz_drift', section: 'Mastery', tier: 2,
    icon: '↝', name: 'Drift',
    desc: 'Circles slowly drift across the screen after spawning',
    maxLevel: 4, costs: [1500, 3500, 7800, 17000],
    effect: (lvl) => ({ circleDrift: lvl * 0.5 }),
    requires: 'hz_speed',
  },
  {
    id: 'hz_ghost_circle', section: 'Mastery', tier: 2,
    icon: '◯', name: 'Phantom Circle',
    desc: 'Decoy circles spawn occasionally — touching them costs a life',
    maxLevel: 3, costs: [2000, 5000, 12000],
    effect: (lvl) => ({ phantomChance: lvl * 0.12 }),
    requires: 'hz_shrink',
  },
  {
    id: 'hz_reward', section: 'Mastery', tier: 3,
    icon: '✧', name: 'High Stakes',
    desc: 'Every point earned is doubled — but missing any circle is instant death',
    maxLevel: 1, costs: [30000],
    effect: () => ({ highStakes: true }),
    requires: 'hz_drift',
  },
];

const ST = {
  levels: {},
  points: 0,
  spent: 0,

  available() { return this.points - this.spent; },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('trace_st_v2') || '{}');
      this.levels = d.levels || {};
      this.points = d.points || 0;
      this.spent  = d.spent  || 0;
    } catch(e) { this.levels = {}; this.points = 0; this.spent = 0; }
  },

  save() {
    localStorage.setItem('trace_st_v2', JSON.stringify({
      levels: this.levels, points: this.points, spent: this.spent
    }));
  },

  addPoints(n) { this.points += n; this.save(); },

  isUnlocked(skillId) {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill || !skill.requires) return true;
    return (this.levels[skill.requires] || 0) > 0;
  },

  buy(skillId) {
    const skill = SKILLS.find(s => s.id === skillId);
    if (!skill) return false;
    if (!this.isUnlocked(skillId)) return false;
    const cur = this.levels[skillId] || 0;
    if (cur >= skill.maxLevel) return false;
    const cost = skill.costs[cur];
    if (this.available() < cost) return false;
    this.spent += cost;
    this.levels[skillId] = cur + 1;
    this.save();
    return true;
  },

  effects() {
    const fx = {
      trailLength: 40, trailGlow: 0, trailSpectral: 0, trailWidth: 2.5,
      trailEmbers: 0, trailGhost: 0,
      circlePulse: 0, burstParticles: 8, shockwave: 0,
      chainRadius: 0, magnetStrength: 0, circleAura: 0, circleSplit: 0,
      comboSpeed: 0, extraTime: 0, bonusLives: 0,
      perfectBonus: 0, momentumBonus: 0, lastStandMult: 1, unlimitedCombo: false,
      screenShake: 0, flashIntensity: 0, inkSplatter: 0,
      vignette: 0, ripple: 0, chromatic: 0,
      circleShrink: 0, spawnBoost: 0, circleDrift: 0,
      phantomChance: 0, highStakes: false,
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

let activeTab = 'Trail';

function renderSkillTree() {
  const scroll = document.getElementById('st-scroll');
  const ptsEl  = document.getElementById('st-pts');
  ptsEl.textContent = ST.available().toLocaleString();

  const sections = [...new Set(SKILLS.map(s => s.section))];

  let tabsHtml = '<div class="st-tabs">';
  for (const sec of sections) {
    const unlockedCount = SKILLS.filter(s => s.section === sec && (ST.levels[s.id] || 0) > 0).length;
    const badge = unlockedCount > 0 ? `<span class="tab-badge">${unlockedCount}</span>` : '';
    tabsHtml += `<button class="st-tab ${activeTab === sec ? 'active' : ''}" onclick="switchTab('${sec}')">${sec}${badge}</button>`;
  }
  tabsHtml += '</div>';

  const avail = ST.available();
  const sectionSkills = SKILLS.filter(s => s.section === activeTab);
  const tiers = [...new Set(sectionSkills.map(s => s.tier))].sort();

  let cardsHtml = '';
  for (const tier of tiers) {
    const tierSkills = sectionSkills.filter(s => s.tier === tier);
    cardsHtml += `<div class="tier-row">`;
    if (tiers.length > 1) {
      cardsHtml += `<div class="tier-label">Tier ${tier}</div>`;
    }
    for (const skill of tierSkills) {
      const lvl     = ST.levels[skill.id] || 0;
      const maxed   = lvl >= skill.maxLevel;
      const locked  = !ST.isUnlocked(skill.id);
      const cost    = maxed ? 0 : skill.costs[lvl];
      const canBuy  = !maxed && !locked && avail >= cost;
      const progress = lvl / skill.maxLevel;

      let cardState = '';
      if (maxed) cardState = 'maxed';
      else if (lvl > 0) cardState = 'unlocked';
      else if (locked) cardState = 'locked';

      const reqSkill = skill.requires ? SKILLS.find(s => s.id === skill.requires) : null;
      const reqText  = locked && reqSkill ? `<div class="skill-req">Requires: ${reqSkill.name}</div>` : '';

      const pips = Array.from({length: skill.maxLevel}, (_, i) =>
        `<div class="pip ${i < lvl ? 'filled' : ''}"></div>`
      ).join('');

      cardsHtml += `
      <div class="skill-card ${cardState}" id="card-${skill.id}">
        <div class="skill-card-glow"></div>
        <div class="skill-header">
          <span class="skill-icon">${skill.icon}</span>
          <div class="skill-title-block">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-pips">${pips}</div>
          </div>
          <div class="skill-level-badge">${lvl}<span>/${skill.maxLevel}</span></div>
        </div>
        <div class="skill-desc">${skill.desc}</div>
        ${reqText}
        <div class="skill-footer">
          <div class="skill-progress-bar"><div class="skill-progress-fill" style="width:${progress*100}%"></div></div>
          ${!maxed && !locked
            ? `<button class="skill-btn ${canBuy ? 'affordable' : ''}" onclick="buySkill('${skill.id}')" ${canBuy ? '' : 'disabled'}>
                ${canBuy ? '▲' : '✕'} ${cost.toLocaleString()} pts
               </button>`
            : maxed
              ? `<div class="skill-mastered">MASTERED</div>`
              : `<div class="skill-locked-msg">LOCKED</div>`
          }
        </div>
      </div>`;
    }
    cardsHtml += `</div>`;
  }

  scroll.innerHTML = tabsHtml + `<div class="skill-cards-grid">${cardsHtml}</div>`;
}

function switchTab(section) {
  activeTab = section;
  renderSkillTree();
  document.getElementById('st-scroll').scrollTop = 0;
}

function buySkill(id) {
  if (ST.buy(id)) {
    renderSkillTree();
    const flash = document.getElementById('flash');
    flash.style.opacity = '0.1';
    setTimeout(() => flash.style.opacity = '0', 150);
  }
}
