# 🍰 Kawaii Messy Bakery Organizer

A cute, cozy WebXR browser game built with A-Frame. Clean up a messy kawaii bakery by putting croissants, pastries, bread, cupcakes, cookies, donuts, macarons, muffins, brownies, dirty dishes, forks and spoons back where they belong!

Runs in your desktop browser and on Meta Quest via the Quest Browser.

## 🎮 How to Play

**Desktop**
- **Look** — move your mouse (click the screen first to lock the pointer).
- **Move** — WASD.
- **Pick up / place** — click, or press **E**.

**VR (Quest)**
- **Move** — left thumbstick. **Turn** — right thumbstick (45° snap).
- **Grab** — reach near an item and press **ANY** controller button.
- **Place** — carry it to a glowing shelf and release the button over it.
- Release anywhere else and the item gently drops onto the nearest surface.

**Win condition:** place **50% of the items** on their matching shelves. As soon as you hit 50%, the victory screen and confetti/sparkles fire. You don't have to tidy everything.

Two instruction billboards appear when you start: the first for the initial 15 seconds, the second (with the 50% goal) for the next 15 seconds on the right-hand wall, so you look around the room. Both hide after 30 seconds.

## 📁 Project Structure

```
kawaii-bakery/
├── index.html          # A-Frame scene (room, shelves, zones, billboards, UI)
├── js/
│   ├── components.js   # pickupable, drop-zone, desktop-interactor,
│   │                   # billboard-sequence (NEW), tile-texture (NEW)
│   ├── vr.js           # WebXR grabbing (purple-grab), locomotion, snap turn
│   ├── audio.js        # procedural music + spatial sink/oven/doorway audio
│   ├── items.js        # item definitions, spawn layout, extra drop zones
│   └── game.js         # holding, placement, HUD, 50% win condition
└── README.md
```

Load order in `index.html` matters: `components.js` → `vr.js` → `audio.js` (in `<head>`), then `items.js` → `game.js` at the end of `<body>`.

## 🔊 Audio

All audio is **synthesized at runtime with the Web Audio API** — there are no sound files to host and no broken asset paths or CORS issues on Quest.

- **Background music** — soft looping sine-pad chord progression (F–C–Dm–B♭), mixed low so it never buries the interaction sounds.
- **Sink** — spatial running-water sound anchored at the sink; louder as you walk toward it.
- **Oven** — quiet spatial hum with a tight falloff, so you only notice it right next to the oven.
- **Doorway** — spatial mall/food-court crowd murmur at the entrance frame.
- **Correct placement** — a short sparkly confirmation chime, fired only on a correct placement (a wrong shelf plays a soft error blip instead).

Browsers block audio until the user interacts, so the audio context starts on the first click, key press, touch, or **Enter VR** press.

## 🖥️ Run Locally (VS Code + Live Server)

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
code .
```

1. Install the **Live Server** extension (Ritwick Dey) from the Extensions panel.
2. Right-click `index.html` → **Open with Live Server**.
3. Click the scene to lock the mouse, then explore with WASD.

⚠️ A-Frame must be served over `http://` — opening the file directly with `file://` won't work.

## 🥽 WebXR / Meta Quest

Deploy to GitHub Pages, Netlify, or Vercel, open the URL in the Quest Browser, and press **Enter VR** in the bottom-right of the scene.

Shelf heights are tuned for VR: all shelves and their drop zones sit between roughly 0.9 m and 2.1 m, so nothing requires jumping or stretching. Forks and spoons sit on the low right-wall shelf and lie flat, parallel to the floor.

## 🛠️ Customizing

- **Item counts** — `itemDefinitions` in `js/items.js`. The 50% win target is derived from the live item count, so adding or removing items automatically adjusts the goal.
- **Win percentage** — `this.WIN_FRACTION` in `js/game.js` (`0.5` = 50%).
- **Billboard timing** — the `billboard-sequence` attribute on `<a-scene>` in `index.html` (`firstDur` / `secondDur`, in milliseconds).
- **Tile look** — the `tile-texture` attribute (`repeat`, `color`, `alt`, `grout`) on the floor, skirting, and sink splashback.
- **Grab reach** — `VR_GRAB_RADIUS` in `js/vr.js` and the invisible collision box on each item in `js/items.js`. Leave these alone unless grabbing feels wrong; they're what makes grabbing forgiving.

Enjoy organizing your kawaii bakery! 🌸🥐🍰
