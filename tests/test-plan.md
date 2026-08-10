# HUB-UNO — Plan de pruebas

## Método

- **Unitarias (automatizadas):** `node tests/unit/run-tests.mjs` — cubre mazo, reglas, turnos, vista pública de bots y reposición.
- **Manuales:** checklist por dispositivo/navegador. Usar semilla fija en `createGame(..., { seed })` para reproducir.

## 21.1 Reglas

| Caso | Resultado esperado | Estado |
|---|---|---|
| Validez por color | Carta del color activo jugable | Unit + manual |
| Validez por número | 7 sobre 7 de otro color | Unit |
| Validez por símbolo | Bloqueo sobre Bloqueo | Unit |
| Comodines | Comodín/Super Robo jugables (salvo penalización) | Unit |
| Giro | Invierte sentido; en 2p actúa como Bloqueo | Unit |
| Bloqueo | Siguiente pierde turno | Manual / turns unit |
| Robo / Super Robo | Objetivo roba N y pierde turno | Manual |
| Apilado +2/+2 y +4/+4 | Acumula; no mezcla | Unit |
| Cambio de color | `activeColor` = elegido | Manual |
| Reposición del mazo | Rebaraja descarte dejando superior | Unit |
| Victoria / derrota | `status=finished`, modal correcto | Manual |

## 21.2 Jugadores

- [ ] Partidas de 2, 3, 4 y 10 jugadores completan sin errores
- [ ] Dificultades Fácil / Normal / Difícil producen jugadas válidas
- [ ] Turnos correctos con Giro + Bloqueo + robos encadenados
- [ ] Bots solo reciben vista pública (`buildPublicView`) — verificado en unitarias

## 21.3 Interfaz

- [ ] Escritorio, tablet, móvil; vertical y horizontal
- [ ] Objetivos táctiles ≥ 44 px; cartas jugables resaltadas
- [ ] Teclado: Tab, Enter/Espacio, Esc (excepto modal de color)
- [ ] Contadores, color activo, dirección y penalización se actualizan
- [ ] Fallback visual si falta una imagen de carta

## 21.4 Errores y casos límite

- [ ] Mazo vacío durante penalización grande
- [ ] Mano sin jugadas válidas → robo
- [ ] `localStorage` corrupto → defaults
- [ ] Recarga (F5) → vuelve a inicio sin romper
- [ ] Doble clic en carta → una sola jugada (`inputLocked`)
- [ ] Clic en turno de bot → ignorado
- [ ] Fallo de audio / animación → el juego continúa

## Cómo ejecutar unitarias

```bash
# Desde la raíz del repo
node tests/unit/run-tests.mjs
```

## Cómo probar en local (UI)

```bash
python3 -m http.server 8000
# Abrir http://localhost:8000
```

No abrir `index.html` vía `file://` (los ES Modules fallan por CORS).
