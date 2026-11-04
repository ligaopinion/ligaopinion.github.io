/* =====================================================================
 * Panel de administración: partidos y resultados, equipos y jugadores,
 * usuarios, ajustes y cuenta.
 * ===================================================================== */
const ROLE_LABEL = { admin: 'Administrador', gestor: 'Normal (gestor)' };

const Admin = {
  tab: 'partidos',
  div: 1,
  j: null,
  teamDiv: 0,
  users: null,
  ed: null,       // partido en edición
  team: null,     // equipo en edición

  tabs() {
    const t = [
      { id: 'partidos', label: 'Partidos y resultados', icon: 'scoreboard' },
      { id: 'copa', label: 'Copa', icon: 'emoji_events' },
      { id: 'equipos', label: 'Equipos y jugadores', icon: 'groups' },
      { id: 'sanciones', label: 'Sanciones', icon: 'payments' }
    ];
    if (Api.user && Api.user.role === 'admin') {
      t.push({ id: 'temporadas', label: 'Temporadas', icon: 'history' });
      t.push({ id: 'usuarios', label: 'Usuarios', icon: 'manage_accounts' });
      t.push({ id: 'ajustes', label: 'Ajustes', icon: 'settings' });
    }
    t.push({ id: 'cuenta', label: 'Mi cuenta', icon: 'person' });
    return t;
  },

  view() {
    const u = Api.user;
    if (!u) return this.viewLogin();
    const tabs = this.tabs();
    if (App.route.sub && tabs.some(t => t.id === App.route.sub)) this.tab = App.route.sub;
    if (!tabs.some(t => t.id === this.tab)) this.tab = 'partidos';
    const body = { partidos: () => this.viewMatches(), equipos: () => this.viewTeams(), copa: () => this.viewCupAdmin(), sanciones: () => this.viewFines(), temporadas: () => this.viewSeasons(), usuarios: () => this.viewUsers(), ajustes: () => this.viewSettings(), cuenta: () => this.viewAccount() }[this.tab]();
    return `<div class="fade-in">
      <div class="page-head"><span class="div-badge d1" style="background:var(--secondary)"><span class="ms">admin_panel_settings</span></span>
        <div><h1>Administración</h1><p>Los cambios se publican al instante en toda la web</p></div></div>
      ${u.mustChange ? `<div class="alert warn"><span class="ms">warning</span><div><p><b>Estás usando la contraseña por defecto.</b> Cámbiala ahora en <a href="#/admin/cuenta">Mi cuenta</a> para proteger la web.</p></div></div>` : ''}
      <div class="card">
        <div class="admin-user"><span class="avatar">${esc(u.username[0])}</span>
          <div style="flex:1;min-width:0"><b>${esc(u.username)}</b><div><span class="tag ${u.role}">${ROLE_LABEL[u.role]}</span></div></div>
          <button class="btn btn-text btn-sm" data-act="changelog"><span class="ms">new_releases</span>Novedades v${APP_VERSION}</button>
          <button class="btn btn-outline btn-sm" data-act="logout"><span class="ms">logout</span>Cerrar sesión</button></div>
        <div class="admin-tabs" role="tablist">${tabs.map(t => `<button data-act="atab" data-tab="${t.id}" class="${t.id === this.tab ? 'active' : ''}"><span class="ms">${t.icon}</span>${t.label}</button>`).join('')}</div>
        <div id="adminBody">${body}</div>
      </div>
    </div>`;
  },

  viewLogin() {
    return `<div class="card login-card fade-in">
      <div class="head"><img src="logo-192.png" alt=""><h2 style="font-size:28px;margin-top:10px;text-transform:uppercase">Acceso gestores</h2>
        <p class="muted" style="margin:4px 0 0">Zona reservada para la organización de la liga</p></div>
      <form id="loginForm" autocomplete="on">
        <label class="field"><span>Usuario</span><input name="username" autocomplete="username" required autocapitalize="none"></label>
        <label class="field"><span>Contraseña</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn btn-filled" type="submit" style="height:48px"><span class="ms">login</span>Entrar</button>
        <p class="muted center" id="loginMsg" style="margin:0;font-size:13px;min-height:20px"></p>
      </form>
    </div>`;
  },

  after() {
    const lf = $('#loginForm');
    if (lf) {
      lf.addEventListener('submit', async e => {
        e.preventDefault();
        const f = new FormData(lf), btn = $('button', lf);
        btn.disabled = true;
        $('#loginMsg').textContent = 'Comprobando…';
        try {
          await Api.login(f.get('username'), f.get('password'));
          snack('Sesión iniciada', 'check_circle');
          App.render();
        } catch (er) {
          $('#loginMsg').textContent = er.message;
          btn.disabled = false;
        }
      });
      return;
    }
    if (this.tab === 'usuarios') this.loadUsers();
    const js = $('#admJ');
    if (js) js.addEventListener('change', () => { this.j = +js.value; this.rerender(); });
    const sf = $('#settingsForm');
    if (sf) sf.addEventListener('submit', e => { e.preventDefault(); this.saveSettings(sf); });
    const pf = $('#pwForm');
    if (pf) pf.addEventListener('submit', e => { e.preventDefault(); this.changePw(pf); });
    const uf = $('#userForm');
    if (uf) uf.addEventListener('submit', e => { e.preventDefault(); this.createUser(uf); });
    $$('[data-round-name]').forEach(i => i.addEventListener('change', () => this.renameRound(i.dataset.roundName, i.value)));
    const fs = $('#fineSeason');
    if (fs) fs.addEventListener('change', () => this.setFineSeason(fs.value));
    const imp = $('#importFile');
    if (imp) imp.addEventListener('change', () => this.importBackup(imp));
  },

  setTab(tab) {
    this.tab = tab;
    App.route.sub = tab;
    history.replaceState(null, '', '#/admin/' + tab);
    App.render();
  },

  rerender() {
    const b = $('#adminBody');
    if (!b) return App.render();
    App.render();
  },

  async handle(act, el) {
    switch (act) {
      case 'logout': await Api.logout(); this.users = null; snack('Sesión cerrada', 'logout'); App.render(); break;
      case 'atab': this.setTab(el.dataset.tab); break;
      case 'adiv': this.div = +el.dataset.div; this.j = null; App.render(); break;
      case 'aj': if (el.dataset.j !== 'undefined') { this.j = +el.dataset.j; App.render(); } break;
      case 'm-edit': this.openMatch(el.dataset.id); break;
      case 'm-new': this.openMatch(null); break;
      case 'st': this.step(el); break;
      case 'qadd': this.quickAdd(el.dataset.side); break;
      case 'ed-save': this.saveMatch(); break;
      case 'ed-del': this.deleteMatch(); break;
      case 'tdiv': this.teamDiv = +el.dataset.div; App.render(); break;
      case 'team-edit': this.openTeam(el.dataset.id); break;
      case 'team-save': this.saveTeam(); break;
      case 'team-del': this.deleteTeam(); break;
      case 'team-shield-clear': this.team.shield = null; this.renderTeamShield(); break;
      case 'roster': this.openRoster(el.dataset.id); break;
      case 'pl-add': this.addPlayer(); break;
      case 'pl-save': this.savePlayer(el.dataset.id); break;
      case 'pl-del': this.deletePlayer(el.dataset.id); break;
      case 'u-reset': this.resetUser(el.dataset.uid, el.dataset.name); break;
      case 'u-del': this.deleteUser(el.dataset.uid, el.dataset.name); break;
      case 'soc-add': this.addSocialRow(); break;
      case 'soc-del': el.closest('.soc-row').remove(); break;
      case 'backup': this.backup(); break;
      case 'season-new': this.openNewSeason(); break;
      case 'season-start': this.startSeason(); break;
      case 'ns-add': this.addNewTeamRow(); break;
      case 'ns-del': el.closest('.ns-row').remove(); break;
      case 'season-view': await App.setSeason(el.dataset.id); location.hash = '#/primera'; break;
      case 'season-del': this.deleteSeason(el.dataset.id); break;
      case 'cup-create': this.createCup(); break;
      case 'round-add': this.addRound(); break;
      case 'cup-delete': this.deleteCup(); break;
      case 'round-del': this.deleteRound(el.dataset.r); break;
      case 'cm-add': this.addCupMatch(el.dataset.r); break;
      case 'cm-edit': this.openMatch(el.dataset.id, el.dataset.r); break;
      case 'fdiv': this.fDiv = +el.dataset.v; App.render(); break;
      case 'fines-save': this.saveFineAmounts(); break;
      case 'fines-xlsx': this.exportFines(); break;
      case 'gen-open': this.openGenerator(); break;
      case 'gen-run': this.runGenerator(); break;
      default: break;
    }
  },

  /* ------------------------- Partidos ------------------------- */
  viewMatches() {
    const div = this.div;
    const js = L.jornadas(div);
    if (!js.includes(this.j)) this.j = L.currentJ(div);
    const j = this.j, idx = js.indexOf(j);
    const ms = L.jMatches(div, j);
    const rows = ms.map(m => {
      const h = L.team(m.home), a = L.team(m.away), sc = L.score(m);
      const st = { played: 'Finalizado', pending: 'Pendiente', postponed: 'Aplazado' }[m.status];
      return `<div class="list-row clickable" data-act="m-edit" data-id="${m.id}">
        <div style="text-align:center;min-width:58px"><b style="font-family:var(--font-display);font-size:18px">${esc(m.time)}</b><div class="muted" style="font-size:11px">${D.dayShort(m.date)} ${D.dm(m.date)}</div></div>
        ${shieldImg(h)}<div class="grow"><b>${esc(h.short || h.name)} <span class="muted" style="font-weight:400">vs</span> ${esc(a.short || a.name)}</b><span class="tag ${m.status}">${st}</span></div>
        ${shieldImg(a)}
        <b style="font:800 22px var(--font-display);min-width:52px;text-align:center">${sc ? `${sc.h}-${sc.a}` : '–'}</b>
        <span class="ms muted">edit</span>
      </div>`;
    }).join('');
    return `<div class="toolbar">
        <div class="segmented"><button data-act="adiv" data-div="1" class="${div === 1 ? 'active' : ''}">1ª División</button><button data-act="adiv" data-div="2" class="${div === 2 ? 'active' : ''}">2ª División</button></div>
        <div style="display:flex;align-items:center;gap:4px">
          <button class="icon-btn tonal" data-act="aj" data-j="${js[idx - 1]}" ${idx <= 0 ? 'disabled' : ''}><span class="ms">chevron_left</span></button>
          <select id="admJ" class="input" style="min-height:40px;width:auto;padding:6px 12px">${js.map(x => `<option value="${x}" ${x === j ? 'selected' : ''}>Jornada ${x}</option>`).join('')}</select>
          <button class="icon-btn tonal" data-act="aj" data-j="${js[idx + 1]}" ${idx >= js.length - 1 ? 'disabled' : ''}><span class="ms">chevron_right</span></button>
        </div>
        <span class="spacer"></span>
        ${this.canGenerate(div) ? '<button class="btn btn-outline btn-sm" data-act="gen-open"><span class="ms">auto_awesome</span>Generar calendario</button>' : ''}
        <button class="btn btn-filled btn-sm" data-act="m-new"><span class="ms">add</span>Nuevo partido</button>
      </div>
      <div class="alert info" style="margin:16px 16px 0"><span class="ms">touch_app</span><p>Pulsa un partido para anotar el resultado: suma goles, amarillas y rojas a cada jugador con <b>+</b> y <b>−</b>. El marcador, la clasificación y los rankings se actualizan solos al guardar.</p></div>
      <div style="padding:8px 0">${rows || '<div class="empty">No hay partidos en esta jornada.</div>'}</div>`;
  },

  // roundId: si se indica, el partido es de la copa (ronda roundId).
  openMatch(id, roundId = null) {
    const round = roundId && L.d.cup ? L.d.cup.rounds.find(r => r.id === roundId) : null;
    const src = round ? round.matches.find(m => m.id === id) : id && L.d.matches.find(m => m.id === id);
    const div = src ? src.div : this.div;
    this.ed = {
      isNew: !src,
      roundId: round ? round.id : null,
      m: src ? JSON.parse(JSON.stringify(src)) : {
        id: L.uid('m'), div, j: this.j || 1, date: (L.jMatches(div, this.j)[0] || {}).date || D.today(), time: '10:00',
        home: '', away: '', status: 'pending', ev: { h: {}, a: {}, hx: 0, ax: 0 }
      },
      newPlayers: []
    };
    const m = this.ed.m;
    const isCup = !!round;
    // En copa: todos los equipos de la temporada, agrupados por división; ★ = clasificado de la ronda anterior.
    const prevWinners = new Set();
    if (isCup) {
      // Los cruces enlazados (cuartos, semis, final) se rellenan con los ganadores de sus cruces de origen.
      if (!m.home) m.home = L.cupSide(m, 'home');
      if (!m.away) m.away = L.cupSide(m, 'away');
      const i = L.d.cup.rounds.indexOf(round);
      const prev = m.src ? [L.cupSrc(m, 'home'), L.cupSrc(m, 'away')].filter(Boolean).map(h => h.m) : i > 0 ? L.d.cup.rounds[i - 1].matches : [];
      prev.forEach(x => { const w = L.cupWinner(x); if (w) prevWinners.add(w); });
    }
    const opt = (t, sel) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${prevWinners.has(t.id) ? '★ ' : ''}${esc(t.name)}</option>`;
    const teamOpts = (sel) => `<option value="">— Elegir equipo —</option>` + (isCup
      ? [1, 2].map(dv => `<optgroup label="${DIV_NAME[dv]}">${L.teams(dv).map(t => opt(t, sel)).join('')}</optgroup>`).join('')
      : L.teams(m.div).map(t => opt(t, sel)).join(''));
    const badge = isCup ? '<span class="div-badge sm dc"><span class="ms fill">emoji_events</span></span>' : `<span class="div-badge sm d${m.div}" id="edBadge">${DIV_TAG[m.div]}</span>`;
    const d = Dlg.open(`${Dlg.head(isCup ? `Copa · ${esc(round.name)}` : src ? 'Editar partido' : 'Nuevo partido', badge)}
      <div class="dlg-body">
        <div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:16px">
          ${isCup ? `<label class="field"><span>Código del cruce</span><input id="edLabel" value="${esc(m.label || '')}" maxlength="8" placeholder="A, B, C1…"></label>` : `<label class="field"><span>División</span><select id="edDiv"><option value="1" ${m.div === 1 ? 'selected' : ''}>1ª División</option><option value="2" ${m.div === 2 ? 'selected' : ''}>2ª División</option></select></label>
          <label class="field"><span>Jornada</span><input id="edJ" type="number" min="1" max="60" value="${m.j}"></label>`}
          <label class="field"><span>Fecha</span><input id="edDate" type="date" value="${m.date}"></label>
          <label class="field"><span>Hora</span><input id="edTime" type="time" value="${m.time}"></label>
          <label class="field"><span>Estado</span><select id="edStatus">
            <option value="pending" ${m.status === 'pending' ? 'selected' : ''}>Pendiente</option>
            <option value="played" ${m.status === 'played' ? 'selected' : ''}>Finalizado</option>
            <option value="postponed" ${m.status === 'postponed' ? 'selected' : ''}>Aplazado</option></select></label>
        </div>
        <div class="form-grid" style="margin-bottom:16px">
          <label class="field"><span>Equipo local</span><select id="edHome">${teamOpts(m.home)}</select></label>
          <label class="field"><span>Equipo visitante</span><select id="edAway">${teamOpts(m.away)}</select></label>
        </div>
        ${isCup ? `<div class="form-grid" style="margin-bottom:16px">
          <label class="field"><span>Penaltis local (solo si hay empate)</span><input id="edPh" type="number" min="0" max="99" value="${m.pen ? m.pen.h : ''}" inputmode="numeric"></label>
          <label class="field"><span>Penaltis visitante (solo si hay empate)</span><input id="edPa" type="number" min="0" max="99" value="${m.pen ? m.pen.a : ''}" inputmode="numeric"></label>
        </div>${m.src ? `<p class="muted" style="margin:-6px 0 14px;font-size:12.5px">Este cruce lo juegan el <b>${esc(L.cupSrcText(m, 'home'))}</b> y el <b>${esc(L.cupSrcText(m, 'away'))}</b>; se rellenan solos cuando esos partidos tienen resultado.</p>` : ''}${prevWinners.size ? '<p class="muted" style="margin:-6px 0 14px;font-size:12.5px">★ Equipo clasificado en la ronda anterior</p>' : ''}` : ''}
        <div id="edScore"></div>
        <div id="edCols" class="ed-cols" style="margin-top:16px"></div>
      </div>
      <div class="dlg-foot">
        ${src ? '<button class="btn btn-danger" data-act="ed-del"><span class="ms">delete</span>Eliminar</button>' : ''}
        <span class="spacer"></span>
        <button class="btn btn-text" data-act="close">Cancelar</button>
        <button class="btn btn-filled" data-act="ed-save"><span class="ms">save</span>Guardar</button>
      </div>`, 'wide');
    d.dataset.modal = '1';
    d.addEventListener('close', () => { delete d.dataset.modal; }, { once: true });

    if (isCup) $('#edLabel').addEventListener('input', e => { m.label = e.target.value.trim().toUpperCase(); });
    if (!isCup) {
      $('#edDiv').addEventListener('change', e => {
        m.div = +e.target.value; m.home = ''; m.away = ''; m.ev = { h: {}, a: {}, hx: 0, ax: 0 };
        $('#edHome').innerHTML = teamOpts(''); $('#edAway').innerHTML = teamOpts('');
        $('#edBadge').className = `div-badge sm d${m.div}`; $('#edBadge').textContent = DIV_TAG[m.div];
        this.renderEd();
      });
      $('#edJ').addEventListener('change', e => { m.j = Math.max(1, +e.target.value || 1); });
    }
    $('#edDate').addEventListener('change', e => { m.date = e.target.value; });
    $('#edTime').addEventListener('change', e => { m.time = e.target.value; });
    $('#edStatus').addEventListener('change', e => { m.status = e.target.value; this.renderEd(); });
    $('#edHome').addEventListener('change', e => { m.home = e.target.value; m.ev.h = {}; m.ev.hx = 0; this.renderEd(); });
    $('#edAway').addEventListener('change', e => { m.away = e.target.value; m.ev.a = {}; m.ev.ax = 0; this.renderEd(); });
    this.renderEd();
  },

  edPlayers(side) {
    const m = this.ed.m;
    const teamId = side === 'h' ? m.home : m.away;
    if (!teamId) return [];
    const list = [...L.roster(teamId), ...this.ed.newPlayers.filter(p => p.teamId === teamId)];
    // Jugadores que ya tienen datos en este partido (aunque se hayan dado de baja después).
    for (const pid of Object.keys(m.ev[side])) {
      if (!list.some(p => p.id === pid)) { const p = L.player(pid); if (p) list.push(p); }
    }
    return list;
  },

  edScoreVal() {
    const m = this.ed.m;
    const sum = s => Object.values(m.ev[s]).reduce((a, x) => a + (+x.g || 0), 0);
    return { h: sum('h') + m.ev.hx, a: sum('a') + m.ev.ax };
  },

  renderEd() {
    const m = this.ed.m;
    const h = m.home ? L.team(m.home) : null, a = m.away ? L.team(m.away) : null;
    const sc = this.edScoreVal();
    const st = { played: 'Finalizado', pending: 'Pendiente', postponed: 'Aplazado' }[m.status];
    $('#edScore').innerHTML = `<div class="score-big">
      <div class="t">${h ? shieldImg(h, 'lg') : ''}<span>${h ? esc(h.name) : 'Local'}</span></div>
      <div style="text-align:center"><div class="s">${sc.h} - ${sc.a}</div><span class="tag ${m.status}" style="background:rgba(255,255,255,.15);color:#fff">${st}</span></div>
      <div class="t">${a ? shieldImg(a, 'lg') : ''}<span>${a ? esc(a.name) : 'Visitante'}</span></div></div>`;
    const stepper = (side, pid, k, val, label) => `<span class="stepper ${k} ${val ? 'on' : ''}" title="${label}">
      <button type="button" data-act="st" data-side="${side}" data-pid="${pid}" data-k="${k}" data-d="-1" aria-label="Quitar ${label}">−</button>
      <b>${k === 'g' ? '<span class="ms" style="font-size:15px">sports_soccer</span>' : `<span class="card-ico ${k}"></span>`}${val}</b>
      <button type="button" data-act="st" data-side="${side}" data-pid="${pid}" data-k="${k}" data-d="1" aria-label="Añadir ${label}">+</button></span>`;
    const col = side => {
      const t = side === 'h' ? h : a;
      if (!t) return `<div class="ed-team"><h4>${side === 'h' ? 'Local' : 'Visitante'}</h4><div class="empty">Elige el equipo</div></div>`;
      const players = this.edPlayers(side);
      const rows = players.map(p => {
        const e = m.ev[side][p.id] || {};
        return `<div class="ed-row"><span class="pname">${p.number ? `<small>#${esc(p.number)}</small>` : ''}${esc(p.name)}${p.deleted ? ' <small>(baja)</small>' : ''}</span>
          <span class="steppers">${stepper(side, p.id, 'g', +e.g || 0, 'gol')}${stepper(side, p.id, 'y', +e.y || 0, 'amarilla')}${stepper(side, p.id, 'r', +e.r || 0, 'roja')}</span></div>`;
      }).join('');
      const x = side === 'h' ? m.ev.hx : m.ev.ax;
      return `<div class="ed-team"><h4>${shieldImg(t)}${esc(t.name)}</h4>
        ${rows || '<div class="empty" style="padding:16px">Este equipo aún no tiene jugadores. Añádelos abajo o en "Equipos y jugadores".</div>'}
        <div class="ed-row"><span class="pname muted">Goles sin asignar / en propia puerta</span><span class="steppers">${stepper(side, '__x', 'g', x, 'gol sin asignar')}</span></div>
        <div class="quick-add"><input class="input num" id="qn-${side}" placeholder="Dorsal" inputmode="numeric"><input class="input" id="qp-${side}" placeholder="Añadir jugador rápido"><button class="btn btn-tonal btn-sm" data-act="qadd" data-side="${side}"><span class="ms">person_add</span></button></div>
      </div>`;
    };
    $('#edCols').innerHTML = col('h') + col('a');
  },

  step(el) {
    const m = this.ed.m;
    const { side, pid, k } = el.dataset;
    const d = +el.dataset.d;
    if (pid === '__x') {
      const key = side === 'h' ? 'hx' : 'ax';
      m.ev[key] = Math.max(0, m.ev[key] + d);
    } else {
      const e = m.ev[side][pid] || { g: 0, y: 0, r: 0 };
      e[k] = Math.max(0, (+e[k] || 0) + d);
      if (k === 'y') e.y = Math.min(e.y, 2);
      m.ev[side][pid] = e;
    }
    if (d > 0 && m.status === 'pending') { m.status = 'played'; $('#edStatus').value = 'played'; }
    this.renderEd();
  },

  quickAdd(side) {
    const m = this.ed.m;
    const name = $('#qp-' + side).value.trim();
    if (!name) { $('#qp-' + side).focus(); return; }
    this.ed.newPlayers.push({ id: L.uid('p'), teamId: side === 'h' ? m.home : m.away, name, number: $('#qn-' + side).value.trim() });
    this.renderEd();
    setTimeout(() => { const i = $('#qp-' + side); if (i) i.focus(); });
  },

  async saveMatch() {
    const { m, isNew, newPlayers, roundId } = this.ed;
    if (roundId) return this.saveCupMatch();
    if (!m.home || !m.away) return snack('Elige los dos equipos.', 'error');
    if (m.home === m.away) return snack('Un equipo no puede jugar contra sí mismo.', 'error');
    if (!m.date || !m.time) return snack('Indica fecha y hora.', 'error');
    for (const s of ['h', 'a']) for (const [pid, e] of Object.entries(m.ev[s])) if (!(+e.g || +e.y || +e.r)) delete m.ev[s][pid];
    const ok = await App.commit(d => {
      d.players.push(...newPlayers);
      if (isNew) d.matches.push(m);
      else d.matches[d.matches.findIndex(x => x.id === m.id)] = m;
    }, 'Partido guardado. Clasificación y rankings actualizados.');
    if (ok) { this.div = m.div; this.j = m.j; Dlg.close(); }
  },

  async deleteMatch() {
    const { m, roundId } = this.ed;
    const label = m.home && m.away ? `<b>${esc(L.team(m.home).name)} – ${esc(L.team(m.away).name)}</b>` : 'este partido';
    if (!await Dlg.confirm(`¿Eliminar ${label}? Se perderán su resultado y estadísticas.`)) return;
    const ok = await App.commit(d => {
      if (roundId) { const r = d.cup.rounds.find(x => x.id === roundId); r.matches = r.matches.filter(x => x.id !== m.id); }
      else d.matches = d.matches.filter(x => x.id !== m.id);
    }, 'Partido eliminado');
    if (ok) Dlg.close();
  },

  /* ------------------------- Copa ------------------------- */
  async saveCupMatch() {
    const { m, newPlayers, roundId } = this.ed;
    if (m.home && m.home === m.away) return snack('Un equipo no puede jugar contra sí mismo.', 'error');
    if (m.status === 'played' && (!m.home || !m.away)) return snack('Para anotar el resultado elige los dos equipos.', 'error');
    const ph = $('#edPh').value.trim(), pa = $('#edPa').value.trim();
    m.pen = ph !== '' && pa !== '' ? { h: +ph, a: +pa } : null;
    const sc = this.edScoreVal();
    if (m.status === 'played' && sc.h === sc.a && (!m.pen || m.pen.h === m.pen.a)) return snack('En copa, si hay empate indica el resultado de los penaltis (con un ganador).', 'error');
    if (m.status !== 'played' || sc.h !== sc.a) m.pen = null;
    for (const s of ['h', 'a']) for (const [pid, e] of Object.entries(m.ev[s])) if (!(+e.g || +e.y || +e.r)) delete m.ev[s][pid];
    m.cup = true;
    const ok = await App.commit(d => {
      d.players.push(...newPlayers);
      const r = d.cup.rounds.find(x => x.id === roundId);
      const i = r.matches.findIndex(x => x.id === m.id);
      if (i >= 0) r.matches[i] = m; else r.matches.push(m);
    }, 'Partido de copa guardado. Cuadro y rankings actualizados.');
    if (ok) Dlg.close();
  },

  viewCupAdmin() {
    const cup = L.d.cup, isAdmin = Api.user.role === 'admin';
    if (!cup) {
      return `<div class="card-pad" style="display:grid;gap:16px;justify-items:start">
        <div class="alert info" style="margin:0"><span class="ms">emoji_events</span><p>La <b>${DIV_NAME.c}</b> se crea una vez por temporada y participan <b>todos los equipos de la temporada actual</b> (${L.teams(1).length} de 1ª y ${L.teams(2).length} de 2ª), con sus ascensos, descensos y equipos nuevos ya aplicados. Se crean las rondas ${CUP_TEMPLATE.map(r => `${r.name} (${r.labels.length})`).join(', ')}. Cuartos, Semifinal y Final se rellenan solos con los ganadores de cada cruce.${CUP_PRESETS[L.d.settings.season] ? ` Para <b>${esc(L.d.settings.season)}</b> se carga además el cuadro oficial: cruces de la Ronda 1 y todas las fechas.` : ''}</p></div>
        ${isAdmin ? '<button class="btn btn-filled" data-act="cup-create"><span class="ms">emoji_events</span>Crear copa de esta temporada</button>' : '<p class="muted" style="margin:0">Pide a un administrador que cree la copa de esta temporada.</p>'}
      </div>`;
    }
    const st = { played: 'Finalizado', pending: 'Pendiente', postponed: 'Aplazado' };
    const rounds = cup.rounds.map(r => `<div class="round-card">
      <div class="round-head">
        ${isAdmin ? `<input class="input" data-round-name="${r.id}" value="${esc(r.name)}" aria-label="Nombre de la ronda">` : `<b style="flex:1">${esc(r.name)}</b>`}
        <span class="count">${r.matches.length} partidos</span>
        ${isAdmin ? `<button class="btn btn-text btn-sm" data-act="cm-add" data-r="${r.id}"><span class="ms">add</span>Partido</button>
        <button class="icon-btn" data-act="round-del" data-r="${r.id}" title="Eliminar ronda" style="color:var(--loss)"><span class="ms">delete</span></button>` : ''}
      </div>
      ${r.matches.map(m => {
        const hid = L.cupSide(m, 'home'), aid = L.cupSide(m, 'away');
        const h = hid ? L.team(hid) : null, a = aid ? L.team(aid) : null, sc = L.score(m);
        const ph = side => `<i class="muted">${esc(L.cupSrcText(m, side) || 'Por definir')}</i>`;
        return `<div class="list-row clickable" data-act="cm-edit" data-r="${r.id}" data-id="${m.id}">
          ${m.label ? `<b class="blabel" style="height:24px;min-width:30px;font-size:12px">${esc(m.label)}</b>` : ''}
          <div style="text-align:center;min-width:58px"><b style="font-family:var(--font-display);font-size:16px">${m.time ? esc(m.time) : '--:--'}</b><div class="muted" style="font-size:11px">${m.date ? `${D.dayShort(m.date)} ${D.dm(m.date)}` : 'Sin fecha'}</div></div>
          ${h ? shieldImg(h) : '<span class="shield ph" style="width:32px;height:32px"></span>'}
          <div class="grow"><b>${h ? esc(h.short || h.name) : ph('home')} <span class="muted" style="font-weight:400">vs</span> ${a ? esc(a.short || a.name) : ph('away')}</b><span class="tag ${m.status}">${st[m.status]}</span></div>
          ${a ? shieldImg(a) : '<span class="shield ph" style="width:32px;height:32px"></span>'}
          <b style="font:800 20px var(--font-display);min-width:58px;text-align:center">${sc ? `${sc.h}-${sc.a}${m.pen ? `<small class="muted" style="display:block;font:600 10px var(--font)">${m.pen.h}-${m.pen.a} pen.</small>` : ''}` : '–'}</b>
          <span class="ms muted">edit</span>
        </div>`;
      }).join('') || '<div class="empty" style="padding:16px">Sin partidos. Pulsa “Partido” para añadir uno.</div>'}
    </div>`).join('');
    return `<div class="toolbar">
        <span class="div-badge sm dc"><span class="ms fill">emoji_events</span></span><b style="font:800 20px var(--font-display);text-transform:uppercase">${esc(cup.name)}</b>
        <span class="spacer"></span>
        <a class="btn btn-text btn-sm" href="#/copa"><span class="ms">account_tree</span>Ver cuadro</a>
        ${isAdmin ? '<button class="btn btn-outline btn-sm" data-act="round-add"><span class="ms">add</span>Añadir ronda</button><button class="btn btn-danger btn-sm" data-act="cup-delete"><span class="ms">delete</span>Eliminar copa</button>' : ''}
      </div>
      <div class="alert info" style="margin:16px 16px 0"><span class="ms">touch_app</span><p>Pulsa un partido para elegir sus equipos, fecha y hora, y anotar el resultado con goleadores, amonestaciones y expulsiones. Si hay empate, indica los penaltis. En cada ronda, ★ marca los equipos clasificados en la anterior.</p></div>
      ${rounds}`;
  },

  async createCup() {
    const season = L.d.settings.season;
    const hasPreset = !!CUP_PRESETS[season];
    if (!await Dlg.confirm(`¿Crear la <b>${DIV_NAME.c}</b> de <b>${esc(season)}</b> con ${L.d.teams.length} equipos?<br><br>${hasPreset
      ? 'Se cargará el <b>cuadro oficial</b> de esta temporada: cruces de la Ronda 1 y fechas y horas de todas las rondas. Después elige los equipos de Octavos 1 y Octavos 2.'
      : 'Se creará el cuadro (Ronda 1, Octavos 1 y 2, Cuartos, Semifinal y Final) para que elijas los equipos y las fechas.'}`, 'Crear copa', false)) return;
    await App.commit(d => {
      const cup = L.buildCup(season, d.teams);
      delete cup.preset;
      d.cup = cup;
    }, hasPreset ? 'Copa creada con el cuadro oficial. Elige ahora los equipos de los octavos.' : 'Copa creada. Ahora elige los equipos de la Ronda 1.');
  },

  // Para empezar de nuevo (por ejemplo, si se creó con un formato equivocado).
  async deleteCup() {
    const played = L.cupMatches().filter(m => L.played(m)).length;
    if (!await Dlg.confirm(`¿Eliminar la copa de <b>${esc(L.d.settings.season)}</b>${played ? ` con <b>${played} partidos ya jugados</b> (se perderán sus resultados y estadísticas)` : ''}? Después podrás volver a crearla.`, 'Eliminar copa')) return;
    await App.commit(d => { d.cup = null; }, 'Copa eliminada');
  },

  async addRound() {
    await App.commit(d => { d.cup.rounds.push({ id: L.uid('r'), name: 'Nueva ronda', matches: [L.newCupMatch()] }); }, 'Ronda añadida');
  },

  async deleteRound(rid) {
    const r = L.d.cup.rounds.find(x => x.id === rid);
    if (!r) return;
    const played = r.matches.filter(m => L.played(m)).length;
    if (!await Dlg.confirm(`¿Eliminar la ronda <b>${esc(r.name)}</b> con sus ${r.matches.length} partidos${played ? ` (<b>${played} ya jugados</b>)` : ''}?`)) return;
    await App.commit(d => { d.cup.rounds = d.cup.rounds.filter(x => x.id !== rid); }, 'Ronda eliminada');
  },

  async addCupMatch(rid) {
    await App.commit(d => { d.cup.rounds.find(x => x.id === rid).matches.push(L.newCupMatch()); }, 'Partido añadido');
  },

  async renameRound(rid, name) {
    name = name.trim();
    const r = L.d.cup.rounds.find(x => x.id === rid);
    if (!r || !name || name === r.name) return;
    await App.commit(d => { d.cup.rounds.find(x => x.id === rid).name = name; }, 'Ronda renombrada');
  },

  /* ------------------------- Equipos ------------------------- */
  viewTeams() {
    const teams = L.teams(this.teamDiv || undefined);
    const count = id => L.roster(id).length;
    return `<div class="toolbar">
        <div class="segmented">${[[0, 'Todos'], [1, '1ª División'], [2, '2ª División']].map(([v, l]) => `<button data-act="tdiv" data-div="${v}" class="${this.teamDiv === v ? 'active' : ''}">${l}</button>`).join('')}</div>
        <span class="spacer"></span>
        <button class="btn btn-filled btn-sm" data-act="team-edit"><span class="ms">add</span>Nuevo equipo</button>
      </div>
      <div class="team-grid">${teams.map(t => `<div class="team-card">
        ${shieldImg(t, 'lg')}
        <div class="grow"><b>${esc(t.name)}</b><span><span class="div-badge sm d${t.div}" style="height:20px;min-width:26px;font-size:13px;border-radius:6px;margin-right:6px">${DIV_TAG[t.div]}</span>${count(t.id)} jugadores</span></div>
        <button class="icon-btn" data-act="roster" data-id="${t.id}" title="Jugadores"><span class="ms">groups</span></button>
        <button class="icon-btn" data-act="team-edit" data-id="${t.id}" title="Editar equipo"><span class="ms">edit</span></button>
      </div>`).join('') || '<div class="empty">No hay equipos.</div>'}</div>`;
  },

  openTeam(id) {
    const src = id && L.d.teams.find(t => t.id === id);
    this.team = src ? { ...src, shield: undefined, isNew: false } : { id: L.uid('t'), name: '', short: '', div: this.teamDiv || 1, color: '#0aa7c0', shield: undefined, isNew: true };
    const t = this.team;
    const d = Dlg.open(`${Dlg.head(src ? 'Editar equipo' : 'Nuevo equipo')}
      <div class="dlg-body">
        <div style="display:flex;gap:16px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
          <div id="tmShield"></div>
          <div style="display:grid;gap:8px">
            <label class="btn btn-tonal btn-sm" style="cursor:pointer"><span class="ms">upload</span>Subir escudo<input type="file" accept="image/*" id="tmFile" hidden></label>
            <button class="btn btn-text btn-sm" data-act="team-shield-clear"><span class="ms">hide_image</span>Usar escudo por defecto</button>
          </div>
        </div>
        <div class="form-grid">
          <label class="field full"><span>Nombre completo</span><input id="tmName" value="${esc(t.name)}" maxlength="60"></label>
          <label class="field"><span>Nombre corto (móvil)</span><input id="tmShort" value="${esc(t.short)}" maxlength="18"></label>
          <label class="field"><span>División</span><select id="tmDiv"><option value="1" ${t.div === 1 ? 'selected' : ''}>1ª División</option><option value="2" ${t.div === 2 ? 'selected' : ''}>2ª División</option></select></label>
          <label class="field"><span>Color (escudo por defecto)</span><input id="tmColor" type="color" value="${esc(t.color)}" style="padding:4px;height:48px"></label>
        </div>
      </div>
      <div class="dlg-foot">
        ${src ? '<button class="btn btn-danger" data-act="team-del"><span class="ms">delete</span>Eliminar</button>' : ''}
        <span class="spacer"></span>
        <button class="btn btn-text" data-act="close">Cancelar</button>
        <button class="btn btn-filled" data-act="team-save"><span class="ms">save</span>Guardar</button>
      </div>`, 'narrow');
    d.dataset.modal = '1';
    d.addEventListener('close', () => { delete d.dataset.modal; }, { once: true });
    this.renderTeamShield();
    $('#tmColor').addEventListener('input', e => { t.color = e.target.value; this.renderTeamShield(); });
    $('#tmName').addEventListener('input', e => { t.name = e.target.value; });
    $('#tmFile').addEventListener('change', async e => {
      const f = e.target.files[0];
      if (!f) return;
      try { t.shield = await resizeImage(f, 160); this.renderTeamShield(); }
      catch { snack('No se pudo leer la imagen.', 'error'); }
    });
  },

  renderTeamShield() {
    const t = this.team;
    const src = t.shield === undefined ? shieldSrc({ ...t, name: t.name || '?' }) : (t.shield || defaultShield({ ...t, name: t.name || '?' }));
    $('#tmShield').innerHTML = `<img class="shield xl" src="${src}" alt="Escudo">`;
  },

  async saveTeam() {
    const t = this.team;
    t.name = $('#tmName').value.trim().toUpperCase();
    t.short = $('#tmShort').value.trim().toUpperCase() || t.name.slice(0, 14);
    t.div = +$('#tmDiv').value;
    t.color = $('#tmColor').value;
    if (!t.name) return snack('Escribe el nombre del equipo.', 'error');
    if (L.d.teams.some(x => x.id !== t.id && x.name === t.name)) return snack('Ya existe un equipo con ese nombre.', 'error');
    const rec = { id: t.id, name: t.name, short: t.short, div: t.div, color: t.color, shield: null };
    const ok = await App.commit(d => {
      const i = d.teams.findIndex(x => x.id === t.id);
      if (i >= 0) d.teams[i] = rec; else d.teams.push(rec);
    }, t.isNew ? 'Equipo creado' : 'Equipo actualizado');
    if (!ok) return;
    if (t.shield !== undefined) {
      try { await Api.saveShield(t.id, t.shield); } catch (e) { snack('El equipo se guardó, pero no el escudo: ' + e.message, 'error'); }
    }
    Dlg.close();
  },

  async deleteTeam() {
    const t = this.team;
    const nm = L.d.matches.filter(m => m.home === t.id || m.away === t.id).length;
    const np = L.d.players.filter(p => p.teamId === t.id).length;
    if (!await Dlg.confirm(`¿Eliminar <b>${esc(t.name)}</b>? También se eliminarán <b>${nm} partidos</b> y <b>${np} jugadores</b> de este equipo. No se puede deshacer.`)) return;
    const ok = await App.commit(d => {
      d.teams = d.teams.filter(x => x.id !== t.id);
      d.matches = d.matches.filter(m => m.home !== t.id && m.away !== t.id);
      d.players = d.players.filter(p => p.teamId !== t.id);
      // En la copa, el cruce queda "por definir".
      for (const r of (d.cup ? d.cup.rounds : [])) for (const m of r.matches) {
        if (m.home === t.id) { m.home = ''; m.ev.h = {}; m.ev.hx = 0; m.status = 'pending'; m.pen = null; }
        if (m.away === t.id) { m.away = ''; m.ev.a = {}; m.ev.ax = 0; m.status = 'pending'; m.pen = null; }
      }
    }, 'Equipo eliminado');
    if (ok) { Api.saveShield(t.id, null).catch(() => {}); Dlg.close(); }
  },

  /* ------------------------- Jugadores ------------------------- */
  openRoster(teamId) {
    this.rosterTeam = teamId;
    const t = L.team(teamId);
    const d = Dlg.open(`${Dlg.head('Plantilla', shieldImg(t))}<div class="dlg-body" id="rosterBody" style="padding:0"></div>
      <div class="dlg-foot"><button class="btn btn-filled" data-act="close">Hecho</button></div>`, '');
    d.dataset.modal = '1';
    d.addEventListener('close', () => { delete d.dataset.modal; }, { once: true });
    this.renderRoster();
  },

  renderRoster() {
    const t = L.team(this.rosterTeam);
    const ps = L.roster(t.id);
    const stats = new Map(L.playerTotals(t.div).map(x => [x.player.id, x]));
    $('#rosterBody').innerHTML = `<div class="list-row" style="background:var(--surface-2)"><b style="flex:1">${esc(t.name)}</b><span class="muted">${ps.length} jugadores</span></div>
      ${ps.map(p => { const s = stats.get(p.id); return `<div class="list-row">
        <input class="input" style="width:70px;min-height:40px;padding:8px" id="pn-${p.id}" value="${esc(p.number || '')}" placeholder="Nº" inputmode="numeric">
        <input class="input" style="flex:1;min-height:40px;padding:8px 10px" id="pp-${p.id}" value="${esc(p.name)}">
        <span class="muted hide-sm" style="font-size:12px;white-space:nowrap">${s ? `⚽ ${s.g} · <span class="card-ico y"></span> ${s.y} · <span class="card-ico r"></span> ${s.r}` : ''}</span>
        <button class="icon-btn" data-act="pl-save" data-id="${p.id}" title="Guardar"><span class="ms">save</span></button>
        <button class="icon-btn" data-act="pl-del" data-id="${p.id}" title="Eliminar" style="color:var(--loss)"><span class="ms">delete</span></button>
      </div>`; }).join('') || '<div class="empty">Sin jugadores todavía.</div>'}
      <div class="list-row" style="background:var(--surface-2)">
        <input class="input" style="width:70px;min-height:40px;padding:8px" id="newPn" placeholder="Nº" inputmode="numeric">
        <input class="input" style="flex:1;min-height:40px;padding:8px 10px" id="newPp" placeholder="Nombre del jugador">
        <button class="btn btn-filled btn-sm" data-act="pl-add"><span class="ms">person_add</span>Añadir</button>
      </div>`;
    const np = $('#newPp');
    np.addEventListener('keydown', e => { if (e.key === 'Enter') this.addPlayer(); });
  },

  async addPlayer() {
    const name = $('#newPp').value.trim();
    if (!name) return $('#newPp').focus();
    const p = { id: L.uid('p'), teamId: this.rosterTeam, name, number: $('#newPn').value.trim() };
    if (await App.commit(d => { d.players.push(p); }, 'Jugador añadido')) {
      this.renderRoster();
      $('#newPp').focus();
    }
  },

  async savePlayer(id) {
    const name = $('#pp-' + id).value.trim();
    if (!name) return snack('El nombre no puede estar vacío.', 'error');
    const number = $('#pn-' + id).value.trim();
    if (await App.commit(d => { const p = d.players.find(x => x.id === id); p.name = name; p.number = number; }, 'Jugador actualizado')) this.renderRoster();
  },

  async deletePlayer(id) {
    const p = L.player(id);
    const used = L.d.matches.some(m => (m.ev.h && m.ev.h[id]) || (m.ev.a && m.ev.a[id]));
    if (!await Dlg.confirm(used
      ? `¿Dar de baja a <b>${esc(p.name)}</b>? Tiene goles o tarjetas registrados: se conservarán en el historial y rankings, pero dejará de aparecer en la plantilla.`
      : `¿Eliminar a <b>${esc(p.name)}</b>?`)) return;
    if (await App.commit(d => {
      if (used) d.players.find(x => x.id === id).deleted = true;
      else d.players = d.players.filter(x => x.id !== id);
    }, used ? 'Jugador dado de baja' : 'Jugador eliminado')) this.renderRoster();
  },

  /* ------------------------- Sanciones económicas ------------------------- */
  fDiv: 0,
  fSeason: '', // '' = temporada actual; id = temporada archivada (solo consulta)

  // Ejecuta fn con los datos de la temporada elegida en Sanciones y después vuelve a la actual.
  withFineSeason(fn) {
    const arch = this.fSeason && App._seasonCache.get(this.fSeason);
    if (!arch) return fn(false);
    L.load(arch.data, arch.shields);
    try { return fn(true); } finally { L.load(Api.state.data, Api.state.shields); }
  },

  async setFineSeason(id) {
    if (id && !App._seasonCache.has(id)) {
      try { App._seasonCache.set(id, await Api.getSeason(id)); } catch (e) { snack(e.message, 'error'); id = ''; }
    }
    this.fSeason = id;
    App.render();
  },

  fineSeasonPicker() {
    const idx = L.d.archive;
    if (!idx.length) return '';
    return `<label class="season-pick" style="margin-left:0"><span class="ms">history</span><select id="fineSeason" aria-label="Temporada">
      <option value="">${esc(L.d.settings.season)} (actual)</option>
      ${[...idx].reverse().map(s => `<option value="${esc(s.id)}" ${this.fSeason === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>`;
  },

  viewFines() {
    const picker = this.fineSeasonPicker();
    return this.withFineSeason(archived => this.finesHtml(picker, archived));
  },

  finesHtml(picker, archived) {
    const f = L.d.settings.fines, canEdit = Api.user.role === 'admin' && !archived;
    const rows = L.fines({ div: this.fDiv });
    const sum = k => rows.reduce((s, r) => s + k(r), 0);
    const tot = {
      ly: sum(r => r.liga.y), lr: sum(r => r.liga.r), cy: sum(r => r.copa.y), cr: sum(r => r.copa.r),
      y: sum(r => r.y), r: sum(r => r.r), ey: sum(r => r.ey), er: sum(r => r.er), total: sum(r => r.total)
    };
    const max = Math.max(1, ...rows.map(r => r.total));
    const seg = (v, label) => `<button data-act="fdiv" data-v="${v}" class="${this.fDiv === v ? 'active' : ''}">${label}</button>`;
    const season = L.d.settings.season;
    const divLabel = this.fDiv ? DIV_NAME[this.fDiv] : 'Todas las divisiones';
    const yc = '<span class="card-ico y"></span>', rc = '<span class="card-ico r"></span>';
    return `<div class="toolbar">
        ${picker}
        <div class="segmented">${seg(0, 'Todas')}${seg(1, '1ª')}${seg(2, '2ª')}</div>
      </div>
      ${archived ? `<div class="alert info" style="margin:16px 16px 0"><span class="ms">history</span><p>Consultando <b>${esc(season)}</b>, ya archivada. Solo lectura: las tarjetas e importes se muestran tal como quedaron al cerrar esa temporada.</p></div>` : ''}
      <div class="card-pad" style="border-bottom:1px solid var(--outline)">
        <div class="fines-cfg">
          <label class="field"><span>€ por tarjeta amarilla</span><input id="fineY" type="number" min="0" step="0.5" value="${f.yellow}" ${canEdit ? '' : 'disabled'}></label>
          <label class="field"><span>€ por expulsión</span><input id="fineR" type="number" min="0" step="0.5" value="${f.red}" ${canEdit ? '' : 'disabled'}></label>
          ${canEdit ? '<button class="btn btn-tonal" data-act="fines-save" style="height:48px"><span class="ms">save</span>Guardar importes</button>' : ''}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:12.5px">Solo visible en administración. Se acumulan las tarjetas de <b>liga y copa</b> de los partidos finalizados de la temporada. Al iniciar una temporada nueva el recuento empieza de cero; las anteriores se consultan con el selector de temporada.</p>
      </div>
      <div class="kpis">
        <div class="kpi kpi-cards"><b>${tot.ly}${yc}${tot.lr}${rc}</b><span>Liga</span></div>
        <div class="kpi kpi-cards"><b>${tot.cy}${yc}${tot.cr}${rc}</b><span>Copa</span></div>
        <div class="kpi"><b>${money(tot.total)}</b><span>Total temporada (${tot.y} amarillas · ${tot.r} expulsiones)</span></div>
        <div class="kpi"><b>${rows.filter(r => r.total > 0).length}</b><span>Equipos con sanciones</span></div>
      </div>
      <div id="shot-fines">
        <div class="fine-legend"><span><b>${esc(season)} · ${esc(divLabel)}</b></span><span>${yc} ${money(f.yellow)} / amarilla</span><span>${rc} ${money(f.red)} / expulsión</span></div>
        <div class="table-wrap"><table class="tbl fines-tbl">
          <thead>
            <tr><th rowspan="2">#</th><th rowspan="2" class="left">Equipo</th><th rowspan="2">PJ</th>
              <th colspan="2" class="grp liga">Liga</th><th colspan="2" class="grp copa">Copa</th><th colspan="2" class="grp tot">Total</th>
              <th rowspan="2">Importe</th><th rowspan="2" class="hide-sm left">Acumulado</th></tr>
            <tr><th class="sep">${yc}</th><th>${rc}</th><th class="sep">${yc}</th><th>${rc}</th><th class="sep">${yc}</th><th>${rc}</th></tr>
          </thead>
          <tbody>${rows.map((r, i) => `<tr class="clickable" data-fine="${r.team.id}">
            <td class="pos"><span>${i + 1}</span></td>
            <td class="left"><div class="teamcell">${shieldImg(r.team)}<span>${teamName(r.team)}</span></div></td>
            <td>${r.pj}</td>
            <td class="sep">${r.liga.y}</td><td>${r.liga.r}</td>
            <td class="sep">${r.copa.y}</td><td>${r.copa.r}</td>
            <td class="sep"><b>${r.y}</b></td><td><b>${r.r}</b></td>
            <td class="money total">${money(r.total)}</td>
            <td class="hide-sm left"><div class="fbar"><span class="y" style="width:${(r.ey / max) * 100}%"></span><span class="r" style="left:${(r.ey / max) * 100}%;width:${(r.er / max) * 100}%"></span></div></td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td></td><td class="left">TOTAL</td><td></td>
            <td class="sep">${tot.ly}</td><td>${tot.lr}</td><td class="sep">${tot.cy}</td><td>${tot.cr}</td><td class="sep">${tot.y}</td><td>${tot.r}</td>
            <td class="money total">${money(tot.total)}</td><td class="hide-sm"></td></tr></tfoot>
        </table></div>
      </div>
      <div class="card-actions">
        <span class="muted" style="margin-right:auto;font-size:12px;align-self:center">Pulsa un equipo para ver el detalle por partido</span>
        ${shotBtn('shot-fines', 'Sanciones económicas', `${season} · ${divLabel}${archived ? '' : ' · ' + D.fmt(D.today(), { day: 'numeric', month: 'long', year: 'numeric' })}`)}
        <button class="btn btn-filled btn-sm" data-act="fines-xlsx"><span class="ms">table_view</span>Descargar Excel</button>
      </div>`;
  },

  fineContext(m) {
    const hit = m.cup ? L.cupFind(m.id) : null;
    return hit ? `Copa · ${hit.r.name}` : `Liga ${DIV_TAG[m.div]} · Jornada ${m.j}`;
  },

  openFineDetail(teamId) {
    this.withFineSeason(() => {
      const row = L.fines().find(r => r.team.id === teamId);
      if (!row) return;
      const list = [...row.detail].sort((a, b) => (a.m.date || '').localeCompare(b.m.date || ''));
      const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
      const yc = '<span class="card-ico y"></span>', rc = '<span class="card-ico r"></span>';
      Dlg.open(`${Dlg.head('Detalle de sanciones', shieldImg(row.team))}
        <div class="dlg-body" style="padding:0">
          <div class="list-row" style="background:var(--surface-2)"><div class="grow"><b>${esc(row.team.name)}</b><span>${esc(L.d.settings.season)} · ${plural(row.pj, 'partido', 'partidos')}</span>
            <span style="display:block">Liga: ${row.liga.y}${yc} ${row.liga.r}${rc} · Copa: ${row.copa.y}${yc} ${row.copa.r}${rc} · Total: ${plural(row.y, 'amarilla', 'amarillas')}, ${plural(row.r, 'expulsión', 'expulsiones')}</span></div>
            <b class="money" style="font:800 24px var(--font-display);color:var(--primary)">${money(row.total)}</b></div>
          ${list.map(x => `<div class="list-row">
            <div style="min-width:78px;text-align:center"><b style="font-size:13px">${x.m.date ? D.dm(x.m.date) : '—'}</b><div class="muted" style="font-size:11px">${esc(this.fineContext(x.m))}</div></div>
            <div class="grow"><b>${x.comp === 'copa' ? '<span class="ms fill" style="font-size:15px;color:var(--cup);vertical-align:-2px">emoji_events</span> ' : ''}vs ${esc(L.team(x.rival).name)}</b><span>${x.list.map(p => `${esc(p.p.name)}${p.y ? ` ${yc}${p.y > 1 ? '×' + p.y : ''}` : ''}${p.r ? ` ${rc}${p.r > 1 ? '×' + p.r : ''}` : ''}`).join(' · ')}</span></div>
            <b class="money">${money(x.amount)}</b>
          </div>`).join('') || '<div class="empty">Sin sanciones registradas.</div>'}
        </div>
        <div class="dlg-foot"><button class="btn btn-filled" data-act="close">Cerrar</button></div>`, 'narrow');
    });
  },

  async saveFineAmounts() {
    if (this.fSeason) return snack('Las temporadas archivadas no se pueden modificar.', 'error');
    const y = Math.max(0, +$('#fineY').value || 0), r = Math.max(0, +$('#fineR').value || 0);
    await App.commit(d => { d.settings.fines = { yellow: y, red: r }; }, 'Importes actualizados');
  },

  async exportFines() {
    try {
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el módulo de Excel. Revisa la conexión.'));
          document.head.append(s);
        });
      }
      this.withFineSeason(() => {
        const f = L.d.settings.fines;
        const rows = L.fines({ div: this.fDiv });
        const resumen = [['Equipo', 'División', 'Partidos jugados', 'Amarillas liga', 'Expulsiones liga', 'Amarillas copa', 'Expulsiones copa',
          'Amarillas total', 'Expulsiones total', `Importe amarillas (${f.yellow} €)`, `Importe expulsiones (${f.red} €)`, 'Total (€)']];
        rows.forEach(r => resumen.push([r.team.name, DIV_NAME[r.team.div], r.pj, r.liga.y, r.liga.r, r.copa.y, r.copa.r, r.y, r.r, r.ey, r.er, r.total]));
        const t = rows.reduce((s, r) => [r.liga.y, r.liga.r, r.copa.y, r.copa.r, r.y, r.r, r.ey, r.er, r.total].map((v, i) => s[i] + v), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
        resumen.push(['TOTAL', '', '', ...t]);
        const detalle = [['Fecha', 'Competición', 'Equipo', 'Rival', 'Jugador', 'Amarillas', 'Expulsiones', 'Importe (€)']];
        rows.forEach(r => [...r.detail].sort((a, b) => (a.m.date || '').localeCompare(b.m.date || '')).forEach(x => x.list.forEach(p =>
          detalle.push([x.m.date ? D.fmt(x.m.date, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '', this.fineContext(x.m), r.team.name, L.team(x.rival).name, p.p.name, p.y, p.r, p.y * f.yellow + p.r * f.red]))));
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.aoa_to_sheet(resumen);
        ws1['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 10 }, { wch: 13 }, { wch: 15 }, { wch: 13 }, { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 12 }];
        const ws2 = XLSX.utils.aoa_to_sheet(detalle);
        ws2['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 32 }, { wch: 32 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen por equipo');
        XLSX.utils.book_append_sheet(wb, ws2, 'Detalle por partido');
        const season = (L.d.settings.season || 'temporada').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        XLSX.writeFile(wb, `sanciones-${season}-${D.today()}.xlsx`);
      });
      snack('Excel descargado', 'check_circle');
    } catch (e) { snack(e.message || 'No se pudo generar el Excel.', 'error'); }
  },


  /* ------------------------- Temporadas ------------------------- */
  viewSeasons() {
    const s = L.d.settings, s1 = L.divSummary(1), s2 = L.divSummary(2);
    const arch = [...L.d.archive].reverse();
    return `<div class="card-pad" style="display:grid;gap:16px">
      <div class="alert info" style="margin:0"><span class="ms">info</span><p>Al iniciar una nueva temporada, la actual se <b>archiva completa</b> (resultados, goleadores, clasificaciones y escudos). Cualquiera podrá consultarla desde el selector de temporada en 1ª, 2ª y Estadísticas.</p></div>
      <div class="team-card" style="flex-wrap:wrap"><span class="div-badge" style="background:var(--primary)"><span class="ms">event_available</span></span>
        <div class="grow"><b>${esc(s.season)} (actual)</b><span>1ª: ${s1.played}/${s1.total} partidos jugados · 2ª: ${s2.played}/${s2.total}</span></div>
        <button class="btn btn-filled btn-sm" data-act="season-new"><span class="ms">add</span>Iniciar nueva temporada</button></div>
      <h3 style="font-size:20px;text-transform:uppercase">Temporadas archivadas</h3>
      ${arch.length ? `<div class="card" style="border-radius:var(--radius-lg)">${arch.map(a => `<div class="list-row">
        <span class="ms muted">inventory_2</span>
        <div class="grow"><b>${esc(a.name)}</b><span>Archivada el ${esc(D.fmt(a.at, { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div>
        <button class="btn btn-text btn-sm" data-act="season-view" data-id="${esc(a.id)}"><span class="ms">visibility</span>Ver</button>
        <button class="icon-btn" style="color:var(--loss)" title="Eliminar del archivo" data-act="season-del" data-id="${esc(a.id)}"><span class="ms">delete</span></button>
      </div>`).join('')}</div>` : '<p class="muted" style="margin:0">Todavía no hay temporadas archivadas.</p>'}
    </div>`;
  },

  nextSeasonName(cur) {
    const m = String(cur || '').match(/(\d{4})\s*([-/])\s*(\d{2,4})/);
    if (!m) return '';
    const y1 = +m[1] + 1, y2 = +m[3] + 1;
    return cur.replace(m[0], `${y1}${m[2]}${m[3].length === 2 ? String(y2 % 100).padStart(2, '0') : y2}`);
  },

  openNewSeason() {
    const teams = [...L.teams(1), ...L.teams(2)];
    const d = Dlg.open(`${Dlg.head('Nueva temporada')}
      <div class="dlg-body" style="display:grid;gap:18px">
        <label class="field"><span>Nombre de la nueva temporada</span><input id="nsName" value="${esc(this.nextSeasonName(L.d.settings.season))}" placeholder="Temporada 2027-28"></label>
        <div>
          <h3 style="font-size:20px;text-transform:uppercase">Equipos que continúan</h3>
          <p class="muted" style="margin:4px 0 10px;font-size:13.5px">Elige en qué división juega cada equipo la próxima temporada (ascensos y descensos) o márcalo como retirado.</p>
          <div class="card" style="border-radius:var(--radius-lg)">${teams.map(t => `<div class="list-row">${shieldImg(t)}
            <div class="grow"><b>${esc(t.name)}</b><span>Ahora en ${DIV_NAME[t.div]}</span></div>
            <select class="input" data-ns-team="${t.id}" style="width:auto;min-height:38px;padding:6px 10px">
              <option value="1" ${t.div === 1 ? 'selected' : ''}>1ª División${t.div === 2 ? ' ▲' : ''}</option>
              <option value="2" ${t.div === 2 ? 'selected' : ''}>2ª División${t.div === 1 ? ' ▼' : ''}</option>
              <option value="0">Se retira</option></select></div>`).join('')}</div>
        </div>
        <div>
          <h3 style="font-size:20px;text-transform:uppercase">Equipos nuevos</h3>
          <div id="nsNew" style="display:grid;gap:8px;margin-top:8px"></div>
          <button class="btn btn-text btn-sm" data-act="ns-add" style="margin-top:6px"><span class="ms">add</span>Añadir equipo nuevo</button>
        </div>
        <label style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" id="nsKeep" checked style="width:20px;height:20px;accent-color:var(--primary)">Conservar las plantillas de jugadores de los equipos que continúan</label>
      </div>
      <div class="dlg-foot"><button class="btn btn-text" data-act="close">Cancelar</button><button class="btn btn-filled" data-act="season-start"><span class="ms">rocket_launch</span>Archivar y empezar</button></div>`, 'wide');
    d.dataset.modal = '1';
    d.addEventListener('close', () => { delete d.dataset.modal; }, { once: true });
  },

  addNewTeamRow() {
    $('#nsNew').insertAdjacentHTML('beforeend', `<div class="ns-row" style="display:grid;grid-template-columns:1fr auto auto;gap:8px">
      <input class="input" data-ns-name placeholder="Nombre del equipo" maxlength="60">
      <select class="input" data-ns-div style="width:auto"><option value="1">1ª División</option><option value="2" selected>2ª División</option></select>
      <button type="button" class="icon-btn" data-act="ns-del" style="color:var(--loss)" title="Quitar"><span class="ms">close</span></button></div>`);
    $$('#nsNew [data-ns-name]').pop().focus();
  },

  async startSeason() {
    const name = $('#nsName').value.trim();
    const cur = L.d.settings.season || 'Temporada anterior';
    if (!name) return snack('Escribe el nombre de la nueva temporada.', 'error');
    if (name === cur) return snack('La nueva temporada debe llamarse distinto a la actual.', 'error');
    const choice = new Map($$('[data-ns-team]').map(s => [s.dataset.nsTeam, +s.value]));
    const newTeams = $$('.ns-row').map(r => ({ name: $('[data-ns-name]', r).value.trim().toUpperCase(), div: +$('[data-ns-div]', r).value })).filter(x => x.name);
    const keep = $('#nsKeep').checked;
    const count = div => [...choice.values()].filter(v => v === div).length + newTeams.filter(t => t.div === div).length;
    if (!await Dlg.confirm(`Se archivará <b>${esc(cur)}</b> con todos sus resultados y empezará <b>${esc(name)}</b> con <b>${count(1)} equipos en 1ª</b> y <b>${count(2)} en 2ª</b>, sin partidos. ¿Continuar?`, 'Archivar y empezar', false)) return;

    const base = cur.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'temporada';
    let id = base, k = 2;
    while (L.d.archive.some(a => a.id === id)) id = `${base}-${k++}`;
    const snapshot = JSON.parse(JSON.stringify(L.d));
    delete snapshot.archive;
    const shields = {};
    for (const t of L.d.teams) if (L.shields[t.id]) shields[t.id] = L.shields[t.id];
    try {
      await Api.archiveSeason(id, { name: cur, data: snapshot, shields });
    } catch (e) {
      return snack('No se pudo archivar la temporada: ' + e.message, 'error');
    }
    const palette = ['#0aa7c0', '#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#f4511e', '#3949ab', '#7cb342'];
    const ok = await App.commit(d => {
      d.archive.push({ id, name: cur, at: D.today() });
      d.settings.season = name;
      d.teams = d.teams.filter(t => choice.get(t.id) !== 0).map(t => ({ ...t, div: choice.get(t.id) || t.div }));
      newTeams.forEach((t, i) => d.teams.push({ id: L.uid('t'), name: t.name, short: t.name.slice(0, 14), div: t.div, color: palette[i % palette.length], shield: null }));
      const ids = new Set(d.teams.map(t => t.id));
      d.players = keep ? d.players.filter(p => ids.has(p.teamId) && !p.deleted) : [];
      d.matches = [];
      d.cup = null; // la copa anterior queda en el archivo; la nueva se crea desde Admin › Copa
    }, `${name} creada. Ahora genera el calendario de cada división.`);
    if (ok) {
      App._seasonCache.delete(id);
      Dlg.close();
      this.setTab('partidos');
    }
  },

  async deleteSeason(id) {
    const a = L.d.archive.find(x => x.id === id);
    if (!a) return;
    if (!await Dlg.confirm(`¿Eliminar definitivamente <b>${esc(a.name)}</b> del archivo? Sus resultados y estadísticas dejarán de poder consultarse.`)) return;
    try {
      await Api.deleteSeason(id);
      await App.commit(d => { d.archive = d.archive.filter(x => x.id !== id); }, 'Temporada eliminada del archivo');
    } catch (e) { snack(e.message, 'error'); }
  },

  /* ------------------------- Generador de calendario ------------------------- */
  // Solo para temporadas recién iniciadas: la división aún no tiene ningún partido.
  canGenerate(div) {
    return Api.user && Api.user.role === 'admin' && L.matches(div).length === 0;
  },

  openGenerator() {
    const div = this.div;
    if (!this.canGenerate(div)) return snack('El calendario solo se genera al iniciar una temporada nueva.', 'error');
    const teams = L.teams(div);
    let sat = D.today();
    while (D.dow(sat) !== 6) sat = D.add(sat, 1);
    const d = Dlg.open(`${Dlg.head('Generar calendario', `<span class="div-badge sm d${div}">${DIV_TAG[div]}</span>`)}
      <div class="dlg-body" style="display:grid;gap:14px">
        <div class="alert info" style="margin:0"><span class="ms">auto_awesome</span><p>Crea todas las jornadas de <b>${DIV_NAME[div]}</b> (todos contra todos) con sus <b>${teams.length} equipos</b>${teams.length % 2 ? ' (cada jornada descansa uno)' : ''}. Luego puedes cambiar el día y la hora de cualquier partido.</p></div>
        <div class="form-grid">
          <label class="field"><span>Fecha de la jornada 1</span><input id="gStart" type="date" value="${sat}"></label>
          <label class="field"><span>Formato</span><select id="gLegs"><option value="2">Ida y vuelta</option><option value="1">Solo ida</option></select></label>
          <label class="field"><span>Hora del primer partido</span><input id="gTime" type="time" value="10:00"></label>
          <label class="field"><span>Minutos entre partidos</span><input id="gGap" type="number" min="15" step="5" value="60"></label>
          <label class="field full"><span>Fines de semana sin partidos (festivos), separados por comas</span><input id="gSkip" placeholder="26/12/2027, 02/01/2028"></label>
        </div>
      </div>
      <div class="dlg-foot"><button class="btn btn-text" data-act="close">Cancelar</button><button class="btn btn-filled" data-act="gen-run"><span class="ms">auto_awesome</span>Generar</button></div>`, 'narrow');
    d.dataset.modal = '1';
    d.addEventListener('close', () => { delete d.dataset.modal; }, { once: true });
  },

  async runGenerator() {
    const div = this.div;
    const ids = L.teams(div).map(t => t.id);
    if (ids.length < 2) return snack('Hacen falta al menos 2 equipos en la división.', 'error');
    if (!this.canGenerate(div)) return snack('El calendario solo se genera al iniciar una temporada nueva.', 'error');
    const start = $('#gStart').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return snack('Indica la fecha de la jornada 1.', 'error');
    const [hh, mm] = ($('#gTime').value || '10:00').split(':').map(Number);
    const gap = Math.max(5, +$('#gGap').value || 60);
    const skip = new Set($('#gSkip').value.split(/[,;\s]+/).filter(Boolean).map(s => {
      const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
      return m ? `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
    }).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s)).map(s => D.weekendStart(s)));
    // Orden aleatorio para que el calendario no siga el orden alfabético.
    const order = [...ids].sort(() => Math.random() - .5);
    const rounds = L.roundRobin(order, $('#gLegs').value === '2');
    const out = [];
    let date = start;
    rounds.forEach((pairs, r) => {
      while (skip.has(D.weekendStart(date))) date = D.add(date, 7);
      pairs.forEach(([h, a], i) => {
        const t = hh * 60 + mm + i * gap;
        out.push({ id: L.uid('m'), div, j: r + 1, date, time: `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, home: h, away: a, status: 'pending', ev: { h: {}, a: {}, hx: 0, ax: 0 } });
      });
      date = D.add(date, 7);
    });
    const ok = await App.commit(d => {
      if (d.matches.some(m => m.div === div)) throw Object.assign(new Error('Esta división ya tiene calendario.'), { status: 400 });
      d.matches = d.matches.concat(out);
    },
      `Calendario generado: ${rounds.length} jornadas y ${out.length} partidos`);
    if (ok) { this.j = 1; Dlg.close(); }
  },

  /* ------------------------- Usuarios ------------------------- */
  viewUsers() {
    return `<div class="card-pad" style="border-bottom:1px solid var(--outline)">
        <h3 style="font-size:20px;text-transform:uppercase;margin-bottom:12px">Crear cuenta</h3>
        <form id="userForm" class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));align-items:end" autocomplete="off">
          <label class="field"><span>Usuario</span><input name="username" required minlength="3" maxlength="32" autocapitalize="none" autocomplete="off"></label>
          <label class="field"><span>Contraseña (mín. 6)</span><input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
          <label class="field"><span>Rol</span><select name="role"><option value="gestor">Normal (gestor)</option><option value="admin">Administrador</option></select></label>
          <button class="btn btn-filled" style="height:48px" type="submit"><span class="ms">person_add</span>Crear</button>
        </form>
        <p class="muted" style="font-size:12.5px;margin:12px 0 0"><b>Administrador:</b> todo, incluidos usuarios y ajustes. <b>Normal:</b> resultados, partidos, equipos y jugadores.</p>
      </div>
      <div id="userList"><div class="loading" style="padding:30px"><div class="spinner"></div></div></div>`;
  },

  async loadUsers() {
    const box = $('#userList');
    try {
      const users = (await Api.listUsers()).sort((a, b) => a.username.localeCompare(b.username));
      if (!$('#userList')) return;
      box.innerHTML = users.map(u => `<div class="list-row">
        <span class="avatar" style="width:38px;height:38px;font-size:15px">${esc(u.username[0])}</span>
        <div class="grow"><b>${esc(u.username)}${u.uid === Api.user.uid ? ' <span class="muted" style="font-weight:400">(tú)</span>' : ''}</b><span>${ROLE_LABEL[u.role]}</span></div>
        <select class="input" data-role-uid="${u.uid}" style="width:auto;min-height:38px;padding:6px 10px" ${u.uid === Api.user.uid ? 'disabled' : ''}>
          <option value="gestor" ${u.role === 'gestor' ? 'selected' : ''}>Normal</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option></select>
        ${u.uid === Api.user.uid ? '' : `<button class="icon-btn" title="Nueva contraseña" data-act="u-reset" data-uid="${u.uid}" data-name="${esc(u.username)}"><span class="ms">key</span></button>
        <button class="icon-btn" title="Eliminar" style="color:var(--loss)" data-act="u-del" data-uid="${u.uid}" data-name="${esc(u.username)}"><span class="ms">delete</span></button>`}
      </div>`).join('');
      $$('[data-role-uid]', box).forEach(s => s.addEventListener('change', async () => {
        try { await Api.setRole(s.dataset.roleUid, s.value); snack('Rol actualizado', 'check_circle'); }
        catch (e) { snack(e.message, 'error'); }
        this.loadUsers();
      }));
    } catch (e) {
      box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
  },

  async createUser(form) {
    const f = new FormData(form);
    const btn = $('button', form);
    btn.disabled = true;
    try {
      await Api.createUser({ username: f.get('username'), password: f.get('password'), role: f.get('role') });
      form.reset();
      snack('Cuenta creada', 'check_circle');
      this.loadUsers();
    } catch (e) { snack(e.message, 'error'); }
    btn.disabled = false;
  },

  resetUser(uid, name) {
    const d = Dlg.open(`${Dlg.head('Nueva contraseña')}<form class="dlg-body" id="rpForm" style="display:grid;gap:14px">
        <p style="margin:0">Establece una nueva contraseña para <b>${esc(name)}</b>.</p>
        <label class="field"><span>Nueva contraseña (mín. 6)</span><input name="pw" type="password" minlength="6" required autocomplete="new-password"></label>
      </form><div class="dlg-foot"><button class="btn btn-text" data-act="close">Cancelar</button><button class="btn btn-filled" type="submit" form="rpForm">Guardar</button></div>`, 'narrow', 2);
    $('#rpForm', d).addEventListener('submit', async e => {
      e.preventDefault();
      try { await Api.resetPassword(uid, new FormData(e.target).get('pw')); Dlg.close(2); snack('Contraseña cambiada', 'check_circle'); this.loadUsers(); }
      catch (er) { snack(er.message, 'error'); }
    });
  },

  async deleteUser(uid, name) {
    if (!await Dlg.confirm(`¿Eliminar la cuenta <b>${esc(name)}</b>? Ya no podrá acceder al panel.`)) return;
    try { await Api.deleteUser(uid); snack('Cuenta eliminada', 'check_circle'); this.loadUsers(); }
    catch (e) { snack(e.message, 'error'); }
  },

  /* ------------------------- Ajustes ------------------------- */
  viewSettings() {
    const s = L.d.settings;
    return `<form id="settingsForm" class="card-pad" style="display:grid;gap:16px">
      <div class="form-grid">
        <label class="field"><span>Nombre de la liga</span><input name="leagueName" value="${esc(s.leagueName)}"></label>
        <label class="field"><span>Temporada</span><input name="season" value="${esc(s.season)}"></label>
        <label class="field full"><span>Descripción de la web (portada)</span><textarea name="description" placeholder="Escribe aquí la presentación de la liga…">${esc(s.description)}</textarea></label>
        <label class="field"><span>Email de contacto</span><input name="email" type="email" value="${esc(s.email)}"></label>
        <label class="field"><span>Teléfono / WhatsApp</span><input name="phone" value="${esc(s.phone)}"></label>
        <label class="field full"><span>Ubicación / pabellón</span><input name="location" value="${esc(s.location)}"></label>
      </div>
      <div>
        <h3 style="font-size:20px;text-transform:uppercase;margin-bottom:10px">Redes sociales</h3>
        <div id="socList" style="display:grid;gap:8px">${s.socials.map(x => this.socialRow(x)).join('')}</div>
        <button type="button" class="btn btn-text btn-sm" data-act="soc-add" style="margin-top:8px"><span class="ms">add</span>Añadir red social</button>
      </div>
      <div style="display:flex;justify-content:flex-end"><button class="btn btn-filled" type="submit"><span class="ms">save</span>Guardar ajustes</button></div>
    </form>
    <div class="card-pad" style="border-top:1px solid var(--outline)">
      <h3 style="font-size:20px;text-transform:uppercase;margin-bottom:6px">Copia de seguridad</h3>
      <p class="muted" style="margin:0 0 12px;font-size:13.5px">Descarga todos los datos (equipos, jugadores, partidos y ajustes) o restaura una copia anterior.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-tonal" data-act="backup"><span class="ms">download</span>Descargar copia</button>
        <label class="btn btn-outline" style="cursor:pointer"><span class="ms">upload</span>Restaurar copia<input type="file" id="importFile" accept="application/json,.json" hidden></label>
      </div>
    </div>`;
  },

  socialRow(x = { label: '', url: '' }) {
    return `<div class="soc-row" style="display:grid;grid-template-columns:1fr 2fr auto;gap:8px">
      <input class="input" data-s="label" placeholder="@usuario" value="${esc(x.label)}">
      <input class="input" data-s="url" placeholder="https://www.instagram.com/…" value="${esc(x.url)}">
      <button type="button" class="icon-btn" data-act="soc-del" style="color:var(--loss)" title="Quitar"><span class="ms">close</span></button></div>`;
  },

  addSocialRow() { $('#socList').insertAdjacentHTML('beforeend', this.socialRow()); },

  async saveSettings(form) {
    const f = new FormData(form);
    const socials = $$('.soc-row', form).map(r => ({ label: $('[data-s=label]', r).value.trim(), url: $('[data-s=url]', r).value.trim() }))
      .filter(x => x.url).map(x => ({ ...x, url: /^https?:\/\//i.test(x.url) ? x.url : 'https://' + x.url, label: x.label || x.url }));
    await App.commit(d => {
      Object.assign(d.settings, {
        leagueName: f.get('leagueName').trim() || DEFAULT_LEAGUE, season: f.get('season').trim(), description: f.get('description').trim(),
        email: f.get('email').trim(), phone: f.get('phone').trim(), location: f.get('location').trim(), socials
      });
    }, 'Ajustes guardados');
  },

  backup() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data: L.d, shields: L.shields }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `liga-opinion-copia-${D.today()}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },

  async importBackup(input) {
    const f = input.files[0];
    input.value = '';
    if (!f) return;
    let parsed;
    try { parsed = JSON.parse(await f.text()); } catch { return snack('El archivo no es una copia válida.', 'error'); }
    const data = parsed.data || parsed;
    if (!Array.isArray(data.teams) || !Array.isArray(data.matches)) return snack('El archivo no es una copia válida.', 'error');
    if (!await Dlg.confirm('¿Restaurar esta copia? <b>Sustituirá todos los datos actuales</b> de la web.', 'Restaurar')) return;
    if (await App.commit(d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, L.normalize(data)); }, 'Copia restaurada')) {
      for (const [id, url] of Object.entries(parsed.shields || {})) await Api.saveShield(id, url).catch(() => {});
    }
  },

  /* ------------------------- Mi cuenta ------------------------- */
  viewAccount() {
    return `<form id="pwForm" class="card-pad" style="display:grid;gap:14px;max-width:460px">
      <h3 style="font-size:20px;text-transform:uppercase">Cambiar contraseña</h3>
      <label class="field"><span>Contraseña actual</span><input name="cur" type="password" required autocomplete="current-password"></label>
      <label class="field"><span>Nueva contraseña (mín. 6 caracteres)</span><input name="next" type="password" minlength="6" required autocomplete="new-password"></label>
      <label class="field"><span>Repite la nueva contraseña</span><input name="rep" type="password" minlength="6" required autocomplete="new-password"></label>
      <button class="btn btn-filled" type="submit" style="justify-self:start"><span class="ms">key</span>Cambiar contraseña</button>
    </form>`;
  },

  async changePw(form) {
    const f = new FormData(form);
    if (f.get('next') !== f.get('rep')) return snack('Las contraseñas nuevas no coinciden.', 'error');
    try {
      await Api.changePassword(f.get('cur'), f.get('next'));
      form.reset();
      snack('Contraseña cambiada correctamente', 'check_circle');
      App.render();
    } catch (e) { snack(e.message, 'error'); }
  }
};

const _eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
const money = n => _eur.format(n || 0);

// Reduce el escudo subido para que la web cargue rápido.
function resizeImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let out = c.toDataURL('image/webp', 0.9);
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/png');
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}