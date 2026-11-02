/* =====================================================================
 * Capa de datos.
 *  - Modo "firebase": datos compartidos en Firestore + cuentas en Firebase Auth.
 *  - Modo "local": sin configuración; todo se guarda en este navegador (pruebas).
 * Ambos modos exponen exactamente la misma interfaz.
 * ===================================================================== */
const Api = (() => {
  const FB_VER = '10.12.2';
  const EMAIL_DOMAIN = 'usuarios.liga-opinion.app';
  // Firebase exige contraseñas de 6+ caracteres: se transforma de forma fija para permitir admin/admin.
  const xf = p => `LO#${p}#futsal`;
  const err = (message, status = 400) => Object.assign(new Error(message), { status });
  const normName = u => String(u || '').trim().toLowerCase();
  const rand = () => Math.random().toString(36).slice(2, 8);
  const ROLES = ['admin', 'gestor'];

  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
  };

  let mode = 'local';
  let impl = null;
  const dataCbs = [];
  const authCbs = [];
  const current = { data: null, version: 0, shields: {} };
  let user = null;

  const emitData = () => dataCbs.forEach(cb => cb(current));
  const emitAuth = () => authCbs.forEach(cb => cb(user));

  function checkNewUser(name, password, role) {
    if (!/^[a-z0-9._-]{3,32}$/.test(name)) throw err('Nombre de usuario no válido (3-32 caracteres: letras, números, punto, guion).');
    if (String(password).length < 6) throw err('La contraseña debe tener al menos 6 caracteres.');
    if (!ROLES.includes(role)) throw err('Rol no válido.');
  }
  function requireRole(roles) {
    if (!user) throw err('Sesión no iniciada.', 401);
    if (roles && !roles.includes(user.role)) throw err('No tienes permiso para esta acción.', 403);
  }

  // Se carga como <script> (seed.js) para que funcione también abriendo el archivo con doble clic.
  async function loadSeed() {
    if (!window.LIGA_SEED) throw err('No se pudo cargar el calendario inicial (seed.js).');
    return JSON.parse(JSON.stringify(window.LIGA_SEED));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(err('No se pudo cargar ' + src));
      document.head.append(s);
    });
  }

  /* ------------------------------ FIREBASE ------------------------------ */
  function firebaseImpl(cfg) {
    let auth, db, FV;
    const doc = p => db.doc(p);

    async function loadProfile() {
      const u = auth.currentUser;
      if (!u) { user = null; emitAuth(); return null; }
      const p = await doc('users/' + u.uid).get();
      if (!p.exists) { await auth.signOut(); throw err('Esta cuenta ya no tiene acceso.', 403); }
      user = { uid: u.uid, ...p.data() };
      emitAuth();
      return user;
    }

    // Crea una cuenta de Auth sin cerrar la sesión del administrador (app secundaria).
    async function newAuthAccount(name, password) {
      const email = `${name}.${rand()}@${EMAIL_DOMAIN}`;
      const sec = firebase.initializeApp(cfg, 'sec-' + Date.now());
      try {
        const c = await sec.auth().createUserWithEmailAndPassword(email, xf(password));
        await sec.auth().signOut();
        return { uid: c.user.uid, email };
      } finally {
        await sec.delete();
      }
    }

    async function adminCount() {
      const s = await db.collection('users').where('role', '==', 'admin').get();
      return s.size;
    }

    return {
      async init() {
        const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
        await loadScript(base + 'firebase-app-compat.js');
        await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
        firebase.initializeApp(cfg);
        auth = firebase.auth();
        db = firebase.firestore();
        FV = firebase.firestore.FieldValue;
        const seed = await loadSeed();

        await new Promise(resolve => {
          let gotMain = false, gotShields = false, ready = false;
          const tick = () => {
            if (ready) emitData();
            else if (gotMain && gotShields) { ready = true; resolve(); }
          };
          doc('league/main').onSnapshot(snap => {
            if (snap.exists) {
              const d = snap.data();
              current.data = JSON.parse(d.json);
              current.version = d.version;
            } else {
              current.data = seed;
              current.version = 0;
            }
            gotMain = true; tick();
          }, e => {
            console.error(e);
            if (!current.data) { current.data = seed; current.version = 0; }
            gotMain = true; tick();
          });
          doc('league/shields').onSnapshot(snap => {
            current.shields = snap.exists ? snap.data() : {};
            gotShields = true; tick();
          }, e => { console.error(e); gotShields = true; tick(); });
        });

        auth.onAuthStateChanged(async u => {
          if (!u) { user = null; emitAuth(); return; }
          try {
            const p = await doc('users/' + u.uid).get();
            if (p.exists) { user = { uid: u.uid, ...p.data() }; emitAuth(); }
          } catch (e) { console.error(e); }
        });
      },

      async login(username, password) {
        const name = normName(username);
        const m = await doc('usernames/' + name).get();
        if (!m.exists) {
          // Primer uso: crea la cuenta por defecto admin/admin.
          if (name === 'admin' && password === 'admin' && !(await doc('meta/init').get()).exists) {
            const email = `admin.${rand()}@${EMAIL_DOMAIN}`;
            const c = await auth.createUserWithEmailAndPassword(email, xf('admin'));
            const b = db.batch();
            b.set(doc('meta/init'), { at: FV.serverTimestamp() });
            b.set(doc('users/' + c.user.uid), { username: 'admin', role: 'admin', email, mustChange: true });
            b.set(doc('usernames/admin'), { email, uid: c.user.uid });
            await b.commit();
            return loadProfile();
          }
          throw err('Usuario o contraseña incorrectos.', 401);
        }
        try {
          await auth.signInWithEmailAndPassword(m.data().email, xf(password));
        } catch (e) {
          if (e && e.code === 'auth/too-many-requests') throw err('Demasiados intentos. Espera unos minutos.', 429);
          throw err('Usuario o contraseña incorrectos.', 401);
        }
        return loadProfile();
      },

      logout: () => auth.signOut(),

      async save(data, version) {
        requireRole(ROLES);
        const ref = doc('league/main');
        return db.runTransaction(async tx => {
          const s = await tx.get(ref);
          const v = s.exists ? s.data().version : 0;
          if (v !== version) throw err('Los datos han cambiado en otro dispositivo.', 409);
          tx.set(ref, { json: JSON.stringify(data), version: v + 1, updatedAt: FV.serverTimestamp(), updatedBy: user.username });
          return v + 1;
        });
      },

      async saveShield(teamId, dataUrl) {
        requireRole(ROLES);
        await doc('league/shields').set({ [teamId]: dataUrl || FV.delete() }, { merge: true });
      },

      // Temporadas archivadas: una copia completa e inalterable por temporada.
      async archiveSeason(id, { name, data, shields }) {
        requireRole(['admin']);
        await doc('seasons/' + id).set({ name, json: JSON.stringify(data), shields: JSON.stringify(shields || {}), archivedAt: FV.serverTimestamp(), by: user.username });
      },
      async getSeason(id) {
        const s = await doc('seasons/' + id).get();
        if (!s.exists) throw err('Temporada no encontrada.', 404);
        const d = s.data();
        return { data: JSON.parse(d.json), shields: JSON.parse(d.shields || '{}') };
      },
      async deleteSeason(id) {
        requireRole(['admin']);
        await doc('seasons/' + id).delete();
      },

      async listUsers() {
        requireRole(['admin']);
        const s = await db.collection('users').get();
        return s.docs.map(d => ({ uid: d.id, ...d.data() }));
      },

      async createUser({ username, password, role }) {
        requireRole(['admin']);
        const name = normName(username);
        checkNewUser(name, password, role);
        if ((await doc('usernames/' + name).get()).exists) throw err('Ese usuario ya existe.');
        const acc = await newAuthAccount(name, password);
        const b = db.batch();
        b.set(doc('users/' + acc.uid), { username: name, role, email: acc.email, mustChange: false });
        b.set(doc('usernames/' + name), { email: acc.email, uid: acc.uid });
        await b.commit();
      },

      async setRole(uid, role) {
        requireRole(['admin']);
        if (!ROLES.includes(role)) throw err('Rol no válido.');
        const p = await doc('users/' + uid).get();
        if (!p.exists) throw err('Usuario no encontrado.');
        if (p.data().role === 'admin' && role !== 'admin' && (await adminCount()) <= 1) throw err('Debe quedar al menos un administrador.');
        await doc('users/' + uid).update({ role });
      },

      async resetPassword(uid, password) {
        requireRole(['admin']);
        if (uid === user.uid) throw err('Para tu propia cuenta usa "Mi cuenta".');
        if (String(password).length < 6) throw err('La contraseña debe tener al menos 6 caracteres.');
        const p = await doc('users/' + uid).get();
        if (!p.exists) throw err('Usuario no encontrado.');
        const old = p.data();
        // Firebase no permite cambiar la contraseña de otro usuario desde el navegador:
        // se crea una cuenta nueva con el mismo nombre de usuario y se retira la antigua.
        const acc = await newAuthAccount(old.username, password);
        const b = db.batch();
        b.delete(doc('users/' + uid));
        b.set(doc('users/' + acc.uid), { ...old, email: acc.email, mustChange: false });
        b.set(doc('usernames/' + old.username), { email: acc.email, uid: acc.uid });
        await b.commit();
      },

      async deleteUser(uid) {
        requireRole(['admin']);
        if (uid === user.uid) throw err('No puedes eliminar tu propia cuenta.');
        const p = await doc('users/' + uid).get();
        if (!p.exists) return;
        const u = p.data();
        if (u.role === 'admin' && (await adminCount()) <= 1) throw err('Debe quedar al menos un administrador.');
        const b = db.batch();
        b.delete(doc('users/' + uid));
        b.delete(doc('usernames/' + u.username));
        await b.commit();
      },

      async changePassword(currentPw, nextPw) {
        requireRole();
        if (String(nextPw).length < 6) throw err('La nueva contraseña debe tener al menos 6 caracteres.');
        const u = auth.currentUser;
        try {
          await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, xf(currentPw)));
        } catch {
          throw err('La contraseña actual no es correcta.');
        }
        await u.updatePassword(xf(nextPw));
        await doc('users/' + u.uid).update({ mustChange: false });
        user = { ...user, mustChange: false };
        emitAuth();
      }
    };
  }

  /* ---------------------------- MODO LOCAL ----------------------------- */
  function localImpl() {
    const K = { liga: 'lo_local_liga', shields: 'lo_local_shields', users: 'lo_local_users', session: 'lo_local_session' };

    async function hash(s) {
      const txt = 'lo-salt:' + s;
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let h = 0;
      for (const ch of txt) h = (h * 31 + ch.charCodeAt(0)) | 0;
      return 'w' + h;
    }
    const users = () => ls.get(K.users) || [];
    const setUsers = u => ls.set(K.users, u);
    function readData() {
      const l = ls.get(K.liga);
      current.data = l.data;
      current.version = l.version;
      current.shields = ls.get(K.shields) || {};
    }
    function readSession() {
      const uid = ls.get(K.session);
      const u = users().find(x => x.uid === uid);
      user = u ? { uid: u.uid, username: u.username, role: u.role, mustChange: !!u.mustChange } : null;
    }

    return {
      async init() {
        if (!ls.get(K.liga)) ls.set(K.liga, { version: 0, data: await loadSeed() });
        if (!users().length) setUsers([{ uid: 'u-admin', username: 'admin', role: 'admin', mustChange: true, hash: await hash('admin') }]);
        readData();
        readSession();
        // Sincroniza otras pestañas del mismo navegador.
        window.addEventListener('storage', e => {
          if (e.key === K.liga || e.key === K.shields) { readData(); emitData(); }
          if (e.key === K.session || e.key === K.users) { readSession(); emitAuth(); }
        });
        setTimeout(emitAuth);
      },
      async login(username, password) {
        const name = normName(username);
        const u = users().find(x => x.username === name);
        if (!u || u.hash !== await hash(password)) throw err('Usuario o contraseña incorrectos.', 401);
        ls.set(K.session, u.uid);
        readSession(); emitAuth();
        return user;
      },
      async logout() { ls.del(K.session); user = null; emitAuth(); },
      async save(data, version) {
        requireRole(ROLES);
        const l = ls.get(K.liga);
        if (l.version !== version) throw err('Los datos han cambiado en otra pestaña.', 409);
        ls.set(K.liga, { version: version + 1, data });
        readData();
        return version + 1;
      },
      async saveShield(teamId, dataUrl) {
        requireRole(ROLES);
        const s = ls.get(K.shields) || {};
        if (dataUrl) s[teamId] = dataUrl; else delete s[teamId];
        ls.set(K.shields, s);
        current.shields = s;
        emitData();
      },
      async archiveSeason(id, { name, data, shields }) {
        requireRole(['admin']);
        ls.set('lo_local_season_' + id, { name, data, shields: shields || {} });
        if (!ls.get('lo_local_season_' + id)) throw err('No hay espacio en el navegador para archivar la temporada.');
      },
      async getSeason(id) {
        const s = ls.get('lo_local_season_' + id);
        if (!s) throw err('Temporada no encontrada.', 404);
        return { data: s.data, shields: s.shields };
      },
      async deleteSeason(id) {
        requireRole(['admin']);
        ls.del('lo_local_season_' + id);
      },
      async listUsers() {
        requireRole(['admin']);
        return users().map(({ hash: _h, ...u }) => u);
      },
      async createUser({ username, password, role }) {
        requireRole(['admin']);
        const name = normName(username);
        checkNewUser(name, password, role);
        const list = users();
        if (list.some(x => x.username === name)) throw err('Ese usuario ya existe.');
        list.push({ uid: 'u-' + rand() + rand(), username: name, role, mustChange: false, hash: await hash(password) });
        setUsers(list);
      },
      async setRole(uid, role) {
        requireRole(['admin']);
        const list = users();
        const u = list.find(x => x.uid === uid);
        if (!u) throw err('Usuario no encontrado.');
        if (u.role === 'admin' && role !== 'admin' && list.filter(x => x.role === 'admin').length <= 1) throw err('Debe quedar al menos un administrador.');
        u.role = role;
        setUsers(list);
        readSession(); emitAuth();
      },
      async resetPassword(uid, password) {
        requireRole(['admin']);
        if (uid === user.uid) throw err('Para tu propia cuenta usa "Mi cuenta".');
        if (String(password).length < 6) throw err('La contraseña debe tener al menos 6 caracteres.');
        const list = users();
        const u = list.find(x => x.uid === uid);
        if (!u) throw err('Usuario no encontrado.');
        u.hash = await hash(password);
        setUsers(list);
      },
      async deleteUser(uid) {
        requireRole(['admin']);
        if (uid === user.uid) throw err('No puedes eliminar tu propia cuenta.');
        const list = users();
        const u = list.find(x => x.uid === uid);
        if (u && u.role === 'admin' && list.filter(x => x.role === 'admin').length <= 1) throw err('Debe quedar al menos un administrador.');
        setUsers(list.filter(x => x.uid !== uid));
      },
      async changePassword(currentPw, nextPw) {
        requireRole();
        if (String(nextPw).length < 6) throw err('La nueva contraseña debe tener al menos 6 caracteres.');
        const list = users();
        const u = list.find(x => x.uid === user.uid);
        if (u.hash !== await hash(currentPw)) throw err('La contraseña actual no es correcta.');
        u.hash = await hash(nextPw);
        u.mustChange = false;
        setUsers(list);
        readSession(); emitAuth();
      }
    };
  }

  return {
    get mode() { return mode; },
    get user() { return user; },
    get state() { return current; },
    async init() {
      const cfg = window.FIREBASE_CONFIG || {};
      if (cfg.apiKey && cfg.projectId) {
        mode = 'firebase';
        impl = firebaseImpl(cfg);
      } else {
        mode = 'local';
        impl = localImpl();
      }
      await impl.init();
    },
    onData(cb) { dataCbs.push(cb); },
    onAuth(cb) { authCbs.push(cb); },
    login: (u, p) => impl.login(u, p),
    logout: () => impl.logout(),
    async save(data, version) {
      const v = await impl.save(data, version);
      current.data = data;
      current.version = v;
      return v;
    },
    saveShield: (id, url) => impl.saveShield(id, url),
    archiveSeason: (id, payload) => impl.archiveSeason(id, payload),
    getSeason: id => impl.getSeason(id),
    deleteSeason: id => impl.deleteSeason(id),
    listUsers: () => impl.listUsers(),
    createUser: u => impl.createUser(u),
    setRole: (uid, r) => impl.setRole(uid, r),
    resetPassword: (uid, p) => impl.resetPassword(uid, p),
    deleteUser: uid => impl.deleteUser(uid),
    changePassword: (c, n) => impl.changePassword(c, n)
  };
})();
