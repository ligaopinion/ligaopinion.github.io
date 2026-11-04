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

const DIV_NAME = { 1: 'Primera División', 2: 'Segunda División', c: 'Copa Opinión Success' };
const DIV_TAG = { 1: '1ª', 2: '2ª', c: 'C' };
// Formato de la copa (cuadro oficial). Cada cruce tiene un código; "from" indica de qué cruces
// salen sus dos equipos (ganadores): [ronda, código local, ronda, código visitante].
const CUP_TEMPLATE = [
  { name: 'Ronda 1', labels: ['A', 'B', 'C', 'D'] },
  { name: 'Octavos 1', labels: ['A', 'B', 'C', 'D'] },
  { name: 'Octavos 2', labels: ['E', 'F', 'G', 'H'] },
  { name: 'Cuartos', labels: ['C1', 'C2', 'C3', 'C4'], from: [[1, 'A', 1, 'B'], [1, 'C', 1, 'D'], [2, 'E', 2, 'F'], [2, 'G', 2, 'H']] },
  { name: 'Semifinal', labels: ['S1', 'S2'], from: [[3, 'C1', 3, 'C2'], [3, 'C3', 3, 'C4']] },
  { name: 'Final', labels: ['FINAL'], from: [[4, 'S1', 4, 'S2']] }
];
// Cuadro ya sorteado de una temporada: equipos de la Ronda 1 y fechas/horas de cada cruce.
const CUP_PRESETS = {
  'Temporada 2026-27': [
    [['BOHEMIA FC', 'NOTTINGHAM HUEVOS', '2026-11-13', '19:00'], ['PARKINASO FC', 'FLOR DE CAÑA ALJARAFE', '2026-11-13', '20:00'],
      ['TENDEREKE', 'PAÑOLETA CD', '2026-11-20', '19:00'], ['REAL ÉLITE FC', 'MARAÑAS F.S', '2026-11-20', '20:00']],
    [['', '', '2026-11-27', '19:00'], ['', '', '2026-11-27', '20:00'], ['', '', '2026-12-18', '19:00'], ['', '', '2026-12-18', '20:00']],
    [['', '', '2027-01-15', '19:00'], ['', '', '2027-01-15', '20:00'], ['', '', '2027-01-22', '19:00'], ['', '', '2027-01-22', '20:00']],
    [['', '', '2027-02-12', '19:00'], ['', '', '2027-02-12', '20:00'], ['', '', '2027-02-19', '19:00'], ['', '', '2027-02-19', '20:00']],
    [['', '', '2027-03-12', '19:00'], ['', '', '2027-03-12', '20:00']],
    [['', '', '2027-04-02', '19:00']]
  ]
};
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
    // Importe de las sanciones económicas (€ por tarjeta).
    d.settings.fines = Object.assign({ yellow: 2, red: 3 }, d.settings.fines || {});
    d.teams = Array.isArray(d.teams) ? d.teams : [];
    d.players = Array.isArray(d.players) ? d.players : [];
    d.matches = Array.isArray(d.matches) ? d.matches : [];
    // Índice de temporadas archivadas: [{ id, name, at }]
    d.archive = Array.isArray(d.archive) ? d.archive : [];
    d.matches.forEach(L.normMatch);
    // Copa de la temporada: { name, rounds: [{ id, name, matches: [...] }] } o null si aún no se ha creado.
    if (d.cup && typeof d.cup === 'object') {
      d.cup.name = d.cup.name || DIV_NAME.c;
      d.cup.rounds = Array.isArray(d.cup.rounds) ? d.cup.rounds : [];
      for (const r of d.cup.rounds) {
        r.matches = Array.isArray(r.matches) ? r.matches : [];
        r.matches.forEach(m => { L.normMatch(m); m.cup = true; m.pen = m.pen && (m.pen.h !== '' && m.pen.a !== '') ? { h: +m.pen.h || 0, a: +m.pen.a || 0 } : null; });
      }
    } else d.cup = null;
    return d;
  },

  normMatch(m) {
    m.ev = m.ev || {};
    for (const k of ['h', 'a']) if (!m.ev[k] || Array.isArray(m.ev[k])) m.ev[k] = {};
    m.ev.hx = +m.ev.hx || 0;
    m.ev.ax = +m.ev.ax || 0;
    m.status = m.status || 'pending';
  },

  newCupMatch(label = '') {
    return { id: L.uid('c'), cup: true, label, src: null, date: '', time: '', home: '', away: '', status: 'pending', ev: { h: {}, a: {}, hx: 0, ax: 0 }, pen: null };
  },

  // Crea la copa de la temporada con el formato oficial (y el cuadro ya sorteado si existe).
  buildCup(season, teams) {
    const preset = CUP_PRESETS[season];
    const byName = name => (teams.find(t => t.name.toUpperCase() === name.toUpperCase()) || {}).id || '';
    const rounds = CUP_TEMPLATE.map((r, ri) => ({
      id: L.uid('r'), name: r.name,
      matches: r.labels.map((lb, mi) => {
        const m = L.newCupMatch(lb);
        const p = preset && preset[ri] && preset[ri][mi];
        if (p) { m.home = p[0] ? byName(p[0]) : ''; m.away = p[1] ? byName(p[1]) : ''; m.date = p[2]; m.time = p[3]; }
        return m;
      })
    }));
    // Enlaza cada cruce con los cruces de los que salen sus equipos.
    CUP_TEMPLATE.forEach((r, ri) => (r.from || []).forEach(([rh, lh, ra, la], mi) => {
      const find = (rIdx, lb) => (rounds[rIdx].matches.find(x => x.label === lb) || {}).id || null;
      rounds[ri].matches[mi].src = { h: find(rh, lh), a: find(ra, la) };
    }));
    return { name: DIV_NAME.c, rounds, preset: !!preset };
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
  playerTotals(div) { return this.totalsOf(this.matches(div)); },
  totalsOf(matches) {
    const tot = new Map();
    for (const m of matches) {
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

  /* ---------------- Copa ---------------- */
  cupMatches() { return this.d.cup ? this.d.cup.rounds.flatMap(r => r.matches) : []; },
  cupFind(id) {
    for (const r of (this.d.cup ? this.d.cup.rounds : [])) {
      const m = r.matches.find(x => x.id === id);
      if (m) return { m, r };
    }
    return null;
  },
  // Equipo que pasa de ronda: por goles o, si hay empate, por penaltis.
  cupWinner(m) {
    const s = this.score(m);
    if (!s || !m.home || !m.away) return null;
    if (s.h !== s.a) return s.h > s.a ? m.home : m.away;
    if (m.pen && m.pen.h !== m.pen.a) return m.pen.h > m.pen.a ? m.home : m.away;
    return null;
  },
  // Equipo de un lado del cruce: el elegido a mano o, si no hay, el ganador del cruce del que procede.
  cupSide(m, side) {
    if (m[side]) return m[side];
    const hit = this.cupSrc(m, side);
    return hit ? (this.cupWinner(hit.m) || '') : '';
  },
  cupSrc(m, side) {
    const id = m.src && m.src[side === 'home' ? 'h' : 'a'];
    return id ? this.cupFind(id) : null;
  },
  // Texto para un hueco aún sin equipo: "Ganador A", "Ganador C1"...
  cupSrcText(m, side) {
    const hit = this.cupSrc(m, side);
    return hit ? `Ganador ${hit.m.label || hit.r.name}` : '';
  },
  cupScorers(n = 5) {
    return this.totalsOf(this.cupMatches()).filter(t => t.g > 0)
      .sort((a, b) => b.g - a.g || a.player.name.localeCompare(b.player.name, 'es')).slice(0, n);
  },
  cupConceded(n = 5) {
    const rows = new Map();
    for (const m of this.cupMatches()) {
      const s = this.score(m);
      if (!s || !m.home || !m.away) continue;
      for (const [id, gc] of [[m.home, s.a], [m.away, s.h]]) {
        const r = rows.get(id) || { team: this.team(id), pj: 0, gc: 0 };
        r.pj++; r.gc += gc;
        rows.set(id, r);
      }
    }
    return [...rows.values()].sort((a, b) => a.gc - b.gc || b.pj - a.pj || a.team.name.localeCompare(b.team.name, 'es')).slice(0, n);
  },

  /* ---------------- Sanciones económicas ---------------- */
  // Tarjetas de la temporada por equipo, separadas por competición (liga / copa) y acumuladas.
  // Cada temporada tiene sus propios datos: al iniciar una nueva, el recuento empieza de cero.
  // div: 0 (todas) | 1 | 2
  fines({ div = 0 } = {}) {
    const f = this.d.settings.fines;
    const ms = [...this.matches(), ...this.cupMatches()].filter(m => this.played(m));
    const blank = () => ({ pj: 0, y: 0, r: 0 });
    const rows = new Map(this.teams(div || undefined).map(t => [t.id, { team: t, liga: blank(), copa: blank(), detail: [] }]));
    for (const m of ms) {
      const comp = m.cup ? 'copa' : 'liga';
      for (const [side, teamId, rival] of [['h', m.home, m.away], ['a', m.away, m.home]]) {
        const row = rows.get(teamId);
        if (!row) continue;
        const list = Object.entries(m.ev[side] || {}).map(([pid, st]) => ({ p: this.player(pid), y: +st.y || 0, r: +st.r || 0 })).filter(x => x.p && (x.y || x.r));
        const y = list.reduce((s, x) => s + x.y, 0), r = list.reduce((s, x) => s + x.r, 0);
        row[comp].pj++; row[comp].y += y; row[comp].r += r;
        if (y || r) row.detail.push({ m, comp, rival, y, r, list, amount: y * f.yellow + r * f.red });
      }
    }
    return [...rows.values()].map(r => {
      const y = r.liga.y + r.copa.y, rd = r.liga.r + r.copa.r;
      return { ...r, pj: r.liga.pj + r.copa.pj, y, r: rd, ey: y * f.yellow, er: rd * f.red, total: y * f.yellow + rd * f.red };
    }).sort((a, b) => b.total - a.total || a.team.name.localeCompare(b.team.name, 'es'));
  },

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
