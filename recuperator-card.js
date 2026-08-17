/*!
 * Recuperator Custom Card
 * https://github.com/keziksdmitrijs-byte/recuperator-custom-card
 *
 * Two custom elements are registered from this single file so HACS only
 * needs to load one resource:
 *   - recuperator-card            (main dashboard tile)
 *   - recuperator-card-settings   (dedicated settings screen)
 *
 * No build step, no external dependencies. Uses <ha-icon> which is already
 * available globally inside Home Assistant's frontend.
 */

/* ----------------------------------------------------------------------- */
/*  Shared: design tokens, translations, small helpers                     */
/* ----------------------------------------------------------------------- */

const RC_STORAGE_LANG = "recuperator-card-language";
const RC_STORAGE_THEME = "recuperator-card-theme";
const RC_EVENT_SETTINGS_CHANGED = "recuperator-card-settings-changed";

const RC_MODES = ["off", "building_protection", "economy", "comfort", "boost"];

const RC_MODE_META = {
  off: { icon: "mdi:power", accent: "var(--rc-muted)" },
  building_protection: { icon: "mdi:shield-home-outline", accent: "#5B8DEF" },
  economy: { icon: "mdi:leaf", accent: "#4FD1C5" },
  comfort: { icon: "mdi:sofa-outline", accent: "#F6AD55" },
  boost: { icon: "mdi:rocket-launch-outline", accent: "#F4587E" },
};

const RC_I18N = {
  en: {
    title: "Recuperator",
    settings: "Settings",
    back: "Back",
    fan_speed: "Fan speed",
    recuperation: "Recuperation",
    indoor: "Indoor",
    outdoor: "Outdoor",
    supply: "Supply air",
    off: "Off",
    building_protection: "Building protection",
    economy: "Economy",
    comfort: "Comfort",
    boost: "Boost",
    running: "Running",
    stopped: "Stopped",
    language: "Language",
    theme: "Appearance",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_auto: "Match Home Assistant",
    button_actions: "Button behaviour",
    tap: "Tap",
    hold: "Hold",
    entities: "Entities",
    not_configured: "Not configured",
    saved: "Saved",
  },
  ru: {
    title: "Рекуператор",
    settings: "Настройки",
    back: "Назад",
    fan_speed: "Скорость вентилятора",
    recuperation: "Рекуперация",
    indoor: "В доме",
    outdoor: "На улице",
    supply: "Приточный воздух",
    off: "Выключено",
    building_protection: "Защита здания",
    economy: "Экономия",
    comfort: "Комфорт",
    boost: "Ускоренный",
    running: "Работает",
    stopped: "Остановлен",
    language: "Язык",
    theme: "Оформление",
    theme_light: "Светлая",
    theme_dark: "Тёмная",
    theme_auto: "Как в Home Assistant",
    button_actions: "Действия кнопок",
    tap: "Короткое нажатие",
    hold: "Долгое нажатие",
    entities: "Сущности",
    not_configured: "Не настроено",
    saved: "Сохранено",
  },
  lv: {
    title: "Rekuperators",
    settings: "Iestatījumi",
    back: "Atpakaļ",
    fan_speed: "Ventilatora ātrums",
    recuperation: "Rekuperācija",
    indoor: "Telpā",
    outdoor: "Ārā",
    supply: "Pievadītais gaiss",
    off: "Izslēgts",
    building_protection: "Ēkas aizsardzība",
    economy: "Ekonomija",
    comfort: "Komforts",
    boost: "Paātrināts",
    running: "Darbojas",
    stopped: "Apturēts",
    language: "Valoda",
    theme: "Izskats",
    theme_light: "Gaišs",
    theme_dark: "Tumšs",
    theme_auto: "Kā Home Assistant",
    button_actions: "Pogu darbības",
    tap: "Īss pieskāriens",
    hold: "Ilgs pieskāriens",
    entities: "Entītijas",
    not_configured: "Nav konfigurēts",
    saved: "Saglabāts",
  },
};

function rcGetLang(configLang) {
  if (configLang && configLang !== "auto") return configLang;
  const stored = window.localStorage.getItem(RC_STORAGE_LANG);
  if (stored && RC_I18N[stored]) return stored;
  return "en";
}

function rcGetTheme(configTheme) {
  if (configTheme && configTheme !== "auto") return configTheme;
  const stored = window.localStorage.getItem(RC_STORAGE_THEME);
  if (stored === "light" || stored === "dark") return stored;
  return "auto";
}

function rcT(lang, key) {
  return (RC_I18N[lang] && RC_I18N[lang][key]) || RC_I18N.en[key] || key;
}

function rcFireEvent(el, type, detail) {
  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    composed: true,
  });
  el.dispatchEvent(event);
}

function rcClampPercent(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(100, n));
}

const RC_STYLES = `
  :host {
    --rc-radius: 20px;
    --rc-accent-cool: #4FD1C5;
    --rc-accent-warm: #F6AD55;
    --rc-transition: 220ms cubic-bezier(.4,0,.2,1);
  }
  :host([data-rc-theme="dark"]) {
    --rc-bg: #131B29;
    --rc-surface: #1C2740;
    --rc-surface-2: #223154;
    --rc-text: #E8EEF5;
    --rc-muted: #8CA0B3;
    --rc-border: rgba(255,255,255,0.06);
    --rc-shadow: 0 10px 30px rgba(3, 8, 20, 0.45);
  }
  :host([data-rc-theme="light"]) {
    --rc-bg: #F5F7FA;
    --rc-surface: #FFFFFF;
    --rc-surface-2: #EEF2F7;
    --rc-text: #1A2332;
    --rc-muted: #64748B;
    --rc-border: rgba(20,30,50,0.08);
    --rc-shadow: 0 10px 30px rgba(20, 30, 50, 0.10);
  }
  .rc-card {
    background: var(--rc-bg);
    color: var(--rc-text);
    border-radius: var(--rc-radius);
    padding: 18px 18px 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: var(--rc-shadow);
    box-sizing: border-box;
    overflow: hidden;
  }
`;

/* ----------------------------------------------------------------------- */
/*  Action handling shared by both cards (tap / hold)                      */
/* ----------------------------------------------------------------------- */

function rcHandleAction(el, hass, actionConfig) {
  if (!actionConfig || actionConfig.action === "none") return;
  switch (actionConfig.action) {
    case "navigate": {
      if (actionConfig.navigation_path) {
        window.history.pushState(null, "", actionConfig.navigation_path);
        window.dispatchEvent(new CustomEvent("location-changed", {
          bubbles: true, composed: true,
        }));
      }
      break;
    }
    case "url": {
      if (actionConfig.url_path) window.open(actionConfig.url_path, "_blank");
      break;
    }
    case "call-service":
    case "perform-action": {
      const serviceStr = actionConfig.service || actionConfig.perform_action;
      if (!serviceStr || !hass) break;
      const [domain, service] = serviceStr.split(".");
      hass.callService(
        domain,
        service,
        actionConfig.service_data || actionConfig.data || {},
        actionConfig.target
      );
      break;
    }
    case "more-info": {
      const entityId = actionConfig.entity;
      if (entityId) {
        window.dispatchEvent(new CustomEvent("hass-more-info", {
          detail: { entityId }, bubbles: true, composed: true,
        }));
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Attach tap/hold handling to an element. Calls onTap()/onHold() callbacks.
 * Hold threshold ~500ms. Works with mouse + touch via pointer events.
 */
function rcBindPressActions(el, { onTap, onHold, holdTimeMs = 500 }) {
  let pressTimer = null;
  let didHold = false;

  const clear = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  el.addEventListener("pointerdown", (ev) => {
    didHold = false;
    clear();
    pressTimer = setTimeout(() => {
      didHold = true;
      onHold && onHold();
    }, holdTimeMs);
  });

  const finish = () => {
    clear();
    if (!didHold) {
      onTap && onTap();
    }
  };

  el.addEventListener("pointerup", finish);
  el.addEventListener("pointerleave", clear);
  el.addEventListener("pointercancel", clear);

  // keyboard accessibility: Enter/Space triggers tap
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onTap && onTap();
    }
  });
}

/* ----------------------------------------------------------------------- */
/*  <recuperator-card>                                                     */
/* ----------------------------------------------------------------------- */

class RecuperatorCard extends HTMLElement {
  static getConfigElement() {
    return null; // no visual editor yet — configure via YAML
  }

  static getStubConfig() {
    return {
      type: "custom:recuperator-card",
      mode_entity: "",
      fan_speed_entity: "",
      recuperation_entity: "",
      temp_indoor_entity: "",
      temp_outdoor_entity: "",
      temp_supply_entity: "",
      settings_tap_action: { action: "navigate", navigation_path: "/recuperator-settings" },
      settings_hold_action: { action: "none" },
      language: "auto",
      theme: "auto",
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      mode_service: "select.select_option",
      mode_service_data_key: "option",
      mode_map: {
        off: "Off",
        building_protection: "Building protection",
        economy: "Economy",
        comfort: "Comfort",
        boost: "Boost",
      },
      language: "auto",
      theme: "auto",
      ...config,
    };
    this._built = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._render();
    this._update();
  }

  getCardSize() {
    return 5;
  }

  connectedCallback() {
    this._onSettingsChanged = () => this._update();
    window.addEventListener(RC_EVENT_SETTINGS_CHANGED, this._onSettingsChanged);
  }

  disconnectedCallback() {
    window.removeEventListener(RC_EVENT_SETTINGS_CHANGED, this._onSettingsChanged);
  }

  _lang() {
    return rcGetLang(this._config && this._config.language);
  }

  _t(key) {
    return rcT(this._lang(), key);
  }

  _themeMode() {
    const t = rcGetTheme(this._config && this._config.theme);
    if (t === "auto") {
      return this._hass && this._hass.themes && this._hass.themes.darkMode ? "dark" : "light";
    }
    return t;
  }

  _render() {
    if (!this._config) return;
    this._built = true;

    const root = document.createElement("div");
    this.innerHTML = "";
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = RC_STYLES + `
      .rc-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 10px;
      }
      .rc-title {
        font-size: 16px; font-weight: 700; letter-spacing: -0.01em;
      }
      .rc-status {
        font-size: 12px; color: var(--rc-muted); margin-top: 1px;
      }
      .rc-gear {
        width: 38px; height: 38px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        background: var(--rc-surface-2); cursor: pointer;
        transition: transform var(--rc-transition), background var(--rc-transition);
        outline: none;
      }
      .rc-gear:hover { transform: rotate(20deg); }
      .rc-gear:active { transform: rotate(45deg) scale(0.94); }
      .rc-gear ha-icon { color: var(--rc-muted); --mdc-icon-size: 20px; }

      .rc-ring-wrap {
        position: relative; width: 168px; height: 168px; margin: 6px auto 14px;
      }
      .rc-ring-wrap.rc-breathing { animation: rc-breathe 4s ease-in-out infinite; }
      @keyframes rc-breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.018); }
      }
      .rc-ring-center {
        position: absolute; inset: 0; display: flex; flex-direction: column;
        align-items: center; justify-content: center; text-align: center;
      }
      .rc-ring-center ha-icon {
        --mdc-icon-size: 26px; margin-bottom: 4px;
        transition: color var(--rc-transition);
      }
      .rc-mode-name { font-size: 14px; font-weight: 700; }
      .rc-mode-sub { font-size: 11px; color: var(--rc-muted); margin-top: 2px; }

      .rc-legend {
        display: flex; justify-content: center; gap: 18px; margin-bottom: 14px;
      }
      .rc-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--rc-muted); }
      .rc-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
      .rc-legend-value { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rc-text); }

      .rc-modes {
        display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px;
        scrollbar-width: none;
      }
      .rc-modes::-webkit-scrollbar { display: none; }
      .rc-mode-btn {
        flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 4px;
        padding: 8px 10px 7px; border-radius: 14px; background: var(--rc-surface);
        border: 1px solid var(--rc-border); cursor: pointer; min-width: 58px;
        transition: box-shadow var(--rc-transition), border-color var(--rc-transition), transform 120ms;
        outline: none;
      }
      .rc-mode-btn:active { transform: scale(0.96); }
      .rc-mode-btn ha-icon { --mdc-icon-size: 18px; color: var(--rc-muted); }
      .rc-mode-btn span { font-size: 10px; color: var(--rc-muted); font-weight: 600; }
      .rc-mode-btn.active {
        border-color: var(--rc-accent); box-shadow: 0 0 0 1px var(--rc-accent), 0 6px 16px -6px var(--rc-accent);
      }
      .rc-mode-btn.active ha-icon, .rc-mode-btn.active span { color: var(--rc-accent); }

      .rc-stats {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
      }
      .rc-stat {
        background: var(--rc-surface); border-radius: 14px; padding: 10px 8px;
        text-align: center; border: 1px solid var(--rc-border);
      }
      .rc-stat-label { font-size: 10px; color: var(--rc-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
      .rc-stat-value { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 2px; }
    `;

    const card = document.createElement("div");
    card.className = "rc-card";

    card.innerHTML = `
      <div class="rc-header">
        <div>
          <div class="rc-title" id="rc-title"></div>
          <div class="rc-status" id="rc-status"></div>
        </div>
        <div class="rc-gear" id="rc-gear" tabindex="0" role="button" aria-label="settings">
          <ha-icon icon="mdi:cog-outline"></ha-icon>
        </div>
      </div>

      <div class="rc-ring-wrap" id="rc-ring-wrap">
        <svg viewBox="0 0 168 168" width="168" height="168">
          <circle cx="84" cy="84" r="74" fill="none" stroke="var(--rc-surface-2)" stroke-width="10" />
          <circle id="rc-ring-recup" cx="84" cy="84" r="74" fill="none" stroke="var(--rc-accent-warm)"
                  stroke-width="10" stroke-linecap="round" transform="rotate(-90 84 84)" />
          <circle cx="84" cy="84" r="58" fill="none" stroke="var(--rc-surface-2)" stroke-width="10" />
          <circle id="rc-ring-fan" cx="84" cy="84" r="58" fill="none" stroke="var(--rc-accent-cool)"
                  stroke-width="10" stroke-linecap="round" transform="rotate(-90 84 84)" />
        </svg>
        <div class="rc-ring-center">
          <ha-icon id="rc-mode-icon" icon="mdi:power"></ha-icon>
          <div class="rc-mode-name" id="rc-mode-name"></div>
          <div class="rc-mode-sub" id="rc-mode-sub"></div>
        </div>
      </div>

      <div class="rc-legend">
        <div class="rc-legend-item">
          <span class="rc-legend-dot" style="background: var(--rc-accent-warm)"></span>
          <span id="rc-legend-recup-label"></span>
          <span class="rc-legend-value" id="rc-legend-recup-value">–</span>
        </div>
        <div class="rc-legend-item">
          <span class="rc-legend-dot" style="background: var(--rc-accent-cool)"></span>
          <span id="rc-legend-fan-label"></span>
          <span class="rc-legend-value" id="rc-legend-fan-value">–</span>
        </div>
      </div>

      <div class="rc-modes" id="rc-modes"></div>

      <div class="rc-stats" id="rc-stats"></div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._els = {
      title: card.querySelector("#rc-title"),
      status: card.querySelector("#rc-status"),
      gear: card.querySelector("#rc-gear"),
      ringWrap: card.querySelector("#rc-ring-wrap"),
      ringRecup: card.querySelector("#rc-ring-recup"),
      ringFan: card.querySelector("#rc-ring-fan"),
      modeIcon: card.querySelector("#rc-mode-icon"),
      modeName: card.querySelector("#rc-mode-name"),
      modeSub: card.querySelector("#rc-mode-sub"),
      recupLabel: card.querySelector("#rc-legend-recup-label"),
      recupValue: card.querySelector("#rc-legend-recup-value"),
      fanLabel: card.querySelector("#rc-legend-fan-label"),
      fanValue: card.querySelector("#rc-legend-fan-value"),
      modes: card.querySelector("#rc-modes"),
      stats: card.querySelector("#rc-stats"),
    };

    rcBindPressActions(this._els.gear, {
      onTap: () => rcHandleAction(this, this._hass, this._config.settings_tap_action),
      onHold: () => rcHandleAction(this, this._hass, this._config.settings_hold_action),
    });

    // circle circumferences for stroke-dashoffset math
    this._circRecup = 2 * Math.PI * 74;
    this._circFan = 2 * Math.PI * 58;
  }

  _currentModeKey() {
    if (!this._hass || !this._config.mode_entity) return null;
    const stateObj = this._hass.states[this._config.mode_entity];
    if (!stateObj) return null;
    const raw = stateObj.state;
    const map = this._config.mode_map;
    for (const key of RC_MODES) {
      if (map[key] === raw) return key;
    }
    return null;
  }

  _selectMode(key) {
    if (!this._hass || !this._config.mode_entity) return;
    const raw = this._config.mode_map[key];
    if (raw === undefined) return;
    const [domain, service] = this._config.mode_service.split(".");
    const dataKey = this._config.mode_service_data_key;
    this._hass.callService(domain, service, {
      entity_id: this._config.mode_entity,
      [dataKey]: raw,
    });
  }

  _readNumberState(entityId) {
    if (!this._hass || !entityId) return null;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return null;
    return {
      value: rcClampPercent(stateObj.state),
      raw: stateObj.state,
      unit: stateObj.attributes && stateObj.attributes.unit_of_measurement,
    };
  }

  _update() {
    if (!this._hass || !this._els) return;
    const lang = this._lang();
    const themeMode = this._themeMode();
    this.setAttribute("data-rc-theme", themeMode);

    const modeKey = this._currentModeKey() || "off";
    const meta = RC_MODE_META[modeKey];

    this._els.title.textContent = this._config.title || this._t("title");

    const running = modeKey !== "off";
    this._els.status.textContent = running ? this._t("running") : this._t("stopped");

    this._els.modeIcon.setAttribute("icon", meta.icon);
    this._els.modeIcon.style.color = meta.accent;
    this._els.modeName.textContent = this._t(modeKey);
    this._els.modeName.style.color = meta.accent;
    this._els.modeSub.textContent = running ? this._t("running") : this._t("stopped");

    this._els.ringWrap.classList.toggle("rc-breathing", running);

    const fan = this._readNumberState(this._config.fan_speed_entity);
    const recup = this._readNumberState(this._config.recuperation_entity);

    this._els.recupLabel.textContent = this._t("recuperation");
    this._els.fanLabel.textContent = this._t("fan_speed");
    this._els.recupValue.textContent = recup && recup.value !== null ? `${Math.round(recup.value)}%` : "–";
    this._els.fanValue.textContent = fan && fan.value !== null ? `${Math.round(fan.value)}%` : "–";

    const recupPct = recup && recup.value !== null ? recup.value : 0;
    const fanPct = fan && fan.value !== null ? fan.value : 0;
    this._els.ringRecup.setAttribute(
      "stroke-dasharray",
      `${(recupPct / 100) * this._circRecup} ${this._circRecup}`
    );
    this._els.ringFan.setAttribute(
      "stroke-dasharray",
      `${(fanPct / 100) * this._circFan} ${this._circFan}`
    );

    // mode selector buttons (rebuild only if not yet built for this language)
    if (this._els.modes.dataset.lang !== lang) {
      this._els.modes.dataset.lang = lang;
      this._els.modes.innerHTML = "";
      RC_MODES.forEach((key) => {
        const btn = document.createElement("div");
        btn.className = "rc-mode-btn";
        btn.tabIndex = 0;
        btn.setAttribute("role", "button");
        btn.dataset.mode = key;
        btn.style.setProperty("--rc-accent", RC_MODE_META[key].accent);
        btn.innerHTML = `<ha-icon icon="${RC_MODE_META[key].icon}"></ha-icon><span>${rcT(lang, key)}</span>`;
        btn.addEventListener("click", () => this._selectMode(key));
        btn.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this._selectMode(key);
          }
        });
        this._els.modes.appendChild(btn);
      });
    }
    [...this._els.modes.children].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === modeKey);
    });

    // stat tiles: indoor / outdoor / supply (exhaust intentionally omitted)
    const statDefs = [
      { key: "indoor", entity: this._config.temp_indoor_entity },
      { key: "outdoor", entity: this._config.temp_outdoor_entity },
      { key: "supply", entity: this._config.temp_supply_entity },
    ];
    this._els.stats.innerHTML = "";
    statDefs.forEach((def) => {
      const stateObj = def.entity && this._hass.states[def.entity];
      const value = stateObj ? stateObj.state : null;
      const unit = stateObj && stateObj.attributes ? stateObj.attributes.unit_of_measurement || "°C" : "°C";
      const el = document.createElement("div");
      el.className = "rc-stat";
      el.innerHTML = `
        <div class="rc-stat-label">${this._t(def.key)}</div>
        <div class="rc-stat-value">${value !== null && value !== undefined ? `${value}${unit}` : "–"}</div>
      `;
      this._els.stats.appendChild(el);
    });
  }
}

/* ----------------------------------------------------------------------- */
/*  <recuperator-card-settings>                                            */
/* ----------------------------------------------------------------------- */

class RecuperatorCardSettings extends HTMLElement {
  static getStubConfig() {
    return {
      type: "custom:recuperator-card-settings",
      back_tap_action: { action: "navigate", navigation_path: "/lovelace/0" },
      back_hold_action: { action: "none" },
    };
  }

  setConfig(config) {
    this._config = { ...config };
    this._built = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._render();
    this._update();
  }

  getCardSize() {
    return 4;
  }

  _lang() {
    return rcGetLang();
  }

  _t(key) {
    return rcT(this._lang(), key);
  }

  _themeMode() {
    const t = rcGetTheme();
    if (t === "auto") {
      return this._hass && this._hass.themes && this._hass.themes.darkMode ? "dark" : "light";
    }
    return t;
  }

  _render() {
    if (!this._config) return;
    this._built = true;
    this.innerHTML = "";
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = RC_STYLES + `
      .rc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
      .rc-back {
        width: 38px; height: 38px; border-radius: 12px; display: flex;
        align-items: center; justify-content: center; background: var(--rc-surface-2);
        cursor: pointer; outline: none; transition: transform 120ms;
      }
      .rc-back:active { transform: scale(0.92); }
      .rc-back ha-icon { --mdc-icon-size: 20px; color: var(--rc-muted); }
      .rc-title { font-size: 17px; font-weight: 700; }

      .rc-section { margin-bottom: 18px; }
      .rc-section-label {
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
        color: var(--rc-muted); margin-bottom: 8px;
      }
      .rc-pill-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .rc-pill {
        padding: 9px 16px; border-radius: 999px; background: var(--rc-surface);
        border: 1px solid var(--rc-border); font-size: 13px; font-weight: 600;
        color: var(--rc-muted); cursor: pointer; transition: all var(--rc-transition);
        outline: none;
      }
      .rc-pill.active {
        color: white; background: linear-gradient(135deg, var(--rc-accent-cool), var(--rc-accent-warm));
        border-color: transparent;
      }
      .rc-note { font-size: 11px; color: var(--rc-muted); margin-top: 10px; line-height: 1.5; }
    `;

    const card = document.createElement("div");
    card.className = "rc-card";
    card.innerHTML = `
      <div class="rc-header">
        <div class="rc-back" id="rc-back" tabindex="0" role="button" aria-label="back">
          <ha-icon icon="mdi:arrow-left"></ha-icon>
        </div>
        <div class="rc-title" id="rc-title"></div>
      </div>

      <div class="rc-section">
        <div class="rc-section-label" id="rc-lang-label"></div>
        <div class="rc-pill-row" id="rc-lang-row"></div>
      </div>

      <div class="rc-section">
        <div class="rc-section-label" id="rc-theme-label"></div>
        <div class="rc-pill-row" id="rc-theme-row"></div>
      </div>

      <div class="rc-note" id="rc-note"></div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._els = {
      back: card.querySelector("#rc-back"),
      title: card.querySelector("#rc-title"),
      langLabel: card.querySelector("#rc-lang-label"),
      langRow: card.querySelector("#rc-lang-row"),
      themeLabel: card.querySelector("#rc-theme-label"),
      themeRow: card.querySelector("#rc-theme-row"),
      note: card.querySelector("#rc-note"),
    };

    rcBindPressActions(this._els.back, {
      onTap: () => rcHandleAction(this, this._hass, this._config.back_tap_action),
      onHold: () => rcHandleAction(this, this._hass, this._config.back_hold_action),
    });
  }

  _setLanguage(code) {
    window.localStorage.setItem(RC_STORAGE_LANG, code);
    window.dispatchEvent(new CustomEvent(RC_EVENT_SETTINGS_CHANGED));
    this._update();
  }

  _setTheme(mode) {
    window.localStorage.setItem(RC_STORAGE_THEME, mode);
    window.dispatchEvent(new CustomEvent(RC_EVENT_SETTINGS_CHANGED));
    this._update();
  }

  _update() {
    if (!this._els) return;
    const lang = this._lang();
    const themeMode = this._themeMode();
    this.setAttribute("data-rc-theme", themeMode);

    this._els.title.textContent = this._t("settings");
    this._els.langLabel.textContent = this._t("language");
    this._els.themeLabel.textContent = this._t("theme");
    this._els.note.textContent =
      lang === "ru"
        ? "Язык и тема сохраняются в этом браузере и применяются ко всем карточкам рекуператора на панели."
        : lang === "lv"
        ? "Valoda un izskats tiek saglabāti šajā pārlūkā un attiecas uz visām rekuperatora kartītēm panelī."
        : "Language and theme are saved in this browser and apply to every recuperator card on the dashboard.";

    const currentLang = rcGetLang();
    const langs = [
      { code: "lv", label: "Latviešu" },
      { code: "ru", label: "Русский" },
      { code: "en", label: "English" },
    ];
    this._els.langRow.innerHTML = "";
    langs.forEach((l) => {
      const pill = document.createElement("div");
      pill.className = "rc-pill" + (l.code === currentLang ? " active" : "");
      pill.textContent = l.label;
      pill.tabIndex = 0;
      pill.addEventListener("click", () => this._setLanguage(l.code));
      pill.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") this._setLanguage(l.code);
      });
      this._els.langRow.appendChild(pill);
    });

    const currentTheme = rcGetTheme();
    const themes = [
      { code: "light", label: this._t("theme_light") },
      { code: "dark", label: this._t("theme_dark") },
      { code: "auto", label: this._t("theme_auto") },
    ];
    this._els.themeRow.innerHTML = "";
    themes.forEach((t) => {
      const pill = document.createElement("div");
      pill.className = "rc-pill" + (t.code === currentTheme ? " active" : "");
      pill.textContent = t.label;
      pill.tabIndex = 0;
      pill.addEventListener("click", () => this._setTheme(t.code));
      pill.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") this._setTheme(t.code);
      });
      this._els.themeRow.appendChild(pill);
    });
  }
}

customElements.define("recuperator-card", RecuperatorCard);
customElements.define("recuperator-card-settings", RecuperatorCardSettings);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "recuperator-card",
  name: "Recuperator Card",
  description: "Modern control card for a home ventilation recuperator: modes, fan speed, recuperation %, temperatures.",
  preview: false,
});
window.customCards.push({
  type: "recuperator-card-settings",
  name: "Recuperator Card — Settings",
  description: "Dedicated settings screen for the Recuperator Card: language, theme, back button behaviour.",
  preview: false,
});

console.info(
  "%c RECUPERATOR-CARD %c registered ",
  "background:#131B29;color:#4FD1C5;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#223154;color:#E8EEF5;padding:2px 6px;border-radius:0 4px 4px 0;"
);
