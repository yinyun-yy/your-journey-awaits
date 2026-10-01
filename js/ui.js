import { CHARACTERS, SKILLS, LEVELS } from './config.js';
import { formatTime } from './utils.js';
import { storage, validateName } from './storage.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.cache = { hp: -1, stamina: -1, coins: -1, s1: -1, s2: -1, atk: -1, bossHp: -1 };
    this.dmgTimer = null;
    this.pendingChar = null;
    this.bind();
    this.refreshIntro();
    this.onResize();
  }

  el(id) {
    return document.getElementById(id);
  }

  bind() {
    this.el('btn-start').addEventListener('click', () => this.submitName());
    this.el('name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitName();
    });
    this.el('name-input').addEventListener('input', () => this.nameErr(''));
    this.el('btn-continue').addEventListener('click', () => {
      const p = storage.getProfile();
      if (p && p.character) {
        this.startJourney(p.name, p.character);
      } else {
        this.goSelect();
      }
    });
    this.el('btn-journey').addEventListener('click', () => {
      if (this.pendingChar) {
        const name = this.el('select-name').textContent;
        this.startJourney(name, this.pendingChar);
      }
    });
    this.el('btn-edit-name').addEventListener('click', () => {
      const name = this.el('select-name').textContent;
      this.el('name-input').value = name;
      this.nameErr('');
      this.hideAllOverlays();
      this.el('intro').classList.remove('hidden');
      this.el('name-input').focus();
    });
    this.el('btn-pause').addEventListener('click', () => this.pauseGame());
    this.el('btn-resume').addEventListener('click', () => this.resumeGame());
    this.el('btn-restart').addEventListener('click', () => this.restartGame());
    this.el('btn-home').addEventListener('click', () => this.goHome());
    this.el('btn-restart2').addEventListener('click', () => this.restartGame());
    this.el('btn-home2').addEventListener('click', () => this.goHome());
    this.el('btn-victory-home').addEventListener('click', () => this.goHome());
    this.el('btn-victory-again').addEventListener('click', () => this.restartGame());
    this.el('btn-rename').addEventListener('click', () => {
      const p = storage.getProfile();
      this.el('rename-input').value = p ? p.name : '';
      this.el('name-edit').classList.remove('hidden');
    });
    this.el('btn-rename-ok').addEventListener('click', () => this.submitRename());
    this.el('rename-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitRename();
    });
    this.el('btn-rename-cancel').addEventListener('click', () => {
      this.el('name-edit').classList.add('hidden');
      if (this.game.audio) this.game.audio.click();
    });
    this.el('set-bgm').addEventListener('change', (e) => {
      if (this.game.audio) {
        this.game.audio.init();
        this.game.audio.setBgm(e.target.checked);
      }
    });
    this.el('set-sfx').addEventListener('change', (e) => {
      if (this.game.audio) this.game.audio.setSfx(e.target.checked);
    });
  }

  refreshIntro() {
    const p = storage.getProfile();
    const nameInput = this.el('name-input');
    const continueBtn = this.el('btn-continue');
    const best = storage.getBestTime();
    if (p && p.name) {
      nameInput.value = p.name;
      continueBtn.classList.remove('hidden');
      const ch = CHARACTERS.find((c) => c.id === p.character);
      this.el('continue-label').textContent = ch
        ? '继续旅程 · ' + p.name + ' · ' + ch.name
        : '继续旅程 · ' + p.name;
    } else {
      nameInput.value = '';
      continueBtn.classList.add('hidden');
    }
    const bestEl = this.el('intro-best');
    if (bestEl) {
      bestEl.textContent = best !== null ? '🏆 最快通关 ' + formatTime(best) + ' · 通关 ' + storage.getClears() + ' 次' : '';
    }
    this.el('set-bgm').checked = storage.getBgm();
    this.el('set-sfx').checked = storage.getSfx();
  }

  nameErr(msg) {
    this.el('name-err').textContent = msg;
  }

  submitName() {
    if (this.game.audio) this.game.audio.click();
    const res = validateName(this.el('name-input').value);
    if (!res.ok) {
      this.nameErr(res.reason);
      this.el('name-input').focus();
      return;
    }
    const p = storage.getProfile();
    storage.setProfile(res.name, p && p.character ? p.character : null);
    this.goSelect(res.name);
  }

  goSelect(name) {
    this.hideAllOverlays();
    this.el('select-name').textContent = name;
    this.game.playerName = name;
    this.game.toSelect();
    this.el('select').classList.remove('hidden');
    const p = storage.getProfile();
    if (p && p.character) {
      const idx = CHARACTERS.findIndex((c) => c.id === p.character);
      if (idx >= 0) {
        this.game.selectChosen = idx;
        this.pendingChar = p.character;
        this.onCharSelected(p.character);
        return;
      }
    }
    this.pendingChar = null;
    this.el('btn-journey').classList.add('disabled');
    this.onCharHover(-1);
  }

  startJourney(name, characterId) {
    if (this.game.audio) {
      this.game.audio.init();
      this.game.audio.click();
    }
    storage.setProfile(name, characterId);
    this.hideAllOverlays();
    this.game.startGame(name, characterId);
    this.el('hud').classList.remove('hidden');
    const sk = this.game.player.skills;
    const skill1Btn = this.el('btn-skill1');
    const skill2Btn = this.el('btn-skill2');
    if (skill1Btn) skill1Btn.querySelector('.abil-name').textContent = sk.skill1.name;
    if (skill2Btn) skill2Btn.querySelector('.abil-name').textContent = sk.skill2.name;
    if (this.el('pc-s1-name')) this.el('pc-s1-name').textContent = sk.skill1.name;
    if (this.el('pc-s2-name')) this.el('pc-s2-name').textContent = sk.skill2.name;
    this.cache = { hp: -1, stamina: -1, coins: -1, s1: -1, s2: -1, atk: -1, bossHp: -1 };
    this.updateHud(this.game);
  }

  onCharHover(hover) {
    const info = this.el('char-info');
    if (hover < 0) {
      info.classList.add('hidden');
      return;
    }
    const c = CHARACTERS[hover];
    info.classList.remove('hidden');
    this.el('char-name').textContent = c.name;
    this.el('char-title').textContent = c.title + ' · ' + c.role;
    this.el('char-desc').textContent = c.desc;
    this.el('char-weapon').textContent = '武器：' + c.weapon;
  }

  onCharSelected(id) {
    this.pendingChar = id;
    const c = CHARACTERS.find((x) => x.id === id);
    this.el('char-info').classList.remove('hidden');
    this.el('char-name').textContent = c.name;
    this.el('char-title').textContent = c.title + ' · ' + c.role;
    this.el('char-desc').textContent = c.desc;
    this.el('char-weapon').textContent = '武器：' + c.weapon;
    this.el('btn-journey').classList.remove('disabled');
  }

  hideAllOverlays() {
    for (const id of ['intro', 'select', 'pause', 'gameover', 'victory', 'name-edit']) {
      this.el(id).classList.add('hidden');
    }
  }

  pauseGame() {
    if (this.game.state !== 'playing') return;
    this.game.pause();
    this.hideAllOverlays();
    this.el('pause').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  resumeGame() {
    this.hideAllOverlays();
    this.game.resume();
    this.el('hud').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  onPauseRequest() {
    if (this.game.state === 'playing') this.pauseGame();
    else if (this.game.state === 'paused') this.resumeGame();
  }

  restartGame() {
    if (this.game.audio) this.game.audio.click();
    const p = storage.getProfile();
    const name = this.game.playerName || (p && p.name) || '旅行者';
    const charId = this.game.player.characterId || (p && p.character) || 'aster';
    this.hideAllOverlays();
    this.hideBossBar();
    this.game.startGame(name, charId);
    this.el('hud').classList.remove('hidden');
  }

  goHome() {
    this.hideAllOverlays();
    this.hideBossBar();
    this.game.toBoot();
    this.el('hud').classList.add('hidden');
    this.refreshIntro();
    this.el('intro').classList.remove('hidden');
    if (this.game.audio) this.game.audio.click();
  }

  submitRename() {
    if (this.game.audio) this.game.audio.click();
    const res = validateName(this.el('rename-input').value);
    if (!res.ok) {
      this.el('rename-err').textContent = res.reason;
      return;
    }
    this.el('rename-err').textContent = '';
    storage.setProfile(res.name, this.game.player.characterId);
    this.game.playerName = res.name;
    this.game.player.name = res.name;
    this.el('select-name').textContent = res.name;
    this.el('hud-name').textContent = res.name;
    this.el('name-edit').classList.add('hidden');
    this.cache.hp = -1;
    this.refreshIntro();
  }

  showGameover(player) {
    this.el('hud').classList.add('hidden');
    this.hideBossBar();
    this.el('gameover').classList.remove('hidden');
    this.el('go-title').textContent = '你在起源之地倒下了…';
    this.el('go-sub').textContent =
      '旅人 ' + player.name + ' · 击败 ' + player.kills + ' 名敌人 · 🪙 ' + player.coins;
  }

  showVictory(player, clearTime, isBest, score) {
    this.el('hud').classList.add('hidden');
    this.el('victory').classList.remove('hidden');
    this.el('v-title').textContent = '关卡完成';
    this.el('v-sub').textContent = '起源之地 · 探索完成';
    this.el('v-name').textContent = player.name;
    this.el('v-time').textContent = formatTime(clearTime);
    this.el('v-kills').textContent = player.kills;
    this.el('v-coins').textContent = player.coins;
    this.el('v-score').textContent = score;
    const best = storage.getBestTime();
    this.el('v-best').textContent = best !== null ? formatTime(best) : '—';
    this.el('v-record').classList.toggle('hidden', !isBest);
    if (this.game.audio) this.game.audio.victory();
  }

  banner(main, sub) {
    const b = this.el('banner');
    b.querySelector('.banner-main').textContent = main;
    b.querySelector('.banner-sub').textContent = sub;
    b.classList.remove('hidden', 'show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  flashDamage() {
    document.body.classList.remove('dmg');
    void document.body.offsetWidth;
    document.body.classList.add('dmg');
    if (this.dmgTimer) clearTimeout(this.dmgTimer);
    this.dmgTimer = setTimeout(() => document.body.classList.remove('dmg'), 620);
  }

  flashCoinPop() {
    const el = this.el('hud-coins');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  showBossBar(boss) {
    const bar = this.el('boss-bar');
    bar.classList.remove('hidden');
    this.el('boss-name').textContent = boss.cfg.name;
    this.el('boss-hp-fill').style.width = '100%';
  }

  hideBossBar() {
    this.el('boss-bar').classList.add('hidden');
  }

  setCooldown(id, cd, maxCd) {
    const el = this.el(id);
    if (!el) return;
    const fill = el.querySelector('.cd-fill');
    const label = el.querySelector('.cd-label');
    if (!fill) return;
    if (cd > 0) {
      const pct = Math.min(100, (cd / maxCd) * 100);
      fill.style.background = 'conic-gradient(rgba(10,16,20,0.72) ' + pct + '%, transparent 0)';
      if (label) label.textContent = cd >= 1 ? Math.ceil(cd) : cd.toFixed(1);
      el.classList.add('cooling');
    } else {
      fill.style.background = 'transparent';
      if (label) label.textContent = '';
      el.classList.remove('cooling');
    }
  }

  updateHud(game) {
    const p = game.player;
    const c = this.cache;

    const hp = Math.round(p.hp);
    if (c.hp !== hp) {
      c.hp = hp;
      this.el('hud-hp-fill').style.width = hp + '%';
      this.el('hud-name').textContent = p.name;
    }
    const st = Math.round(p.stamina);
    if (c.stamina !== st) {
      c.stamina = st;
      this.el('hud-stamina-fill').style.width = st + '%';
    }
    if (c.coins !== p.coins) {
      c.coins = p.coins;
      this.el('hud-coins').textContent = '🪙 ' + p.coins;
    }

    const s1 = Math.ceil(p.skill1Cd * 10);
    if (c.s1 !== s1) {
      c.s1 = s1;
      this.setCooldown('btn-skill1', p.skill1Cd, p.skills.skill1.cd);
      this.setCooldown('pc-skill1', p.skill1Cd, p.skills.skill1.cd);
    }
    const s2 = Math.ceil(p.skill2Cd * 10);
    if (c.s2 !== s2) {
      c.s2 = s2;
      this.setCooldown('btn-skill2', p.skill2Cd, p.skills.skill2.cd);
      this.setCooldown('pc-skill2', p.skill2Cd, p.skills.skill2.cd);
    }
    const atk = Math.ceil(p.attackCd * 10);
    if (c.atk !== atk) {
      c.atk = atk;
      this.setCooldown('btn-attack', p.attackCd, p.skills.attack.cd);
      this.setCooldown('pc-attack', p.attackCd, p.skills.attack.cd);
    }

    const boss = game.boss;
    if (boss && game.bossActivated && !game.bossDead && boss.alive) {
      const bossHp = Math.ceil((boss.hp / boss.maxHp) * 50);
      if (c.bossHp !== bossHp) {
        c.bossHp = bossHp;
        this.el('boss-hp-fill').style.width = Math.max(0, bossHp * 2) + '%';
      }
    }
  }

  onResize() {
    const isTouch = this.game.input ? this.game.input.isTouch : false;
    const touchControls = document.getElementById('touch-controls');
    const pcHints = document.getElementById('pc-hints');
    const pcBar = document.getElementById('pc-abil-bar');
    if (touchControls) touchControls.classList.toggle('hidden', !isTouch);
    if (pcHints) pcHints.classList.toggle('hidden', isTouch);
    if (pcBar) pcBar.classList.toggle('hidden', isTouch);
  }
}
