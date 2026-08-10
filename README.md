# HUB-UNO · GTAHUB

Juego de cartas por turnos (descarte por color y número) con identidad visual de **GTAHUB**. Un jugador humano contra 1–9 bots. Todo ocurre en el navegador: sin backend, sin cuentas y sin multijugador online.

> Proyecto con marca **GTAHUB**. El juego HUB-UNO es original e independiente de otras marcas comerciales de cartas.

## Cómo jugar

1. Abre la app y elige tu nombre, el número de jugadores (2–10) y la dificultad.
2. Pulsa **Jugar**. Se reparte 7 cartas a cada uno.
3. En tu turno, descarta una carta que coincida en **color**, **número** o **símbolo**, o un **Comodín** / **Super Robo**.
4. Si no puedes (o no quieres) jugar, **roba** una carta. Si la robada es jugable, puedes usarla al momento.
5. Cartas especiales: **Giro**, **Bloqueo**, **Robo (+2)**, **Comodín**, **Super Robo (+4)**.
6. El primero en quedarse sin cartas gana.

Más detalle: botón **Cómo se juega** en la app, o `tests/test-plan.md`.

## Requisitos técnicos

- HTML5 + CSS3 + JavaScript (ES Modules)
- **Sin framework, sin bundler, sin build**
- Publicable como sitio estático en **GitHub Pages**

## Probar en local

Los módulos ES no funcionan bien con `file://`. Usa un servidor local:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`.

### Pruebas unitarias (Node)

```bash
node tests/unit/run-tests.mjs
```

## Desplegar en GitHub Pages

1. Sube este repositorio a GitHub (carpeta raíz con `index.html`).
2. Asegúrate de que exista el archivo `.nojekyll` (ya incluido).
3. En el repo: **Settings → Pages → Source → Deploy from a branch**.
4. Rama **`main`**, carpeta **`/ (root)`**. Guardar.
5. La URL será `https://TU-USUARIO.github.io/hub-uno/` (o el nombre de tu repo).

**Importante:** todas las rutas del proyecto son **relativas** (`./css/...`, `./js/...`, `./assets/...`) para funcionar en subrutas.

## Imágenes de cartas

Las caras viven en `assets/cards/` (PNG del arte final).

- Convención: `red-0.png`, `red-reverse.png`, `wild.png`, `wild-draw4.png`, `back.png`, etc.
- Si cambia la extensión, edita `CARD_IMAGE_EXT` en `js/constants.js`.
- Si falta un archivo, la UI muestra un **fallback** CSS y el juego sigue.

## Estructura

```text
index.html
css/          styles, cards, responsive
js/           motor, bots, UI
assets/cards/ imágenes de cartas + reverso
assets/icons/ logo y favicon
assets/sounds/ (opcional; la app funciona sin ellos)
tests/        plan de pruebas + unitarias
```

## Licencia

Ver `LICENSE`.
