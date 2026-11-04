# Shadow Blossom — Duel of Fates

A hand-drawn 2D fighting game built with Canvas 2D, WebAudio, and no external assets or dependencies. Pick Kaito, the crimson dragon, or Akane, the winter blade, and duel on a sunset temple veranda.

## Play

Serve the folder with any static file server, then open the printed URL:

```bash
python3 -m http.server 8000
```

No build step, package install, or network access is required.

## Features

- Two fighters with distinct palettes, three signature specials each, and a full-spirit super art.
- Best-of-three rounds, 60-second timer, KO and time-over victories.
- Blocking, low sweeps, jump kicks, knockdowns, combos, hitstop, screen shake, and dynamic camera work.
- Arcade mode against AI or local two-player duels on one keyboard.
- Responsive touch controls with safe-area support for phones and tablets.
- Procedural stage art, parallax sunset, sakura petals, lanterns, and synthesized taiko/shamisen audio.

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move / block | `A` / `D` | `←` / `→` |
| Jump | `W` | `↑` |
| Crouch / low guard | `S` | `↓` |
| Punch | `J` | `Numpad 1` or `,` |
| Kick | `K` | `Numpad 2` or `.` |
| Special I (projectile) | `U` | `Numpad 4` or `;` |
| Special II (rising) | `I` | `Numpad 5` or `'` |
| Special III (spin) | `O` | `Numpad 6` or `/` |
| Super (at full spirit) | `Space` | `Numpad 0` or `\` |
| Pause / resume | `Esc` or `P` | — |

Specials also accept classic motion inputs: `↓↘→ + Punch`, `→↓↘ + Punch`, and `↓↙← + Kick`.

On touch devices, the D-pad, three special buttons, punch, kick, super, and pause controls appear around the fight. Hold back on the D-pad to guard.

## Notes

- The CPU rival is chosen as the other fighter after the player picks.
- Local two-player mode uses one keyboard; the alternate laptop keys are listed above.
- Audio starts after the first key press or touch, as required by browser autoplay policies.
- Mute is available from the in-game speaker button and persisted in `localStorage`.

---

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/MR360-pro/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/MR360-pro/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/MR360-pro/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/MR360-pro/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/MR360-pro/PlayGround).
- 🛠️ [Check build runs](https://github.com/MR360-pro/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/MR360-pro/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/MR360-pro).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
