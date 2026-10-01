const KEYS = {
  profile: 'yja_profile',
  bestTime: 'yja_best_time',
  games: 'yja_games',
  clears: 'yja_clears',
  bgm: 'yja_bgm',
  sfx: 'yja_sfx',
};

function get(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : JSON.parse(v);
  } catch (e) {
    return def;
  }
}

function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    /* storage unavailable */
  }
}

export const storage = {
  getProfile: () => get(KEYS.profile, null),
  setProfile: (name, characterId) => set(KEYS.profile, { name, character: characterId }),
  clearProfile: () => {
    try {
      localStorage.removeItem(KEYS.profile);
    } catch (e) {
      /* ignore */
    }
  },
  getBestTime: () => get(KEYS.bestTime, null),
  setBestTime: (t) => set(KEYS.bestTime, t),
  getGames: () => get(KEYS.games, 0),
  setGames: (v) => set(KEYS.games, v),
  getClears: () => get(KEYS.clears, 0),
  setClears: (v) => set(KEYS.clears, v),
  getBgm: () => get(KEYS.bgm, true),
  getSfx: () => get(KEYS.sfx, true),
  setBgm: (v) => set(KEYS.bgm, v),
  setSfx: (v) => set(KEYS.sfx, v),
  resetAll() {
    try {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      /* ignore */
    }
  },
};

export function validateName(raw) {
  const name = String(raw || '').trim();
  const len = Array.from(name).length;
  if (len < 1) return { ok: false, reason: '名字不能为空' };
  if (len > 12) return { ok: false, reason: '名字最多 12 个字符' };
  return { ok: true, name };
}
