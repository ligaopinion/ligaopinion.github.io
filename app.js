/* =====================================================================
 * Web pública: navegación, vistas, resumen de partido e instantáneas.
 * ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'primera', label: '1ª División', icon: 'looks_one' },
  { id: 'segunda', label: '2ª División', icon: 'looks_two' },
  { id: 'copa', label: 'Copa', icon: 'emoji_events' },
  { id: 'estadisticas', label: 'Estadísticas', short: 'Rankings', icon: 'leaderboard' },
  { id: 'admin', label: 'Admin', icon: 'admin_panel_settings' }
];
const PAGE_DIV = { primera: 1, segunda: 2 };

/* ---------------- Versión y novedades ---------------- */
const APP_VERSION = '1.1';
const CHANGELOG = [
  {
    v: '1.1', date: '2026-11-04', items: [
      ['emoji_events', 'Nueva sección <b>Copa Opinión Success</b> en el menú, con el cuadro de rondas (preliminar, octavos, cuartos, semifinales y final).'],
      ['account_tree', 'Cuadro de copa con marcador, penaltis y resumen de cada partido. Se puede capturar como imagen.'],
      ['sports_soccer', 'Rankings de copa: top 5 goleadores y top 5 equipos menos goleados, con instantánea.'],
      ['admin_panel_settings', 'Admin › Copa: crear la copa de cada temporada con sus equipos, elegir los equipos de cada cruce y anotar goles, amonestaciones, expulsiones y penaltis.'],
      ['payments', 'Admin › Sanciones: recuento económico por equipo de amarillas y expulsiones, con columnas separadas de <b>liga</b> y <b>copa</b> y el total acumulado de la temporada. Importes configurables, detalle por partido, instantánea y descarga en Excel.'],
      ['restart_alt', 'Las tarjetas se reinician con cada temporada nueva; las de temporadas anteriores se consultan en Sanciones con el selector de temporada.'],
      ['history', 'Al iniciar una temporada nueva, la copa de la anterior queda archivada junto a la liga.'],
      ['new_releases', 'Número de versión en el pie de página y este registro de novedades.']
    ]
  },
  {
    v: '1.0', date: '2026-11-02', items: [
      ['rocket_launch', 'Primera versión: portada, 1ª y 2ª División con jornadas y clasificación, estadísticas, instantáneas para redes, panel de administración, usuarios y temporadas.']
    ]
  }
];
function openChangelog() {
  Dlg.open(`${Dlg.head('Novedades', '<span class="ms" style="color:var(--primary)">new_releases</span>')}
    <div class="dlg-body" style="padding:0">${CHANGELOG.map(c => `<div class="sum-section" style="border-top:0">
      <h3 style="color:var(--on-surface)">Versión ${c.v} <small class="muted" style="font:500 13px var(--font);text-transform:none">· ${esc(D.fmt(c.date, { day: 'numeric', month: 'long', year: 'numeric' }))}</small></h3>
      <ul class="changes">${c.items.map(([ic, t]) => `<li><span class="ms">${ic}</span><span>${t}</span></li>`).join('')}</ul></div>`).join('')}</div>
    <div class="dlg-foot"><button class="btn btn-filled" data-act="close">Cerrar</button></div>`, 'narrow');
}
const DIV_PAGE = { 1: 'primera', 2: 'segunda' };

/* ---------------- Escudos ---------------- */
const _shieldCache = new Map();
function initials(name) {
  const skip = new Set(['FC', 'CD', 'F.S', 'FS', 'DE', 'LA', 'EL', 'C.D', 'F.C', '.FS']);
  const words = String(name).split(/\s+/).filter(w => w && !skip.has(w.toUpperCase()));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2)).toUpperCase();
}
function defaultShield(t) {
  const key = t.id + t.color + t.name;
  if (!_shieldCache.has(key)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 72"><path d="M32 3 L59 11 V34 C59 51 47 63 32 69 C17 63 5 51 5 34 V11 Z" fill="${t.color || '#607d8b'}" stroke="#ffffff" stroke-width="3"/><path d="M32 3 L59 11 V34 C59 51 47 63 32 69 Z" fill="#000" fill-opacity=".14"/><text x="32" y="44" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="21" text-anchor="middle" fill="#ffffff">${esc(initials(t.name))}</text></svg>`;
    _shieldCache.set(key, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }
  return _shieldCache.get(key);
}
const shieldSrc = t => L.shields[t.id] || defaultShield(t);
const shieldImg = (t, cls = '') => `<img class="shield ${cls}" src="${shieldSrc(t)}" alt="" loading="lazy">`;
const teamName = t => `<span class="full">${esc(t.name)}</span><span class="short">${esc(t.short || t.name)}</span>`;

/* ---------------- Snackbar y diálogos ---------------- */
let _snackT;
function snack(msg, icon = 'info') {
  const s = $('#snackbar');
  s.innerHTML = `<span class="ms">${icon}</span><span>${esc(msg)}</span>`;
  s.classList.add('show');
  clearTimeout(_snackT);
  _snackT = setTimeout(() => s.classList.remove('show'), 3800);
}

const Dlg = {
  el: level => $(level === 2 ? '#dlg2' : '#dlg'),
  open(html, cls = '', level = 1) {
    const d = Dlg.el(level);
    d.className = cls;
    d.innerHTML = html;
    if (!d.open) d.showModal();
    return d;
  },
  close(level = 1) { const d = Dlg.el(level); if (d.open) d.close(); },
  anyOpen: () => $('#dlg').open || $('#dlg2').open,
  head: (title, extra = '') => `<div class="dlg-head">${extra}<h2>${title}</h2><button class="icon-btn" data-act="close" aria-label="Cerrar"><span class="ms">close</span></button></div>`,
  confirm(message, okLabel = 'Eliminar', danger = true) {
    return new Promise(resolve => {
      const d = Dlg.open(`${Dlg.head('Confirmar')}<div class="dlg-body"><p style="margin:0">${message}</p></div>
        <div class="dlg-foot"><button class="btn btn-text" data-r="0">Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-filled'}" data-r="1">${esc(okLabel)}</button></div>`, 'narrow', 2);
      const done = v => { d.removeEventListener('close', onClose); Dlg.close(2); resolve(v); };
      const onClose = () => resolve(false);
      d.addEventListener('close', onClose, { once: true });
      $$('[data-r]', d).forEach(b => b.addEventListener('click', () => done(b.dataset.r === '1')));
    });
  }
};

/* ---------------- Componentes ---------------- */
function matchRow(m) {
  const h = L.team(m.home), a = L.team(m.away), sc = L.score(m);
  let mid = '<div class="mscore vs">VS</div>';
  let res = ['', ''];
  if (sc) {
    mid = `<div class="mscore">${sc.h}<i>-</i>${sc.a}${m.pen ? `<small class="pen">${m.pen.h}-${m.pen.a} pen.</small>` : ''}</div>`;
    const w = m.cup ? L.cupWinner(m) : (sc.h > sc.a ? m.home : sc.h < sc.a ? m.away : null);
    res = w === m.home ? ['win', 'lose'] : w === m.away ? ['lose', 'win'] : ['', ''];
  } else if (m.status === 'postponed') {
    mid = '<div class="mscore post">APLAZADO</div>';
  }
  const dk = m.cup ? 'c' : m.div;
  return `<div class="match d${dk}">
    <div class="mdiv" title="${DIV_NAME[dk]}">${m.cup ? '<span class="ms fill" style="font-size:20px">emoji_events</span><small>COPA</small>' : `${DIV_TAG[dk]}<small>DIV</small>`}</div>
    <div class="mbody">
      <div class="mtime">${esc(m.time)}<small>${D.dayShort(m.date)} ${D.dm(m.date)}</small></div>
      <div class="mteam home ${res[0]}"><span class="tname">${teamName(h)}</span>${shieldImg(h)}</div>
      ${mid}
      <div class="mteam away ${res[1]}">${shieldImg(a)}<span class="tname">${teamName(a)}</span></div>
      <div class="mact">${sc ? `<button class="btn btn-tonal btn-sm" data-act="summary" data-id="${m.id}"><span class="ms">summarize</span>Resumen</button>` : ''}</div>
    </div>
  </div>`;
}

function matchList(ms, emptyMsg = 'No hay partidos programados.') {
  if (!ms.length) return `<div class="empty"><span class="ms">event_busy</span>${emptyMsg}</div>`;
  let html = '', day = '';
  for (const m of ms) {
    if (m.date !== day) {
      day = m.date;
      html += `<div class="day-label"><span class="ms">calendar_today</span>${esc(D.dayLong(day))}</div>`;
    }
    html += matchRow(m);
  }
  return html;
}

const shotBtn = (target, title, sub = '', wide = false) =>
  `<button class="btn btn-outline btn-sm" data-act="shot" data-target="${target}" data-title="${esc(title)}" data-sub="${esc(sub)}"${wide ? ' data-wide="1"' : ''}><span class="ms">photo_camera</span>Capturar instantánea</button>`;

function standingsTable(div) {
  const rows = L.standings(div);
  return `<div class="table-wrap"><table class="tbl">
    <thead><tr><th>#</th><th class="left">Equipo</th><th>PTS</th><th>PJ</th><th class="hide-sm">PG</th><th class="hide-sm">PE</th><th class="hide-sm">PP</th><th>GF</th><th>GC</th><th>DG</th><th class="hide-md">Últimos</th></tr></thead>
    <tbody>${rows.map((r, i) => `<tr class="p${i + 1}">
      <td class="pos"><span>${i + 1}</span></td>
      <td class="left"><div class="teamcell">${shieldImg(r.team)}<span>${teamName(r.team)}</span></div></td>
      <td class="pts">${r.pts}</td><td>${r.pj}</td>
      <td class="hide-sm">${r.pg}</td><td class="hide-sm">${r.pe}</td><td class="hide-sm">${r.pp}</td>
      <td>${r.gf}</td><td>${r.gc}</td><td>${r.dg > 0 ? '+' : ''}${r.dg}</td>
      <td class="hide-md"><span class="form">${r.form.map(f => `<i class="${f}">${f}</i>`).join('') || '<span class="muted">—</span>'}</span></td>
    </tr>`).join('')}</tbody></table></div>`;
}

const IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1.1.4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1.1.4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 2.2c-3.1 0-3.5 0-4.7.1-1 0-1.6.2-1.9.3-.5.2-.8.4-1.2.8-.4.4-.6.7-.8 1.2-.1.4-.3.9-.3 1.9-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c0 1 .2 1.6.3 1.9.2.5.4.8.8 1.2.4.4.7.6 1.2.8.4.1.9.3 1.9.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1 0 1.6-.2 1.9-.3.5-.2.8-.4 1.2-.8.4-.4.6-.7.8-1.2.1-.4.3-.9.3-1.9.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c0-1-.2-1.6-.3-1.9-.2-.5-.4-.8-.8-1.2-.4-.4-.7-.6-1.2-.8-.4-.1-.9-.3-1.9-.3-1.2-.1-1.6-.1-4.7-.1zm0 3.4a4.2 4.2 0 110 8.4 4.2 4.2 0 010-8.4zm0 6.9a2.7 2.7 0 100-5.4 2.7 2.7 0 000 5.4zm5.3-7.1a1 1 0 11-2 0 1 1 0 012 0z"/></svg>';

/* ---------------- Selector de temporada ---------------- */
function seasonPicker() {
  const cur = Api.state.data || {};
  const idx = Array.isArray(cur.archive) ? cur.archive : [];
  if (!idx.length) return '';
  const curName = (cur.settings && cur.settings.season) || 'Temporada actual';
  return `<label class="season-pick"><span class="ms">history</span><select id="seasonSel" aria-label="Temporada">
    <option value="">${esc(curName)} (actual)</option>
    ${[...idx].reverse().map(s => `<option value="${esc(s.id)}" ${App.season === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
  </select></label>`;
}
const archivedNotice = () => App.season && App.archive
  ? `<div class="alert info"><span class="ms">history</span><p>Estás consultando la <b>${esc(App.archive.name)}</b>, ya finalizada. <a href="#" data-act="season-current">Volver a la temporada actual</a></p></div>`
  : '';

/* ---------------- Vistas ---------------- */
// Partidos de copa del mismo fin de semana (solo si los hay).
function cupWeekCard(w) {
  const ms = L.cupMatches().filter(m => m.date && m.date >= w.from && m.date <= w.to && m.home && m.away).sort(L.byDate);
  if (!ms.length) return '';
  const range = D.range(w.from, w.to);
  return `<div class="card">
    <div id="shot-week-c">
      <div class="card-head"><span class="div-badge dc"><span class="ms fill">emoji_events</span></span>
        <div class="grow"><h3>${esc(L.d.cup.name)}</h3><p>${esc(range)}</p></div></div>
      <div class="match-list">${matchList(ms)}</div>
    </div>
    <div class="card-actions"><a class="btn btn-text btn-sm" href="#/copa"><span class="ms">account_tree</span>Ver cuadro</a>${shotBtn('shot-week-c', L.d.cup.name, range)}</div>
  </div>`;
}

function viewHome() {
  const s = L.d.settings;
  const w = L.weekWindow();
  const words = s.leagueName.split(' ');
  const title = words.length > 2 ? `${esc(words.slice(0, -2).join(' '))} <span>${esc(words.slice(-2).join(' '))}</span>` : esc(s.leagueName);
  const weekRange = w ? D.range(w.from, w.to) : '';
  const weekCard = div => {
    const ms = w ? L.matchesBetween(div, w.from, w.to) : [];
    const j = ms[0] && ms[0].j;
    return `<div class="card">
      <div id="shot-week-${div}">
        <div class="card-head"><span class="div-badge d${div}">${DIV_TAG[div]}</span>
          <div class="grow"><h3>${DIV_NAME[div]}</h3><p>${j ? `Jornada ${j} · ` : ''}${esc(weekRange)}</p></div></div>
        <div class="match-list">${matchList(ms, 'Esta división no juega este fin de semana.')}</div>
      </div>
      <div class="card-actions">
        <a class="btn btn-text btn-sm" href="#/${DIV_PAGE[div]}${j ? '/' + j : ''}"><span class="ms">calendar_month</span>Ver calendario</a>
        ${ms.length ? shotBtn(`shot-week-${div}`, `${DIV_NAME[div]}${j ? ' · Jornada ' + j : ''}`, weekRange) : ''}
      </div>
    </div>`;
  };
  const contact = [
    s.email && `<li><span class="ms">mail</span><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>`,
    s.phone && `<li><span class="ms">call</span><a href="tel:${esc(s.phone.replace(/\s+/g, ''))}">${esc(s.phone)}</a></li>`,
    s.phone && `<li><span class="ms">chat</span><a href="https://wa.me/${esc(s.phone.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a></li>`,
    s.location && `<li><span class="ms">location_on</span><span>${esc(s.location)}</span></li>`
  ].filter(Boolean).join('');

  return `<div class="fade-in">
    <section class="hero">
      <img class="logo" src="logo.png" alt="Logo de la liga">
      <div>
        ${s.season ? `<span class="season">${esc(s.season)}</span>` : ''}
        <h1>${title}</h1>
        <p class="desc ${s.description ? '' : 'placeholder'}">${esc(s.description || 'Aquí aparecerá la descripción de la liga. Se edita desde Admin › Ajustes.')}</p>
        <div class="cta">
          <a class="btn btn-filled" href="#/primera"><span class="ms">looks_one</span>Primera División</a>
          <a class="btn btn-outline" href="#/segunda"><span class="ms">looks_two</span>Segunda División</a>
        </div>
      </div>
    </section>

    <h2 class="section-title"><span class="ms">event</span>Partidos de la semana<small>${esc(weekRange)}</small></h2>
    <div class="legend"><span><i style="background:var(--div1)"></i>1ª División</span><span><i style="background:var(--div2)"></i>2ª División</span><span><i style="background:var(--cup)"></i>Copa</span><span class="muted">· Cualquier equipo puede jugar sábado o domingo</span></div>
    ${w ? `<div class="stack">${weekCard(1)}${weekCard(2)}${cupWeekCard(w)}</div>` :`<div class="card"><div class="empty"><span class="ms">sports_soccer</span>${L.d.matches.length ? 'La temporada ha terminado. ¡Gracias por participar!' : 'El calendario de la nueva temporada se publicará muy pronto.'}</div></div>`}

    <h2 class="section-title"><span class="ms">contact_support</span>Contacto y redes sociales</h2>
    <div class="contact-grid">
      <div class="card">
        <div class="card-head"><span class="ms" style="color:var(--primary)">contact_mail</span><div class="grow"><h3>Contacto</h3></div></div>
        ${contact ? `<ul class="contact-list">${contact}</ul>` : '<div class="empty">Datos de contacto próximamente.</div>'}
      </div>
      <div class="card">
        <div class="card-head"><span class="ms" style="color:var(--primary)">share</span><div class="grow"><h3>Síguenos en Instagram</h3></div></div>
        <div class="socials">${s.socials.map(x => `<a class="social" href="${esc(x.url)}" target="_blank" rel="noopener">
          <span class="ig">${IG_SVG}</span><span style="min-width:0"><b>${esc(x.label)}</b><span>Instagram</span></span></a>`).join('')}</div>
      </div>
    </div>
  </div>`;
}

function viewDivision(div) {
  const js = L.jornadas(div);
  let j = App.route.j;
  if (!js.includes(j)) j = L.currentJ(div);
  App.route.j = j;
  const idx = js.indexOf(j);
  const ms = L.jMatches(div, j);
  const rest = L.resting(div, j);
  const range = L.jRange(div, j);
  const curJ = L.currentJ(div);
  const chips = js.map(x => {
    const done = L.jMatches(div, x).every(m => L.played(m));
    return `<button data-act="jgo" data-j="${x}" class="${x === j ? 'active' : ''} ${done ? 'done' : ''} ${x === curJ ? 'today' : ''}" title="Jornada ${x}">J${x}</button>`;
  }).join('');

  return `<div class="fade-in">
    <div class="page-head"><span class="div-badge d${div}">${DIV_TAG[div]}</span>
      <div><h1>${DIV_NAME[div]}</h1><p>${L.teams(div).length} equipos · ${js.length} jornadas · ${esc(L.d.settings.season)}</p></div>${seasonPicker()}</div>
    ${archivedNotice()}

    <div class="card">
      <div class="jnav">
        <button class="icon-btn" data-act="jgo" data-j="${js[idx - 1]}" ${idx <= 0 ? 'disabled' : ''} aria-label="Jornada anterior"><span class="ms">chevron_left</span></button>
        <div class="jtitle"><h2>Jornada ${j}</h2><p>${esc(range)}</p></div>
        <button class="icon-btn" data-act="jgo" data-j="${js[idx + 1]}" ${idx >= js.length - 1 ? 'disabled' : ''} aria-label="Jornada siguiente"><span class="ms">chevron_right</span></button>
      </div>
      <div class="jchips" id="jchips">${chips}</div>
      <div class="swipe-area" id="shot-j-${div}">
        <div class="match-list">${matchList(ms)}</div>
        ${rest.length ? `<div class="rest-row"><span class="ms">bedtime</span>Descansa: ${rest.map(t => `<b>${esc(t.name)}</b>`).join(', ')}</div>` : ''}
      </div>
      <div class="card-actions">
        ${j !== curJ ? `<button class="btn btn-text btn-sm" data-act="jgo" data-j="${curJ}"><span class="ms">today</span>Ir a la próxima jornada</button>` : ''}
        ${shotBtn(`shot-j-${div}`, `${DIV_NAME[div]} · Jornada ${j}`, range)}
      </div>
    </div>

    <h2 class="section-title"><span class="ms">format_list_numbered</span>Clasificación</h2>
    <div class="card">
      <div id="shot-st-${div}">${standingsTable(div)}</div>
      <div class="card-actions">
        <span class="muted" style="margin-right:auto;font-size:12px;align-self:center">PTS puntos · PJ jugados · GF a favor · GC en contra · DG diferencia</span>
        ${shotBtn(`shot-st-${div}`, `Clasificación ${DIV_NAME[div]}`, `Actualizada ${D.fmt(D.today(), { day: 'numeric', month: 'long', year: 'numeric' })}`)}
      </div>
    </div>
  </div>`;
}

function rankCard(id, title, div, items, kind) {
  const icon = kind === 'goals' ? 'sports_soccer' : 'shield';
  const list = items.length ? `<ol class="rank">${items.map((it, i) => {
    if (kind === 'goals') {
      const t = L.team(it.teamId);
      return `<li><span class="medal">${i + 1}</span>${shieldImg(t, '')}<span class="who"><b>${esc(it.player.name)}</b><span>${esc(t.name)}</span></span><span class="num"><b>${it.g}</b><span>Goles</span></span></li>`;
    }
    return `<li><span class="medal">${i + 1}</span>${shieldImg(it.team, '')}<span class="who"><b>${esc(it.team.name)}</b><span>${it.pj} ${it.pj === 1 ? 'partido jugado' : 'partidos jugados'}</span></span><span class="num"><b>${it.gc}</b><span>Encajados</span></span></li>`;
  }).join('')}</ol>` : `<div class="empty"><span class="ms">hourglass_empty</span>Aún no hay datos. Se actualizará al registrar resultados.</div>`;
  return `<div class="card">
    <div id="${id}">
      <div class="card-head rank-head"><span class="ico d${div}"><span class="ms fill">${icon}</span></span>
        <div class="grow"><h3>${title}</h3><p>${DIV_NAME[div]} · Top 5</p></div></div>
      ${list}
    </div>
    ${items.length ? `<div class="card-actions">${shotBtn(id, `${title} · ${DIV_NAME[div]}`, 'Top 5')}</div>` : ''}
  </div>`;
}

function viewStats() {
  const kpi = div => {
    const s = L.divSummary(div);
    return `<div class="card"><div class="card-head"><span class="div-badge sm d${div}">${DIV_TAG[div]}</span><div class="grow"><h3>${DIV_NAME[div]}</h3></div></div>
      <div class="kpis"><div class="kpi"><b>${s.played}<small class="muted" style="font-size:16px">/${s.total}</small></b><span>Partidos jugados</span></div>
      <div class="kpi"><b>${s.goals}</b><span>Goles totales</span></div>
      <div class="kpi"><b>${s.avg}</b><span>Goles por partido</span></div>
      <div class="kpi"><b>${s.yellow}<span class="card-ico y" style="margin-left:6px"></span> ${s.red}<span class="card-ico r" style="margin-left:6px"></span></b><span>Tarjetas</span></div></div></div>`;
  };
  return `<div class="fade-in">
    <div class="page-head"><span class="div-badge d1" style="background:var(--primary)"><span class="ms">leaderboard</span></span>
      <div><h1>Estadísticas</h1><p>${esc(L.d.settings.season)} · Rankings actualizados con cada resultado</p></div>${seasonPicker()}</div>
    ${archivedNotice()}
    <div class="grid-2">${kpi(1)}${kpi(2)}</div>
    <h2 class="section-title"><span class="ms">sports_soccer</span>Máximos goleadores</h2>
    <div class="grid-2">${rankCard('shot-sc-1', 'Máximos goleadores', 1, L.scorers(1), 'goals')}${rankCard('shot-sc-2', 'Máximos goleadores', 2, L.scorers(2), 'goals')}</div>
    <h2 class="section-title"><span class="ms">shield</span>Equipos menos goleados</h2>
    <div class="grid-2">${rankCard('shot-gc-1', 'Menos goleados', 1, L.leastConceded(1), 'conceded')}${rankCard('shot-gc-2', 'Menos goleados', 2, L.leastConceded(2), 'conceded')}</div>
  </div>`;
}

/* ---------------- Copa ---------------- */
function cupCard(m) {
  const sc = L.score(m), w = L.cupWinner(m);
  const side = (id, goals, pen) => {
    const t = id ? L.team(id) : null;
    const cls = w ? (w === id ? 'win' : 'lose') : '';
    return `<div class="bteam ${cls}">${t ? shieldImg(t) : '<span class="shield ph"></span>'}
      <span class="tname">${t ? esc(t.short || t.name) : '<i>Por definir</i>'}</span>
      <b>${sc ? goals : ''}${sc && m.pen ? `<small>(${pen})</small>` : ''}</b></div>`;
  };
  const meta = m.status === 'postponed' ? 'Aplazado' : m.date ? `${D.dayShort(m.date)} ${D.dm(m.date)}${m.time ? ' · ' + esc(m.time) : ''}` : 'Fecha por definir';
  return `<div class="bmatch ${sc ? 'played' : ''}" ${sc ? `data-sum="${m.id}" title="Ver resumen"` : ''}>
    <div class="bmeta"><span>${meta}</span>${sc ? '<span class="ms">summarize</span>' : ''}</div>
    ${side(m.home, sc && sc.h, m.pen && m.pen.h)}${side(m.away, sc && sc.a, m.pen && m.pen.a)}
  </div>`;
}

function viewCup() {
  const cup = L.d.cup;
  const head = `<div class="page-head"><span class="div-badge dc"><span class="ms fill">emoji_events</span></span>
      <div><h1>${esc(cup ? cup.name : DIV_NAME.c)}</h1><p>${esc(L.d.settings.season)} · Todos los equipos de la liga</p></div>${seasonPicker()}</div>
    ${archivedNotice()}`;
  if (!cup || !cup.rounds.length) {
    return `<div class="fade-in">${head}<div class="card"><div class="empty"><span class="ms">emoji_events</span>El cuadro de la copa de esta temporada se publicará muy pronto.</div></div></div>`;
  }
  const rounds = cup.rounds.map(r => `<div class="bround"><h4>${esc(r.name)}</h4><div class="bms">${r.matches.map(cupCard).join('') || '<div class="empty" style="padding:12px">—</div>'}</div></div>`).join('');
  return `<div class="fade-in">${head}
    <div class="card">
      <div class="card-head"><span class="ms" style="color:var(--gold)">account_tree</span><div class="grow"><h3>Cuadro de la copa</h3><p>Pulsa un partido jugado para ver su resumen</p></div></div>
      <div class="bracket-wrap"><div class="bracket" id="shot-cup">${rounds}</div></div>
      <div class="card-actions">${shotBtn('shot-cup', `Cuadro · ${cup.name}`, L.d.settings.season, true)}</div>
    </div>
    <h2 class="section-title"><span class="ms">sports_soccer</span>Rankings de copa</h2>
    <div class="grid-2">${rankCard('shot-csc', 'Máximos goleadores', 'c', L.cupScorers(), 'goals')}${rankCard('shot-cgc', 'Menos goleados', 'c', L.cupConceded(), 'conceded')}</div>
  </div>`;
}

/* ---------------- Resumen de partido ---------------- */
function openSummary(id) {
  const cupHit = L.cupFind(id);
  const m = cupHit ? cupHit.m : L.d.matches.find(x => x.id === id);
  if (!m) return;
  const h = L.team(m.home), a = L.team(m.away), sc = L.score(m), det = L.details(m);
  const li = (x, n, mark) => `<li>${mark}${esc(x.p.name)}${n > 1 ? ` <b>×${n}</b>` : ''}</li>`;
  const col = (arr, key, mark, extra, right) => {
    const items = arr.map(x => li(x, +x[key], mark)).join('') + (extra ? `<li>${mark}<span class="muted">Sin asignar / p.p.</span>${extra > 1 ? ` <b>×${extra}</b>` : ''}</li>` : '');
    return `<ul class="${right ? 'right' : ''}">${items || '<li class="none">—</li>'}</ul>`;
  };
  const ball = '<span class="ms" style="font-size:18px;color:var(--primary)">sports_soccer</span>';
  const yc = '<span class="card-ico y"></span>', rc = '<span class="card-ico r"></span>';
  const section = (title, icon, key, mark, withExtra) => `<div class="sum-section"><h3>${icon}${title}</h3><div class="sum-cols">
      ${col(det.h[key], key === 'goals' ? 'g' : key === 'yellow' ? 'y' : 'r', mark, withExtra ? det.h.extra : 0, false)}
      ${col(det.a[key], key === 'goals' ? 'g' : key === 'yellow' ? 'y' : 'r', mark, withExtra ? det.a.extra : 0, true)}
    </div></div>`;
  const title = cupHit ? `${L.d.cup.name} · ${cupHit.r.name}` : `${DIV_NAME[m.div]} · Jornada ${m.j}`;
  const badge = cupHit ? '<span class="div-badge sm dc"><span class="ms fill" style="font-size:18px">emoji_events</span></span>' : `<span class="div-badge sm d${m.div}">${DIV_TAG[m.div]}</span>`;
  Dlg.open(`${Dlg.head('Resumen del partido', badge)}
    <div class="dlg-body" style="padding:0">
      <div id="shot-summary" style="background:var(--surface)">
        <div class="summary-score">
          <div class="t">${shieldImg(h, 'lg')}<span>${esc(h.name)}</span></div>
          <div class="s">${sc ? `${sc.h} - ${sc.a}` : 'VS'}</div>
          <div class="t">${shieldImg(a, 'lg')}<span>${esc(a.name)}</span></div>
          ${m.pen ? `<div class="meta" style="font-size:14px;color:#fff">Penaltis: ${m.pen.h} - ${m.pen.a}</div>` : ''}
          <div class="meta">${esc(title)}${m.date ? ' · ' + esc(D.dayLong(m.date)) : ''}${m.time ? ' · ' + esc(m.time) : ''}</div>
        </div>
        ${section('Goles y goleadores', '<span class="ms">sports_soccer</span>', 'goals', ball, true)}
        ${section('Amonestaciones', '<span class="card-ico y"></span>', 'yellow', yc, false)}
        ${section('Expulsiones', '<span class="card-ico r"></span>', 'red', rc, false)}
      </div>
    </div>
    <div class="dlg-foot">${shotBtn('shot-summary', `${h.short || h.name} ${sc ? sc.h + '-' + sc.a : ''} ${a.short || a.name}`, `${title}${m.date ? ' · ' + D.dm(m.date) : ''}`)}<button class="btn btn-filled btn-sm" data-act="close">Cerrar</button></div>`, '');
}

/* ---------------- Instantánea (imagen para redes) ---------------- */
const _pngCache = new Map();
function rasterize(src, size = 160) {
  if (_pngCache.has(src)) return Promise.resolve(_pngCache.get(src));
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = size; c.height = Math.round(size * (img.naturalHeight || 72) / (img.naturalWidth || 64));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const out = c.toDataURL('image/png');
      _pngCache.set(src, out);
      resolve(out);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function snapshot(targetId, title, sub, wide = false) {
  const src = document.getElementById(targetId);
  if (!src) return;
  if (!window.html2canvas) { snack('No se pudo cargar el módulo de captura. Revisa la conexión.', 'error'); return; }
  const s = L.d.settings;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = '<div class="spinner"></div><span>Generando imagen…</span>';
  const poster = document.createElement('div');
  poster.className = 'poster';
  poster.innerHTML = `<div class="poster-head"><img src="${window.LOGO_DATA || 'logo-192.png'}" alt=""><div><b>${esc(s.leagueName)}</b><span>${esc(title)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>
    <div class="poster-body"></div>
    <div class="poster-foot"><span>${esc(s.season)}</span><b>${esc((s.socials[0] && s.socials[0].label) || '')}</b></div>`;
  const clone = src.cloneNode(true);
  clone.removeAttribute('id');
  $$('[data-act]', clone).forEach(n => n.remove());
  $$('img[loading]', clone).forEach(n => n.removeAttribute('loading'));
  // html2canvas no pinta bien imágenes SVG: se pasan a PNG antes de capturar.
  await Promise.all($$('img', clone).filter(i => i.src.startsWith('data:image/svg')).map(async i => { i.src = await rasterize(i.src); }));
  poster.querySelector('.poster-body').append(clone);
  // El cuadro de copa es ancho: la imagen se adapta a todas sus rondas.
  const width = wide ? Math.max(760, src.scrollWidth + 56) : 760;
  poster.style.width = width + 'px';
  if (wide) poster.classList.add('wide');
  document.body.append(poster, scrim);
  try {
    await Promise.all($$('img', poster).map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const canvas = await html2canvas(poster, { scale: 2, backgroundColor: '#0b1520', useCORS: true, logging: false, windowWidth: Math.max(1200, width + 40), scrollX: 0, scrollY: 0 });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    showShot(blob, title);
  } catch (e) {
    console.error(e);
    snack('No se pudo generar la imagen.', 'error');
  } finally {
    poster.remove();
    scrim.remove();
  }
}

function showShot(blob, title) {
  const url = URL.createObjectURL(blob);
  const name = (title || 'liga').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() + '.png';
  const file = new File([blob], name, { type: 'image/png' });
  const canShare = navigator.canShare && navigator.canShare({ files: [file] });
  const canCopy = window.ClipboardItem && navigator.clipboard && navigator.clipboard.write;
  const d = Dlg.open(`${Dlg.head('Instantánea lista')}
    <div class="dlg-body"><div class="shot-preview"><img src="${url}" alt="Vista previa"></div>
    <p class="muted" style="font-size:13px;margin:12px 0 0">Imagen en alta resolución, lista para subir a Instagram, WhatsApp u otras redes.</p></div>
    <div class="dlg-foot">
      ${canCopy ? '<button class="btn btn-outline" data-k="copy"><span class="ms">content_copy</span>Copiar</button>' : ''}
      ${canShare ? '<button class="btn btn-tonal" data-k="share"><span class="ms">share</span>Compartir</button>' : ''}
      <button class="btn btn-filled" data-k="dl"><span class="ms">download</span>Descargar</button>
    </div>`, '', 2);
  d.addEventListener('close', () => setTimeout(() => URL.revokeObjectURL(url), 1000), { once: true });
  $$('[data-k]', d).forEach(b => b.addEventListener('click', async () => {
    try {
      if (b.dataset.k === 'dl') {
        const a = document.createElement('a');
        a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      } else if (b.dataset.k === 'share') {
        await navigator.share({ files: [file], title });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        snack('Imagen copiada al portapapeles', 'check_circle');
      }
    } catch (e) { if (e.name !== 'AbortError') snack('No se pudo completar la acción.', 'error'); }
  }));
}

/* ---------------- Aplicación ---------------- */
const App = {
  route: { page: 'inicio', j: null, sub: null },
  dirty: false,
  season: null,   // id de la temporada archivada que se está consultando (null = actual)
  archive: null,  // { id, name, data, shields }
  _seasonCache: new Map(),

  async setSeason(id) {
    if (!id) { this.season = null; this.archive = null; this.route.j = null; this.render(); return; }
    try {
      if (!this._seasonCache.has(id)) {
        $('#view').insertAdjacentHTML('afterbegin', '<div class="loading" style="padding:20px"><div class="spinner"></div></div>');
        this._seasonCache.set(id, await Api.getSeason(id));
      }
      const entry = (Api.state.data.archive || []).find(s => s.id === id) || { name: id };
      this.archive = { id, name: entry.name, ...this._seasonCache.get(id) };
      this.season = id;
      this.route.j = null;
      this.render();
    } catch (e) {
      snack(e.message, 'error');
      this.render();
    }
  },

  async start() {
    this.renderNav();
    this.bindGlobal();
    try {
      await Api.init();
    } catch (e) {
      console.error(e);
      $('#view').innerHTML = `<div class="card card-pad center"><span class="ms" style="font-size:40px;color:var(--loss)">cloud_off</span><h2 style="margin:8px 0">No se pudieron cargar los datos</h2><p class="muted">${esc(e.message)}</p><button class="btn btn-filled" onclick="location.reload()">Reintentar</button></div>`;
      return;
    }
    L.load(Api.state.data, Api.state.shields);
    Api.onData(st => {
      L.load(st.data, st.shields);
      if (Dlg.anyOpen()) this.dirty = true; else this.render();
    });
    Api.onAuth(() => { if (this.route.page === 'admin' && !Dlg.anyOpen()) this.render(); });
    ['#dlg', '#dlg2'].forEach(s => $(s).addEventListener('close', () => {
      if (this.dirty && !Dlg.anyOpen()) { this.dirty = false; this.render(); }
    }));
    if (Api.mode === 'local') {
      $('#banner').innerHTML = '<div class="mode-banner"><span class="ms">science</span>Modo local de prueba: los cambios solo se guardan en este navegador. Configura Firebase para publicarlos para todos (ver LEEME.md).</div>';
    }
    window.addEventListener('hashchange', () => this.onRoute());
    this.onRoute();
  },

  onRoute() {
    const parts = (location.hash.replace(/^#\/?/, '') || 'inicio').split('/');
    const page = NAV.some(n => n.id === parts[0]) ? parts[0] : 'inicio';
    const changedPage = page !== this.route.page;
    this.route = { page, j: parts[1] && PAGE_DIV[page] ? +parts[1] : null, sub: page === 'admin' ? parts[1] || null : null };
    this.render();
    if (changedPage) window.scrollTo({ top: 0 });
  },

  go(hash, replace = false) {
    if (replace) { history.replaceState(null, '', hash); this.onRoute(); } else location.hash = hash;
  },

  renderNav() {
    const item = (n, bottom) => bottom
      ? `<a href="#/${n.id}" data-nav="${n.id}"><span class="pill"><span class="ms">${n.icon}</span></span>${n.short || n.label.replace(' División', '')}</a>`
      : `<a href="#/${n.id}" data-nav="${n.id}"><span class="ms">${n.icon}</span><span class="lbl">${n.label}</span></a>`;
    $('#topnav').innerHTML = NAV.map(n => item(n, false)).join('');
    $('#bottomnav').innerHTML = NAV.map(n => item(n, true)).join('');
    this.syncThemeIcon();
  },

  render() {
    if (!L.d) return;
    const { page } = this.route;
    // Las temporadas archivadas solo se consultan en divisiones y estadísticas; portada y admin usan siempre la actual.
    const useArchive = this.season && this.archive && (PAGE_DIV[page] || page === 'estadisticas' || page === 'copa');
    if (useArchive) L.load(this.archive.data, this.archive.shields);
    else L.load(Api.state.data, Api.state.shields);
    $$('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
    $('#footSeason').textContent = L.d.settings.season || '';
    $('.ver-link').textContent = 'Versión ' + APP_VERSION;
    document.title = (page === 'inicio' ? '' : (NAV.find(n => n.id === page).label + ' · ')) + 'Liga Opinión Futsal Sevilla';
    const v = $('#view');
    if (page === 'inicio') v.innerHTML = viewHome();
    else if (PAGE_DIV[page]) v.innerHTML = viewDivision(PAGE_DIV[page]);
    else if (page === 'estadisticas') v.innerHTML = viewStats();
    else if (page === 'copa') v.innerHTML = viewCup();
    else if (page === 'admin') { v.innerHTML = Admin.view(); Admin.after(); }
    this.after();
  },

  after() {
    const ss = $('#seasonSel');
    if (ss) ss.addEventListener('change', () => this.setSeason(ss.value));
    const chips = $('#jchips');
    if (chips) {
      const act = $('button.active', chips);
      if (act) chips.scrollLeft = act.offsetLeft - chips.clientWidth / 2 + act.clientWidth / 2;
    }
    const sw = $('.swipe-area');
    if (sw) {
      let x0 = null, y0 = null;
      sw.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      sw.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          const btn = $$('.jnav .icon-btn')[dx < 0 ? 1 : 0];
          if (btn && !btn.disabled) btn.click();
        }
      });
    }
  },

  bindGlobal() {
    document.addEventListener('click', e => {
      // Partidos del cuadro de copa (atributo propio para que la instantánea no los elimine).
      const sum = e.target.closest('[data-sum]');
      if (sum) return openSummary(sum.dataset.sum);
      const fine = e.target.closest('[data-fine]');
      if (fine) return Admin.openFineDetail(fine.dataset.fine);
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act;
      if (act === 'close') { const d = el.closest('dialog'); if (d) d.close(); return; }
      if (act === 'summary') return openSummary(el.dataset.id);
      if (act === 'season-current') { e.preventDefault(); return this.setSeason(null); }
      if (act === 'shot') return snapshot(el.dataset.target, el.dataset.title, el.dataset.sub, el.dataset.wide === '1');
      if (act === 'changelog') return openChangelog();
      if (act === 'jgo') {
        const div = PAGE_DIV[this.route.page];
        if (div && el.dataset.j !== 'undefined') this.go(`#/${DIV_PAGE[div]}/${el.dataset.j}`, true);
        return;
      }
      Admin.handle(act, el, e);
    });
    // Cerrar diálogo al pulsar fuera.
    ['#dlg', '#dlg2'].forEach(s => $(s).addEventListener('click', e => { if (e.target === e.currentTarget && !e.currentTarget.dataset.modal) e.currentTarget.close(); }));
    $('#themeBtn').addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      const t = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem('lo_theme', t); } catch { /* sin almacenamiento */ }
      this.syncThemeIcon();
    });
  },

  syncThemeIcon() {
    const t = document.documentElement.getAttribute('data-theme');
    const dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#themeBtn .ms').textContent = dark ? 'light_mode' : 'dark_mode';
  },

  // Aplica un cambio sobre una copia de los datos y lo guarda. Todas las vistas se recalculan solas.
  async commit(mutate, okMsg = 'Cambios guardados') {
    const next = JSON.parse(JSON.stringify(L.d));
    try {
      mutate(next);
      await Api.save(next, Api.state.version);
      L.load(next, Api.state.shields);
      if (Dlg.anyOpen()) this.dirty = true; else this.render();
      snack(okMsg, 'check_circle');
      return true;
    } catch (e) {
      console.error(e);
      if (e.status === 409) snack('Otro gestor guardó cambios a la vez. Se han cargado los datos actuales: repite la operación.', 'sync_problem');
      else if (e.status === 401 || e.status === 403) snack(e.message, 'lock');
      else snack(e.message || 'No se pudo guardar.', 'error');
      return false;
    }
  }
};
