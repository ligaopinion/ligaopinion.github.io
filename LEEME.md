# Liga Opinión Futsal Sevilla · Web

La web es estática y se aloja gratis en **GitHub Pages**. Los datos (resultados, equipos, jugadores y cuentas) se guardan en **Firebase**, que también es gratuito. Así, lo que guarda un gestor lo ven todos los visitantes al momento, sin recargar la página.

Mientras Firebase no esté configurado, la web funciona en **modo local de prueba**: los cambios se guardan solo en el navegador de quien los hace.

---

## 1. Crear el proyecto de Firebase (una sola vez, unos 10 minutos)

1. Entra en <https://console.firebase.google.com> con una cuenta de Google y pulsa **Crear un proyecto** (por ejemplo `liga-opinion`). Google Analytics no hace falta.
2. **Authentication**: ve a *Compilación › Authentication › Comenzar* y, en *Método de acceso*, activa **Correo electrónico/contraseña**.
3. **Firestore**: ve a *Compilación › Firestore Database › Crear base de datos*, elige la ubicación `eur3 (europe-west)` y el **modo de producción**.
4. **Reglas**: en Firestore, abre la pestaña **Reglas**, borra lo que haya, pega el contenido del archivo `firestore.rules` y pulsa **Publicar**.
5. **Registrar la web**: en *Configuración del proyecto* (el engranaje) › *Tus apps*, pulsa el icono **`</>`** (Web), ponle un nombre y regístrala. Copia los valores de `firebaseConfig` en el archivo **`firebase-config.js`**:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "liga-opinion.firebaseapp.com",
  projectId: "liga-opinion",
  storageBucket: "liga-opinion.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
```

> Estas claves pueden ser públicas: lo que protege los datos son las reglas del paso 4.

## 2. Publicar en GitHub Pages

1. Crea un repositorio en GitHub (por ejemplo `liga-opinion`).
2. Sube **todo el contenido de esta carpeta `web`** a la raíz del repositorio (con *Add file › Upload files* o con git).
3. En el repositorio, ve a *Settings › Pages*: en *Source* elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`. Guarda.
4. En uno o dos minutos la web estará en `https://TU-USUARIO.github.io/liga-opinion/`.
5. **Importante**: en Firebase, ve a *Authentication › Configuración › Dominios autorizados* y añade `TU-USUARIO.github.io`.

## 3. Primer acceso

1. Abre la web y ve a **Admin**.
2. Entra con usuario **`admin`** y contraseña **`admin`**. La cuenta se crea sola en este primer acceso.
3. **Cambia la contraseña enseguida** en *Admin › Mi cuenta*. La web te lo recordará mientras no lo hagas.
4. En *Admin › Ajustes* escribe la descripción de la portada, el email, el teléfono y la ubicación.
5. En *Admin › Equipos y jugadores* sube los escudos y da de alta a los jugadores. También puedes añadirlos sobre la marcha al anotar un partido.

## Roles

| Rol | Qué puede hacer |
|---|---|
| **Administrador** | Todo: resultados, partidos, equipos, jugadores, usuarios, ajustes y copias de seguridad. |
| **Normal (gestor)** | Anotar resultados de liga y copa, editar partidos, equipos y jugadores, consultar las sanciones y cambiar su propia contraseña. |

## Uso diario

* **Anotar un resultado**: *Admin › Partidos y resultados*, elige la división y la jornada, pulsa el partido y usa **+ / −** para los goles, las amarillas y las rojas de cada jugador. El marcador se calcula solo. Al pulsar **Guardar**, la clasificación, los rankings y la portada se actualizan al instante para todos.
* **Partido aplazado**: cambia el estado a *Aplazado* y, cuando se juegue, actualiza la fecha.
* **Instantáneas**: debajo de cada jornada, clasificación, ranking y resumen hay un botón **Capturar instantánea**, que genera una imagen con el logo para Instagram o WhatsApp. Se puede descargar, copiar o, en el móvil, compartir directamente.
* **Nueva temporada** (*Admin › Temporadas › Iniciar nueva temporada*, solo administradores):
  1. Escribe el nombre (por ejemplo, *Temporada 2027-28*).
  2. Indica para cada equipo si juega en 1ª o en 2ª (ascensos y descensos) o si se retira, y añade los equipos nuevos.
  3. Decide si se conservan las plantillas de jugadores.
  4. La temporada actual se **archiva completa**, con sus resultados, goleadores, clasificaciones y escudos, y la nueva empieza sin partidos.
  5. Después, en *Partidos y resultados*, usa **Generar calendario** en cada división (ida y vuelta, con fecha de inicio y festivos) y ajusta el día y la hora de cada partido. El botón solo aparece mientras la división de la temporada nueva no tiene partidos; una vez generado el calendario, desaparece. Si tenéis el calendario oficial en PDF, también se puede cargar tal cual.
  * Las temporadas anteriores se consultan desde el **selector de temporada** en 1ª, 2ª y Estadísticas.
* **Copa Opinión Success** (*Admin › Copa*):
  1. Un administrador pulsa **Crear copa de esta temporada**. Se crean las rondas vacías con los equipos de la temporada en curso.
  2. Pulsa cada partido para elegir los dos equipos, la fecha y la hora. Después, el resultado se anota igual que en liga; si hay empate, se indican los penaltis.
  3. En cada ronda, ★ señala a los equipos clasificados en la anterior.
  4. Las rondas se pueden renombrar, añadir o quitar.
  5. El cuadro y los rankings de copa se ven en la sección **Copa** del menú.
* **Sanciones económicas** (*Admin › Sanciones*, solo visible en administración):
  * Cuenta las amarillas y las expulsiones de los partidos finalizados y calcula el importe de cada equipo. Los importes los cambia un administrador; por defecto son 2 € por amarilla y 3 € por expulsión.
  * Cada equipo muestra por separado las tarjetas de **liga** y de **copa**, y el total acumulado de la temporada.
  * Al iniciar una temporada nueva, el recuento empieza de cero. Las temporadas anteriores se consultan con el selector de temporada de la propia pestaña.
  * Se puede filtrar por división, ver el detalle por partido, capturar la tabla y descargarla en Excel.
* **Copia de seguridad**: en *Admin › Ajustes* puedes descargar todos los datos y restaurarlos.
* **Versiones**: las novedades de cada versión están en `CAMBIOS.md` y dentro de la web, al pulsar la versión en el pie de página.

## Archivos

Todos los archivos están en una sola carpeta, sin subcarpetas, para poder subirlos a GitHub de una vez.

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Página principal |
| `firebase-config.js` | Configuración de Firebase (rellenar) |
| `firestore.rules` | Reglas de seguridad (pegar en Firebase) |
| `seed.js` | Calendario inicial 2026-27, cargado desde el PDF oficial |
| `api.js`, `league.js`, `app.js`, `admin.js` | Lógica de la web y del panel |
| `styles.css` | Diseño |
| `logo.png`, `logo-192.png`, `logo-512.png`, `logo-data.js`, `favicon.ico` | Logo e icono |

## Límites del plan gratuito de Firebase

El plan gratuito permite unas 50.000 lecturas al día, y cada visita usa 2. Es decir, más de 20.000 visitas diarias, de sobra para la liga.
