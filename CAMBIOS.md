# Registro de versiones · Liga Opinión Futsal Sevilla

La versión actual se muestra en el pie de página de la web. Al pulsarla, y también desde *Admin › Novedades*, se abre este mismo registro dentro de la aplicación.

---

## Versión 1.1 · 4 de noviembre de 2026

### Copa Opinión Success
- Nueva sección **Copa** en el menú principal.
- **Cuadro de copa** con el formato oficial: Ronda 1 (A-D), Octavos 1 (A-D), Octavos 2 (E-H), Cuartos (C1 = A-B, C2 = C-D, C3 = E-F, C4 = G-H), Semifinal (S1 = C1-C2, S2 = C3-C4) y Final (S1-S2). Muestra escudos, marcador, penaltis y el equipo clasificado resaltado.
- **Clasificados automáticos**: en Cuartos, Semifinal y Final aparece "Ganador A", "Ganador C1"…, que se sustituye solo por el equipo en cuanto se anota el resultado del cruce de origen.
- **Temporada 2026-27**: al crear la copa se carga el cuadro oficial, con los cruces de la Ronda 1 (Bohemia - Nottingham, Parkinaso - Flor de Caña, Tendereke - Pañoleta y Real Élite - Marañas) y las fechas y horas de todas las rondas.
- Al pulsar un partido jugado se abre su **resumen**: goleadores, amonestaciones, expulsiones y penaltis.
- **Rankings de copa**: top 5 máximos goleadores y top 5 equipos menos goleados.
- **Instantáneas** del cuadro completo (la imagen se adapta al ancho de todas las rondas) y de los dos rankings.
- La portada muestra también los partidos de copa del fin de semana, si los hay.

### Administración de la copa (*Admin › Copa*)
- Botón **Crear copa de esta temporada**: crea el cuadro con los equipos de la temporada en curso, con ascensos, descensos y equipos nuevos ya aplicados.
- Los equipos de la Ronda 1 y de los Octavos se eligen **a mano** con un selector agrupado por división. ★ marca a los clasificados de la ronda anterior. Cada cruce tiene su código editable.
- Mismo editor que en liga para goles, amarillas y expulsiones, más **penaltis** obligatorios si hay empate.
- Las rondas se pueden **renombrar, añadir o eliminar**, y a cada ronda se le pueden añadir o quitar partidos.
- Al iniciar una temporada nueva, la copa anterior se **archiva** junto a la liga y se consulta con el selector de temporada.

### Sanciones económicas (*Admin › Sanciones*, solo administración)
- Importe configurable por **tarjeta amarilla** (2 € por defecto) y por **expulsión** (3 € por defecto).
- **Tabla por equipo** que se actualiza con cada partido finalizado, con **columnas separadas de Liga y Copa** (amarillas y expulsiones de cada una), el **total acumulado** de la temporada, el importe y una barra gráfica.
- Filtro por división.
- **Reinicio por temporada**: al iniciar una temporada nueva, el recuento empieza de cero. Con el **selector de temporada** de la pestaña se consultan las anteriores tal como quedaron (tarjetas, importes y detalle), en solo lectura.
- **Detalle por partido** al pulsar un equipo: fecha, competición, rival, jugadores sancionados e importe.
- **Instantánea** de la tabla y **descarga en Excel** (.xlsx) con dos hojas: *Resumen por equipo*, con las columnas de liga, copa y total, y *Detalle por partido*.

### Otros
- Número de versión en el pie de página y registro de novedades dentro de la aplicación.

---

## Versión 1.0 · 2 de noviembre de 2026

- Portada con descripción, partidos de la semana, contacto y redes sociales.
- Primera y Segunda División: calendario por jornadas, resumen de cada partido y clasificación.
- Estadísticas: máximos goleadores y equipos menos goleados por división.
- Instantáneas en imagen para redes sociales.
- Panel de administración: resultados, equipos, jugadores, usuarios con roles, ajustes y copias de seguridad.
- Temporadas: archivo de temporadas, ascensos y descensos, y generador de calendario.
