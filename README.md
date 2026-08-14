# Recuperator Card

A modern, custom Lovelace card for Home Assistant to control and monitor a
home heat‑recovery ventilation unit (HRV / recuperator): operating modes,
fan speed, heat‑recovery efficiency and temperatures — plus a companion
settings page for language and theme.

> **Note on distribution:** HACS installs custom cards from **GitHub**
> repositories, not from Reddit — Reddit has no concept of a "repo" HACS can
> pull files from. Push this folder to a public GitHub repository (see
> below) and add *that* repository to HACS. You're welcome to also post a
> link to your GitHub repo on Reddit to share it with the community — that
> works fine, it just isn't how HACS itself installs it.

## ✨ Features

- **5 operating modes** — Off, Building protection, Economy, Comfort, Boost —
  shown as a single connected track (because they represent increasing
  airflow intensity, not an arbitrary list).
- **Dual‑arc instrument dial** — outer ring = fan speed %, inner ring = heat
  recovery %, both live and animated.
- **Three temperature readouts** — Outdoor, Supply, Indoor (exhaust
  temperature intentionally omitted).
- **Configurable settings button** — separate tap and hold (long‑press)
  actions, e.g. navigate to a settings dashboard view.
- **Companion `recuperator-settings-card`** with its own configurable
  **Back** button (separate tap/hold actions), plus in‑card language
  (Latviešu / Русский / English) and light/dark theme pickers.
- **Light / dark / auto theme**, independent of your Home Assistant theme.
- Zero build step — a single JavaScript file, installable through HACS as a
  custom Lovelace resource.

## 📦 Installation via HACS

1. Push the contents of this repository to your own **public GitHub repo**
   (see [Publishing to GitHub](#-publishing-to-github) below).
2. In Home Assistant, open **HACS → Frontend**.
3. Click the **⋮** menu (top right) → **Custom repositories**.
4. Add your repository URL, category **Lovelace**.
5. Find **Recuperator Card** in HACS and click **Download**.
6. Home Assistant will usually add the resource automatically. If not, add
   it manually under **Settings → Dashboards → ⋮ → Resources**:

   | URL | Type |
   |---|---|
   | `/hacsfiles/recuperator-custom-card/recuperator-custom-card.js` | JavaScript module |

7. Refresh the browser and add the card through **Edit Dashboard → Add
   card → Recuperator Card** (or **Recuperator Settings Card**).

## 🧩 Example configuration

### Main card

```yaml
type: custom:recuperator-card
title: Ventilation
language: en          # en | ru | lv
theme: auto            # auto | light | dark
mode_entity: input_select.recuperator_mode
fan_speed_entity: sensor.recuperator_fan_speed
recovery_entity: sensor.recuperator_heat_recovery
outdoor_temp_entity: sensor.recuperator_outdoor_temperature
supply_temp_entity: sensor.recuperator_supply_temperature
indoor_temp_entity: sensor.recuperator_indoor_temperature
mode_state_map:
  off: "off"
  building_protection: building_protection
  economy: economy
  comfort: comfort
  boost: boost
settings_tap_action:
  action: navigate
  navigation_path: /lovelace/recuperator-settings
settings_hold_action:
  action: more-info
  entity: input_select.recuperator_mode
```

`mode_entity` accepts `input_select`, `select`, `climate` (uses
`set_preset_mode`) or `fan` (uses `set_preset_mode`) domains.
`mode_state_map` maps each of the five UI modes to the exact state value
used by your entity — adjust it to match your device/integration.

### Settings card

```yaml
type: custom:recuperator-settings-card
title: Ventilation settings
show_language_picker: true
show_theme_picker: true
language_entity: input_select.recuperator_language   # optional, for multi-user persistence
theme_entity: input_select.recuperator_theme          # optional
back_tap_action:
  action: navigate
  navigation_path: /lovelace/0
back_hold_action:
  action: navigate
  navigation_path: /lovelace/recuperator-history
```

If `language_entity` / `theme_entity` are not set, the choice is stored in
the browser (`localStorage`) per device.

## ⚙️ Configuration reference

### `recuperator-card`

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Ventilation` | Card header title |
| `language` | `en` \| `ru` \| `lv` | `en` | UI language |
| `theme` | `auto` \| `light` \| `dark` | `auto` | Visual theme |
| `mode_entity` | entity | — | Entity that stores the current mode |
| `mode_state_map` | map | see above | UI mode → entity state value |
| `fan_speed_entity` | entity | — | Sensor, 0‑100 (%) |
| `recovery_entity` | entity | — | Sensor, 0‑100 (%) |
| `outdoor_temp_entity` | entity | — | Temperature sensor |
| `supply_temp_entity` | entity | — | Temperature sensor |
| `indoor_temp_entity` | entity | — | Temperature sensor |
| `settings_tap_action` | action | `none` | Short press on the gear icon |
| `settings_hold_action` | action | `none` | Long press on the gear icon |

### `recuperator-settings-card`

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Ventilation settings` | Card header title |
| `language` | `en` \| `ru` \| `lv` | `en` | Default language |
| `theme` | `auto` \| `light` \| `dark` | `auto` | Default theme |
| `show_language_picker` | boolean | `true` | Show the language pills |
| `show_theme_picker` | boolean | `true` | Show the theme pills |
| `language_entity` | entity (`input_select`) | — | Optional persistence across devices |
| `theme_entity` | entity (`input_select`) | — | Optional persistence across devices |
| `back_tap_action` | action | `none` | Short press on the back arrow |
| `back_hold_action` | action | `none` | Long press on the back arrow |

Both `*_tap_action` / `*_hold_action` accept any standard Home Assistant
action object (`navigate`, `more-info`, `call-service`, `url`, `none`) — the
visual editor exposes these through Home Assistant's normal action picker.

## 🚀 Publishing to GitHub

```bash
cd ha-recuperator-card
git init
git add .
git commit -m "Recuperator Card v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USER/ha-recuperator-card.git
git push -u origin main
```

Then tag a release (`git tag v1.0.0 && git push --tags`) so HACS can offer
version updates.

## License

MIT — see [LICENSE](LICENSE).
