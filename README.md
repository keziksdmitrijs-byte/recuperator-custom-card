# Recuperator Custom Card

A modern, friendly Lovelace card for controlling a home ventilation
recuperator (HRV/ERV) in Home Assistant.

- 5 modes: **Off · Building protection · Economy · Comfort · Boost**
- A dual "breathing ring" gauge showing **fan speed %** and **recuperation %**
  side by side, with a subtle animation while running
- Indoor / outdoor / supply air temperatures (exhaust temperature is
  intentionally left out)
- A settings button whose **short press** and **long press** actions you
  choose (navigate to a page, call a service, open a URL, show more-info…)
- A separate **settings card** with its own back button (also configurable
  for short/long press), where the user picks:
  - **Language:** Latviešu / Русский / English
  - **Appearance:** Light / Dark / Match Home Assistant

No build step, no dependencies — a single JS file.

![screenshot placeholder](docs/screenshot.png)

## Installation

### HACS (custom repository)

1. In Home Assistant, open **HACS → ⋮ → Custom repositories**.
2. Add `https://github.com/keziksdmitrijs-byte/recuperator-custom-card`
   with category **Dashboard**.
3. Install **Recuperator Custom Card**, then reload your browser
   (HACS adds the resource automatically).

### Manual

1. Copy `recuperator-card.js` to `/config/www/recuperator-card.js`.
2. In **Settings → Dashboards → Resources**, add:
   - URL: `/local/recuperator-card.js`
   - Type: JavaScript module

## Setting up your entities

The card is generic on purpose so it works with whatever integration
exposes your recuperator (`select`, `input_select`, MQTT, Modbus, ESPHome…).
You need:

| What | Typical entity domain |
|---|---|
| Mode | `select.xxx` (or `input_select.xxx`) |
| Fan speed, 0–100 | `sensor.xxx` |
| Recuperation efficiency, 0–100 | `sensor.xxx` |
| Indoor / outdoor / supply temperature | `sensor.xxx` |

## Main card configuration

```yaml
type: custom:recuperator-card
title: Recuperator                # optional, defaults to translated "Recuperator"

mode_entity: select.recuperator_mode
mode_service: select.select_option      # domain.service called on mode change
mode_service_data_key: option           # key holding the chosen value in service data
mode_map:                               # your entity's raw option text for each mode
  off: "Off"
  building_protection: "Building protection"
  economy: "Economy"
  comfort: "Comfort"
  boost: "Boost"

fan_speed_entity: sensor.recuperator_fan_speed
recuperation_entity: sensor.recuperator_recuperation_efficiency

temp_indoor_entity: sensor.recuperator_room_temperature
temp_outdoor_entity: sensor.recuperator_outdoor_temperature
temp_supply_entity: sensor.recuperator_supply_temperature

settings_tap_action:
  action: navigate
  navigation_path: /lovelace/recuperator-settings
settings_hold_action:
  action: navigate
  navigation_path: /lovelace/recuperator-advanced   # e.g. a raw entity/more-info page

language: auto     # auto | en | ru | lv  — "auto" follows what was chosen in the settings card
theme: auto         # auto | light | dark — "auto" follows Home Assistant's own dark mode
```

`mode_service` also works for an `input_select`
(`input_select.select_option` / key `option`), or you can point it at
whatever service your integration provides — for example a `climate`
entity's preset:

```yaml
mode_entity: climate.recuperator
mode_service: climate.set_preset_mode
mode_service_data_key: preset_mode
mode_map:
  off: "off"
  building_protection: "building_protection"
  economy: "eco"
  comfort: "comfort"
  boost: "boost"
```

### Action types available for `settings_tap_action` / `settings_hold_action`

```yaml
action: navigate
navigation_path: /lovelace/settings-page
```
```yaml
action: url
url_path: https://example.com
```
```yaml
action: call-service
service: script.my_script
service_data: {}
```
```yaml
action: more-info
entity: sensor.recuperator_fan_speed
```
```yaml
action: none
```

## Settings card configuration

Put this on its own dashboard view (e.g. `/lovelace/recuperator-settings`)
so the main card's settings button can navigate to it:

```yaml
type: custom:recuperator-card-settings

back_tap_action:
  action: navigate
  navigation_path: /lovelace/0        # your main dashboard view

back_hold_action:
  action: navigate
  navigation_path: /lovelace/recuperator-advanced
```

Language and theme choices are saved in the browser's local storage and
are shared by every Recuperator card the same browser sees — no helper
entities required.

## Roadmap

- Visual (GUI) configuration editor
- Optional sync of language/theme via `input_select` / `input_boolean`
  helpers for multi-device consistency
- HACS default store submission (see below)

## Publishing this repository & submitting to HACS

This package is ready to push to
`https://github.com/keziksdmitrijs-byte/recuperator-custom-card`:

```bash
cd recuperator-custom-card
git init
git add .
git commit -m "Initial release: recuperator custom card"
git branch -M main
git remote add origin https://github.com/keziksdmitrijs-byte/recuperator-custom-card.git
git push -u origin main
```

Then, on GitHub:
1. Add the repo **topics** `home-assistant`, `hacs`, `lovelace`, `dashboard`.
2. Create a **Release** (e.g. tag `v1.0.0`) — HACS custom repositories
   read from releases/tags.
3. Anyone can now add it in HACS as a **custom repository** (see
   Installation above).

To get it into the **default HACS store** (so people don't need to add it
manually), open a pull request against `hacs/default` on GitHub following
their [publishing guide](https://hacs.xyz/docs/publish/start) — this
requires the repository to be public, have a README, a release, and pass
their automated checks.

## License

MIT
