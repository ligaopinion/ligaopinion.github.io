/* =====================================================================
 * Utilidades de fecha y lógica de la liga (clasificación, rankings...).
 * Todo se calcula a partir de los datos: al guardar un resultado, todas
 * las tablas se actualizan solas.
 * ===================================================================== */
const D = {
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  str(dt) { return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; },
  today() { return D.str(new Date()); },
  add(s, n) { const d = D.parse(s); d.setDate(d.getDate() + n); return D.str(d); },
  dow(s) { return D.parse(s).getDay(); },
  // Sábado del fin de semana al que pertenece la fecha.
  weekendStart(s) { return D.add(s, -((D.dow(s) + 1) % 7)); },
  fmt(s, opts) { return D.parse(s).toLocaleDateString('es-ES', opts); },
  dayLong(s) { return D.fmt(s, { weekday: 'long', day: 'numeric', month: 'long' }); },
  dayShort(s) { return D.fmt(s, { weekday: 'short' }).replace('.', '').toUpperCase(); },
  dm(s) { return D.fmt(s, { day: 'numeric', month: 'short' }).replace('.', ''); },
  range(a, b) {
    if (!a) return '';
    if (a === b) return D.fmt(a, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const pa = D.parse(a), pb = D.parse(b);
    const sameMonth = pa.getMonth() === pb.getMonth();
    return sameMonth
      ? `${pa.getDate()} – ${pb.getDate()} ${D.fmt(b, { month: 'short', year: 'numeric' }).replace('.', '')}`
      : `${D.dm(a)} – ${D.dm(b)} ${pb.getFullYear()}`;
  }
};

const DIV_NAME = { 1: 'Primera División', 2: 'Segunda División' };
const DIV_TAG = { 1: '1ª', 2: '2ª' };
const DEFAULT_LEAGUE = 'Liga Success Opinión Futsal Sevilla';

const L = {
  d: null,
  shields: {},
  _teams: new Map(),
  _players: new Map(),

  load(data, shields) {
    this.d = L.normalize(data);
    this.shields = shields || {};
    this._teams = new Map(this.d.teams.map(t => [t.id, t]));
    this._players = new Map(this.d.players.map(p => [p.id, p]));
  },

  normalize(data) {
    const d = data || {};
    d.settings = Object.assign({ leagueName: '', season: '', description: '', email: '', phone: '', location: '', socials: [] }, d.settings || {});
    if (!d.settings.leagueName) d.settings.leagueName = DEFAULT_LEAGUE;
    if (!Array.isArray(d.settings.socials)) d.settings.socials = [];
    d.teams = Array.isArray(d.teams) ? d.teams : [];
    d.players = Array.isArray(d.players) ? d.players : [];
    d.matches = Array.isArray(d.matches) ? d.matches : [];
    // Índice de temporadas archivadas: [{ id, name, at }]
    d.archive = Array.isArray(d.archive) ? d.archive : [];
    for (const m of d.matches) {
      m.ev = m.ev || {};
      for (const k of ['h', 'a']) if (!m.ev[k] || Array.isArray(m.ev[k])) m.ev[k] = {};
      m.ev.hx = +m.ev.hx || 0;
      m.ev.ax = +m.ev.ax || 0;
      m.status = m.status || 'pending';
    }
    return d;
  },

  uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  team(id) { return this._teams.get(id) || { id, name: 'Equipo eliminado', short: '—', color: '#888888', div: 0 }; },
  player(id) { return this._players.get(id); },
  teams(div) {
    return this.d.teams.filter(t => !div || t.div === div).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  },
  roster(teamId) {
    return this.d.players.filter(p => p.teamId === teamId && !p.deleted)
      .sort((a, b) => (+a.number || 999) - (+b.number || 999) || a.name.localeCompare(b.name, 'es'));
  },
  byDate(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); },
  matches(div) { return this.d.matches.filter(m => !div || m.div === div).sort(L.byDate); },
  jornadas(div) { return [...new Set(this.matches(div).map(m => m.j))].sort((a, b) => a - b); },
  jMatches(div, j) { return this.matches(div).filter(m => m.j === j); },
  jRange(div, j) {
    const ms = this.jMatches(div, j);
    return ms.length ? D.range(ms[0].date, ms[ms.length - 1].date) : '';
  },
  resting(div, j) {
    const playing = new Set(this.jMatches(div, j).flatMap(m => [m.home, m.away]));
    return this.teams(div).filter(t => !playing.has(t.id));
  },
  // Jornada a mostrar por defecto: la del próximo partido (por fecha real); si ya acabó la liga, la última.
  currentJ(div) {
    const today = D.today();
    const next = this.matches(div).find(m => m.date >= today);
    const js = this.jornadas(div);
    return next ? next.j : js[js.length - 1] || 1;
  },

  played(m) { return m.status === 'played'; },
  score(m) {
    if (!this.played(m)) return null;
    const sum = side => Object.values(m.ev[side] || {}).reduce((s, x) => s + (+x.g || 0), 0);
    return { h: sum('h') + (+m.ev.hx || 0), a: sum('a') + (+m.ev.ax || 0) };
  },

  standings(div) {
    const rows = new Map(this.teams(div).map(t => [t.id, { team: t, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0, form: [] }]));
    for (const m of this.matches(div)) {
      const s = this.score(m);
      if (!s) continue;
      const h = rows.get(m.home), a = rows.get(m.away);
      for (const [r, gf, gc] of [[h, s.h, s.a], [a, s.a, s.h]]) {
        if (!r) continue;
        r.pj++; r.gf += gf; r.gc += gc;
        if (gf > gc) { r.pg++; r.pts += 3; r.form.push('G'); }
        else if (gf === gc) { r.pe++; r.pts += 1; r.form.push('E'); }
        else { r.pp++; r.form.push('P'); }
      }
    }
    return [...rows.values()]
      .map(r => ({ ...r, dg: r.gf - r.gc, form: r.form.slice(-5) }))
      .sort((x, y) => y.pts - x.pts || y.dg - x.dg || y.gf - x.gf || x.team.name.localeCompare(y.team.name, 'es'));
  },

  // Suma de estadísticas individuales (goles/tarjetas) en partidos jugados.
  playerTotals(div) {
    const tot = new Map();
    for (const m of this.matches(div)) {
      if (!this.played(m)) continue;
      for (const [side, teamId] of [['h', m.home], ['a', m.away]]) {
        for (const [pid, st] of Object.entries(m.ev[side] || {})) {
          const p = this.player(pid);
          if (!p) continue;
          const t = tot.get(pid) || { player: p, teamId, g: 0, y: 0, r: 0, pj: 0 };
          t.teamId = teamId;
          t.g += +st.g || 0; t.y += +st.y || 0; t.r += +st.r || 0;
          tot.set(pid, t);
        }
      }
    }
    return [...tot.values()];
  },
  scorers(div, n = 5) {
    return this.playerTotals(div).filter(t => t.g > 0)
      .sort((a, b) => b.g - a.g || a.player.name.localeCompare(b.player.name, 'es')).slice(0, n);
  },
  leastConceded(div, n = 5) {
    return this.standings(div).filter(r => r.pj > 0)
      .sort((a, b) => a.gc - b.gc || b.pj - a.pj || a.team.name.localeCompare(b.team.name, 'es')).slice(0, n);
  },
  divSummary(div) {
    const ms = this.matches(div);
    const played = ms.filter(m => this.played(m));
    const goals = played.reduce((s, m) => { const sc = this.score(m); return s + sc.h + sc.a; }, 0);
    const tot = this.playerTotals(div);
    return {
      played: played.length, total: ms.length, goals,
      avg: played.length ? (goals / played.length).toFixed(1).replace('.', ',') : '0',
      yellow: tot.reduce((s, t) => s + t.y, 0), red: tot.reduce((s, t) => s + t.r, 0)
    };
  },

  // Partidos de "la próxima semana": el fin de semana del próximo partido según la fecha real.
  weekWindow() {
    const today = D.today();
    const next = this.matches().find(m => m.date >= today);
    if (!next) return null;
    const from = D.weekendStart(next.date);
    return { from, to: D.add(from, 1) };
  },
  matchesBetween(div, from, to) { return this.matches(div).filter(m => m.date >= from && m.date <= to); },

  // Liga todos contra todos (método del círculo). Devuelve jornadas de [local, visitante].
  roundRobin(ids, twoLegs = true) {
    const a = [...ids];
    if (a.length % 2) a.push(null);
    const n = a.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const x = a[i], y = a[n - 1 - i];
        if (x && y) pairs.push((r + i) % 2 ? [y, x] : [x, y]);
      }
      rounds.push(pairs);
      a.splice(1, 0, a.pop());
    }
    return twoLegs ? [...rounds, ...rounds.map(p => p.map(([h, v]) => [v, h]))] : rounds;
  },

  // Detalle del partido para el resumen.
  details(m) {
    const side = s => {
      const list = Object.entries(m.ev[s] || {}).map(([pid, st]) => ({ p: this.player(pid), ...st })).filter(x => x.p);
      return {
        goals: list.filter(x => +x.g > 0).sort((a, b) => b.g - a.g),
        yellow: list.filter(x => +x.y > 0),
        red: list.filter(x => +x.r > 0),
        extra: +m.ev[s === 'h' ? 'hx' : 'ax'] || 0
      };
    };
    return { h: side('h'), a: side('a') };
  }
};
