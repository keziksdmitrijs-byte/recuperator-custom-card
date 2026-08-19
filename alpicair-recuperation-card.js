/*!
 * Alpicair Recuperation Card
 * https://github.com/keziksdmitrijs-byte/Alpicair-Recuperation
 *
 * Three custom elements are registered from this single file so HACS only
 * needs to load one resource:
 *   - alpicair-recuperation-card            (ring gauge + mode control, square)
 *   - alpicair-recuperation-sensors-card    (temperatures + target-temp slider, square)
 *   - alpicair-recuperation-card-settings   (dedicated settings screen)
 *
 * No build step, no external dependencies. Uses <ha-icon> which is already
 * available globally inside Home Assistant's frontend.
 */

/* ----------------------------------------------------------------------- */
/*  Shared: design tokens, translations, small helpers                     */
/* ----------------------------------------------------------------------- */

const RC_STORAGE_LANG = "alpicair-recuperation-card-language";
const RC_STORAGE_THEME = "alpicair-recuperation-card-theme";
const RC_EVENT_SETTINGS_CHANGED = "alpicair-recuperation-card-settings-changed";

const RC_MODES = ["off", "building_protection", "economy", "comfort", "boost"];
const RC_ACTIVE_MODES = ["building_protection", "economy", "comfort", "boost"];

const RC_MODE_META = {
  off: { icon: "mdi:power", accent: "var(--rc-muted)" },
  building_protection: { icon: "mdi:shield-home-outline", accent: "#5B8DEF" },
  economy: { icon: "mdi:leaf", accent: "#4FD1C5" },
  comfort: { icon: "mdi:sofa-outline", accent: "#F6AD55" },
  boost: { icon: "mdi:rocket-launch-outline", accent: "#F4587E" },
};

const RC_I18N = {
  en: {
    title: "Alpicair Recuperation",
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
    tap_hint: "Tap to change",
    boost_ends_in: "Boost ends in",
    night_cooling: "Night cooling",
    fan_speeds: "Fan speeds",
    supply_fan: "Supply fan",
    extract_fan: "Extract fan",
    target_temp: "Target temperature",
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
    title: "Alpicair Рекуператор",
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
    tap_hint: "Нажмите, чтобы сменить",
    boost_ends_in: "Ускоренный режим закончится через",
    night_cooling: "Ночное охлаждение",
    fan_speeds: "Скорости вентиляторов",
    supply_fan: "Приточный вентилятор",
    extract_fan: "Вытяжной вентилятор",
    target_temp: "Целевая температура",
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
    title: "Alpicair Rekuperators",
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
    tap_hint: "Pieskaries, lai mainītu",
    boost_ends_in: "Paātrinātais režīms beigsies pēc",
    night_cooling: "Nakts dzesēšana",
    fan_speeds: "Ventilatoru ātrumi",
    supply_fan: "Pievada ventilators",
    extract_fan: "Nosūces ventilators",
    target_temp: "Mērķa temperatūra",
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
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 16px;
    box-shadow: var(--rc-shadow);
    box-sizing: border-box;
    overflow: hidden;
  }
`;

/* ----------------------------------------------------------------------- */
/*  Action handling shared by all cards (tap / hold)                       */
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

  el.addEventListener("pointerdown", () => {
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

  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onTap && onTap();
    }
  });
}

/* ----------------------------------------------------------------------- */
/*  Visual editor helpers                                                  */
/*  Home Assistant's own <ha-form> (with its selector types: entity,       */
/*  select, ui_action, text…) is reused here instead of hand-rolling a     */
/*  form, so the editor looks and behaves exactly like HA's built-in ones. */
/* ----------------------------------------------------------------------- */

let _rcHaFormLoading = null;

function rcEnsureHaForm() {
  if (customElements.get("ha-form")) return Promise.resolve();
  if (_rcHaFormLoading) return _rcHaFormLoading;
  _rcHaFormLoading = (async () => {
    try {
      if (typeof window.loadCardHelpers === "function") {
        const helpers = await window.loadCardHelpers();
        if (helpers && helpers.createCardElement) {
          const el = await helpers.createCardElement({ type: "entities", entities: [] });
          if (el && el.constructor && el.constructor.getConfigElement) {
            await el.constructor.getConfigElement();
          }
        }
      }
    } catch (err) {
      console.warn("[alpicair-recuperation-card] could not preload ha-form", err);
    }
  })();
  return _rcHaFormLoading;
}

class RcEditorBase extends HTMLElement {
  setConfig(config) {
    this._config = config || {};
    this._renderWhenReady();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  connectedCallback() {
    this._renderWhenReady();
  }

  _renderWhenReady() {
    if (!this._config) return;
    if (!customElements.get("ha-form")) {
      this.innerHTML = `<div style="padding:12px;font-size:13px;opacity:.7;">Loading editor…</div>`;
      rcEnsureHaForm().then(() => this._renderWhenReady());
      return;
    }
    this._renderForm();
  }

  _renderForm() {
    this.innerHTML = "";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this.formData();
    form.schema = this.formSchema();
    form.computeLabel = (schema) => this.computeLabel(schema);
    form.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = { ...this._config, ...ev.detail.value };
      rcFireEvent(this, "config-changed", { config: this._config });
    });
    this._form = form;
    this.appendChild(form);
  }
}

const RC_LAYOUT_SELECTOR = {
  select: {
    mode: "dropdown",
    options: [
      { value: "square", label: "Square (NSPanel Pro)" },
      { value: "wide", label: "Portrait 9:16 (NSPanel Pro 120)" },
    ],
  },
};

const RC_LANGUAGE_SELECTOR = {
  select: {
    mode: "dropdown",
    options: [
      { value: "auto", label: "Auto (from settings card)" },
      { value: "en", label: "English" },
      { value: "ru", label: "Русский" },
      { value: "lv", label: "Latviešu" },
    ],
  },
};

const RC_THEME_SELECTOR = {
  select: {
    mode: "dropdown",
    options: [
      { value: "auto", label: "Match Home Assistant" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
  },
};

/* ---------------------- editor: ring / mode card ------------------------ */

class AlpicairRecuperationCardEditor extends RcEditorBase {
  formData() {
    return {
      title: this._config.title || "",
      mode_entity: this._config.mode_entity || "",
      fan_speed_entity: this._config.fan_speed_entity || "",
      recuperation_entity: this._config.recuperation_entity || "",
      mode_service: this._config.mode_service || "select.select_option",
      mode_service_data_key: this._config.mode_service_data_key || "option",
      boost_timer_entity: this._config.boost_timer_entity || "",
      mode_map: {
        off: "Off",
        building_protection: "Building protection",
        economy: "Economy",
        comfort: "Comfort",
        boost: "Boost",
        ...(this._config.mode_map || {}),
      },
      settings_tap_action: this._config.settings_tap_action || { action: "none" },
      settings_hold_action: this._config.settings_hold_action || { action: "none" },
      language: this._config.language || "auto",
      theme: this._config.theme || "auto",
      layout: this._config.layout || "square",
    };
  }

  formSchema() {
    return [
      { name: "title", selector: { text: {} } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "mode_entity", selector: { entity: {} } },
          { name: "fan_speed_entity", selector: { entity: { domain: "sensor" } } },
          { name: "recuperation_entity", selector: { entity: { domain: "sensor" } } },
        ],
      },
      {
        type: "expandable",
        name: "mode_service_group",
        title: "Mode switching",
        flatten: true,
        schema: [
          { name: "mode_service", selector: { text: {} } },
          { name: "mode_service_data_key", selector: { text: {} } },
          {
            type: "expandable",
            name: "mode_map",
            title: "Raw option values per mode",
            schema: [
              { name: "off", selector: { text: {} } },
              { name: "building_protection", selector: { text: {} } },
              { name: "economy", selector: { text: {} } },
              { name: "comfort", selector: { text: {} } },
              { name: "boost", selector: { text: {} } },
            ],
          },
        ],
      },
      {
        type: "expandable",
        name: "settings_button_group",
        title: "Settings button behaviour",
        flatten: true,
        schema: [
          { name: "settings_tap_action", selector: { ui_action: {} } },
          { name: "settings_hold_action", selector: { ui_action: {} } },
        ],
      },
      {
        name: "boost_timer_entity",
        selector: { entity: { domain: ["timer", "sensor"] } },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "language", selector: RC_LANGUAGE_SELECTOR },
          { name: "theme", selector: RC_THEME_SELECTOR },
          { name: "layout", selector: RC_LAYOUT_SELECTOR },
        ],
      },
    ];
  }

  computeLabel(schema) {
    const labels = {
      title: "Card title",
      mode_entity: "Mode entity",
      fan_speed_entity: "Fan speed sensor (%)",
      recuperation_entity: "Recuperation sensor (%)",
      mode_service: "Service to call (domain.service)",
      mode_service_data_key: "Service data key for the option",
      mode_map: "Raw option values per mode",
      off: "Off",
      building_protection: "Building protection",
      economy: "Economy",
      comfort: "Comfort",
      boost: "Boost",
      boost_timer_entity: "Boost countdown timer (timer helper recommended)",
      settings_tap_action: "Tap",
      settings_hold_action: "Hold",
      language: "Language",
      theme: "Appearance",
      layout: "Card layout (panel shape)",
    };
    return labels[schema.name] || schema.name;
  }
}

/* --------------------------- editor: sensors card ------------------------ */

class AlpicairRecuperationSensorsCardEditor extends RcEditorBase {
  formData() {
    return {
      temp_indoor_entity: this._config.temp_indoor_entity || "",
      temp_outdoor_entity: this._config.temp_outdoor_entity || "",
      temp_supply_entity: this._config.temp_supply_entity || "",
      target_temp_entity: this._config.target_temp_entity || "",
      target_temp_min: this._config.target_temp_min ?? 15,
      target_temp_max: this._config.target_temp_max ?? 24,
      target_temp_step: this._config.target_temp_step ?? 1,
      language: this._config.language || "auto",
      theme: this._config.theme || "auto",
      layout: this._config.layout || "square",
    };
  }

  formSchema() {
    return [
      {
        type: "grid",
        name: "",
        schema: [
          { name: "temp_indoor_entity", selector: { entity: { domain: "sensor" } } },
          { name: "temp_outdoor_entity", selector: { entity: { domain: "sensor" } } },
          { name: "temp_supply_entity", selector: { entity: { domain: "sensor" } } },
        ],
      },
      {
        type: "expandable",
        name: "target_temp_group",
        title: "Target temperature slider",
        flatten: true,
        schema: [
          { name: "target_temp_entity", selector: { entity: { domain: ["climate", "input_number", "number"] } } },
          {
            type: "grid",
            name: "",
            schema: [
              { name: "target_temp_min", selector: { number: { mode: "box", step: 0.5 } } },
              { name: "target_temp_max", selector: { number: { mode: "box", step: 0.5 } } },
              { name: "target_temp_step", selector: { number: { mode: "box", step: 0.5, min: 0.5 } } },
            ],
          },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "language", selector: RC_LANGUAGE_SELECTOR },
          { name: "theme", selector: RC_THEME_SELECTOR },
          { name: "layout", selector: RC_LAYOUT_SELECTOR },
        ],
      },
    ];
  }

  computeLabel(schema) {
    const labels = {
      temp_indoor_entity: "Indoor temperature sensor",
      temp_outdoor_entity: "Outdoor temperature sensor",
      temp_supply_entity: "Supply air temperature sensor",
      target_temp_entity: "Target temperature entity (climate / input_number / number)",
      target_temp_min: "Min °C",
      target_temp_max: "Max °C",
      target_temp_step: "Step °C",
      language: "Language",
      theme: "Appearance",
      layout: "Card layout (panel shape)",
    };
    return labels[schema.name] || schema.name;
  }
}

/* --------------------------- editor: settings card ----------------------- */

class AlpicairRecuperationCardSettingsEditor extends RcEditorBase {
  formData() {
    return {
      back_tap_action: this._config.back_tap_action || { action: "none" },
      back_hold_action: this._config.back_hold_action || { action: "none" },
      layout: this._config.layout || "square",
    };
  }

  formSchema() {
    return [
      {
        type: "expandable",
        name: "back_button_group",
        title: "Back button behaviour",
        flatten: true,
        schema: [
          { name: "back_tap_action", selector: { ui_action: {} } },
          { name: "back_hold_action", selector: { ui_action: {} } },
        ],
      },
      { name: "layout", selector: RC_LAYOUT_SELECTOR },
    ];
  }

  computeLabel(schema) {
    const labels = {
      back_tap_action: "Tap",
      back_hold_action: "Hold",
      layout: "Card layout (panel shape)",
    };
    return labels[schema.name] || schema.name;
  }
}

/* --------------------- editor: device settings card ---------------------- */

const RC_FAN_MODE_LABELS = {
  building_protection: "Building protection",
  economy: "Economy",
  comfort: "Comfort",
  boost: "Boost",
};

class AlpicairRecuperationDeviceSettingsCardEditor extends RcEditorBase {
  formData() {
    const data = {
      night_cooling_entity: this._config.night_cooling_entity || "",
      fan_speed_min: this._config.fan_speed_min ?? 0,
      fan_speed_max: this._config.fan_speed_max ?? 100,
      fan_speed_step: this._config.fan_speed_step ?? 5,
      language: this._config.language || "auto",
      theme: this._config.theme || "auto",
      layout: this._config.layout || "square",
    };
    RC_ACTIVE_MODES.forEach((mode) => {
      data[`${mode}_supply_entity`] = this._config[`${mode}_supply_entity`] || "";
      data[`${mode}_extract_entity`] = this._config[`${mode}_extract_entity`] || "";
    });
    return data;
  }

  formSchema() {
    const fanDomains = { entity: { domain: ["number", "input_number"] } };
    return [
      { name: "night_cooling_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
      ...RC_ACTIVE_MODES.map((mode) => ({
        type: "expandable",
        name: `${mode}_group`,
        title: RC_FAN_MODE_LABELS[mode],
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "",
            schema: [
              { name: `${mode}_supply_entity`, selector: fanDomains },
              { name: `${mode}_extract_entity`, selector: fanDomains },
            ],
          },
        ],
      })),
      {
        type: "expandable",
        name: "fan_range_group",
        title: "Slider range",
        flatten: true,
        schema: [
          {
            type: "grid",
            name: "",
            schema: [
              { name: "fan_speed_min", selector: { number: { mode: "box", step: 1 } } },
              { name: "fan_speed_max", selector: { number: { mode: "box", step: 1 } } },
              { name: "fan_speed_step", selector: { number: { mode: "box", step: 1, min: 1 } } },
            ],
          },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "language", selector: RC_LANGUAGE_SELECTOR },
          { name: "theme", selector: RC_THEME_SELECTOR },
          { name: "layout", selector: RC_LAYOUT_SELECTOR },
        ],
      },
    ];
  }

  computeLabel(schema) {
    const labels = {
      night_cooling_entity: "Night cooling switch",
      fan_speed_min: "Min %",
      fan_speed_max: "Max %",
      fan_speed_step: "Step %",
      language: "Language",
      theme: "Appearance",
      layout: "Card layout (panel shape)",
    };
    RC_ACTIVE_MODES.forEach((mode) => {
      labels[`${mode}_supply_entity`] = "Supply fan speed entity";
      labels[`${mode}_extract_entity`] = "Extract fan speed entity";
    });
    return labels[schema.name] || schema.name;
  }
}

customElements.define("alpicair-recuperation-card-editor", AlpicairRecuperationCardEditor);
customElements.define("alpicair-recuperation-sensors-card-editor", AlpicairRecuperationSensorsCardEditor);
customElements.define("alpicair-recuperation-card-settings-editor", AlpicairRecuperationCardSettingsEditor);
customElements.define("alpicair-recuperation-device-settings-card-editor", AlpicairRecuperationDeviceSettingsCardEditor);

/* ----------------------------------------------------------------------- */
/*  <alpicair-recuperation-card>  — ring gauge + mode control (square)      */
/* ----------------------------------------------------------------------- */

class AlpicairRecuperationCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("alpicair-recuperation-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:alpicair-recuperation-card",
      mode_entity: "",
      fan_speed_entity: "",
      recuperation_entity: "",
      boost_timer_entity: "",
      settings_tap_action: { action: "navigate", navigation_path: "/recuperator-settings" },
      settings_hold_action: { action: "none" },
      language: "auto",
      theme: "auto",
      layout: "square",
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
      layout: "square",
      ...config,
    };
    this._built = false;
    this._lastActiveMode = null;
    this._countdownInterval = null;
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

  connectedCallback() {
    this._onSettingsChanged = () => this._update();
    window.addEventListener(RC_EVENT_SETTINGS_CHANGED, this._onSettingsChanged);
  }

  disconnectedCallback() {
    window.removeEventListener(RC_EVENT_SETTINGS_CHANGED, this._onSettingsChanged);
    this._stopCountdownTicker();
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

    this.innerHTML = "";
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = RC_STYLES + `
      .rc-card { display: flex; flex-direction: column; }
      .rc-header {
        display: flex; align-items: center; gap: 12px;
        flex: 0 0 auto; margin-bottom: 16px;
      }
      .rc-icon-btn {
        width: 42px; height: 42px; border-radius: 13px;
        display: flex; align-items: center; justify-content: center;
        background: var(--rc-surface-2); cursor: pointer;
        transition: transform var(--rc-transition), background var(--rc-transition);
        outline: none; flex: 0 0 auto;
      }
      .rc-icon-btn:active { transform: scale(0.92); }
      .rc-icon-btn ha-icon { --mdc-icon-size: 21px; color: var(--rc-muted); }
      .rc-icon-btn.rc-power-on ha-icon { color: #4ADE80; }
      .rc-gear:hover { transform: rotate(20deg); }
      .rc-header-text { flex: 1 1 auto; min-width: 0; }
      .rc-title { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
      .rc-status { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--rc-muted); margin-top: 2px; font-weight: 600; }
      .rc-status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--rc-muted); transition: background var(--rc-transition); }
      .rc-status-dot.rc-on { background: #4ADE80; box-shadow: 0 0 0 3px rgba(74,222,128,0.18); }

      .rc-bars { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
      .rc-bar-row { display: flex; flex-direction: column; gap: 6px; }
      .rc-bar-top { display: flex; align-items: baseline; justify-content: space-between; }
      .rc-bar-label { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--rc-muted); font-weight: 600; }
      .rc-bar-dot { width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; }
      .rc-bar-value { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rc-text); }
      .rc-bar-track { position: relative; width: 100%; height: 14px; border-radius: 999px; background: var(--rc-surface-2); overflow: hidden; }
      .rc-bar-fill { position: absolute; inset: 0 auto 0 0; height: 100%; width: 0%; border-radius: 999px; transition: width 420ms cubic-bezier(.4,0,.2,1); }
      .rc-bar-fill.rc-bar-warm { background: linear-gradient(90deg, var(--rc-accent-warm), #FBCB8A); }
      .rc-bar-fill.rc-bar-cool { background: linear-gradient(90deg, var(--rc-accent-cool), #8BE7DD); }
      .rc-bar-fill.rc-breathing { animation: rc-bar-pulse 2.4s ease-in-out infinite; }
      @keyframes rc-bar-pulse { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }

      .rc-modes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .rc-mode-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 14px 8px; border-radius: 14px; background: var(--rc-surface);
        border: 1px solid var(--rc-border); cursor: pointer;
        transition: box-shadow var(--rc-transition), border-color var(--rc-transition), transform 120ms;
        outline: none;
      }
      .rc-mode-btn:active { transform: scale(0.96); }
      .rc-mode-btn ha-icon { --mdc-icon-size: 22px; color: var(--rc-muted); }
      .rc-mode-btn span { font-size: 13px; color: var(--rc-muted); font-weight: 600; text-align: center; }
      .rc-mode-btn.active { border-color: var(--rc-accent); box-shadow: 0 0 0 1px var(--rc-accent), 0 6px 16px -6px var(--rc-accent); }
      .rc-mode-btn.active ha-icon, .rc-mode-btn.active span { color: var(--rc-accent); }

      .rc-countdown {
        display: none; align-items: center; gap: 10px; margin-top: 14px;
        padding: 12px 14px; border-radius: 14px; background: var(--rc-surface);
        border: 1px solid var(--rc-accent-warm);
      }
      .rc-countdown.rc-show { display: flex; }
      .rc-countdown ha-icon { --mdc-icon-size: 20px; color: #F4587E; flex: 0 0 auto; }
      .rc-countdown-text { flex: 1 1 auto; min-width: 0; font-size: 12.5px; color: var(--rc-muted); font-weight: 600; }
      .rc-countdown-value { font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rc-text); flex: 0 0 auto; }

      /* --- Layout: wide (Sonoff NSPanel Pro 120, portrait 9:16 screen) ---- */
      :host([data-rc-layout="wide"]) .rc-card {
        aspect-ratio: 9 / 16; max-width: 340px; width: 100%; box-sizing: border-box; padding: 18px 16px;
      }
      :host([data-rc-layout="wide"]) .rc-header { margin-bottom: 12px; }
      :host([data-rc-layout="wide"]) .rc-bars { margin-bottom: 14px; }
      :host([data-rc-layout="wide"]) .rc-mode-btn { padding: 11px 6px; }
    `;

    const card = document.createElement("div");
    card.className = "rc-card";
    card.innerHTML = `
      <div class="rc-header">
        <div class="rc-icon-btn" id="rc-power" tabindex="0" role="button" aria-label="power">
          <ha-icon icon="mdi:power"></ha-icon>
        </div>
        <div class="rc-header-text">
          <div class="rc-title" id="rc-title"></div>
          <div class="rc-status">
            <span class="rc-status-dot" id="rc-status-dot"></span>
            <span id="rc-status-text"></span>
          </div>
        </div>
        <div class="rc-icon-btn rc-gear" id="rc-gear" tabindex="0" role="button" aria-label="settings">
          <ha-icon icon="mdi:cog-outline"></ha-icon>
        </div>
      </div>

      <div class="rc-bars">
        <div class="rc-bar-row">
          <div class="rc-bar-top">
            <div class="rc-bar-label">
              <span class="rc-bar-dot" style="background: var(--rc-accent-warm)"></span>
              <span id="rc-recup-label"></span>
            </div>
            <span class="rc-bar-value" id="rc-recup-value">–</span>
          </div>
          <div class="rc-bar-track"><div class="rc-bar-fill rc-bar-warm" id="rc-bar-recup"></div></div>
        </div>
        <div class="rc-bar-row">
          <div class="rc-bar-top">
            <div class="rc-bar-label">
              <span class="rc-bar-dot" style="background: var(--rc-accent-cool)"></span>
              <span id="rc-fan-label"></span>
            </div>
            <span class="rc-bar-value" id="rc-fan-value">–</span>
          </div>
          <div class="rc-bar-track"><div class="rc-bar-fill rc-bar-cool" id="rc-bar-fan"></div></div>
        </div>
      </div>

      <div class="rc-modes" id="rc-modes"></div>

      <div class="rc-countdown" id="rc-countdown">
        <ha-icon icon="mdi:timer-sand"></ha-icon>
        <span class="rc-countdown-text" id="rc-countdown-text"></span>
        <span class="rc-countdown-value" id="rc-countdown-value">–</span>
      </div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._els = {
      title: card.querySelector("#rc-title"),
      power: card.querySelector("#rc-power"),
      gear: card.querySelector("#rc-gear"),
      statusDot: card.querySelector("#rc-status-dot"),
      statusText: card.querySelector("#rc-status-text"),
      recupLabel: card.querySelector("#rc-recup-label"),
      recupValue: card.querySelector("#rc-recup-value"),
      fanLabel: card.querySelector("#rc-fan-label"),
      fanValue: card.querySelector("#rc-fan-value"),
      barRecup: card.querySelector("#rc-bar-recup"),
      barFan: card.querySelector("#rc-bar-fan"),
      modes: card.querySelector("#rc-modes"),
      countdown: card.querySelector("#rc-countdown"),
      countdownText: card.querySelector("#rc-countdown-text"),
      countdownValue: card.querySelector("#rc-countdown-value"),
    };

    rcBindPressActions(this._els.gear, {
      onTap: () => rcHandleAction(this, this._hass, this._config.settings_tap_action),
      onHold: () => rcHandleAction(this, this._hass, this._config.settings_hold_action),
    });

    this._els.power.addEventListener("click", () => this._toggleOff());
    this._els.power.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._toggleOff();
      }
    });
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

  _setModeKey(key) {
    if (!this._hass || !this._config.mode_entity) return;
    const raw = this._config.mode_map[key];
    if (raw === undefined) return;
    const stateObj = this._hass.states[this._config.mode_entity];
    const options = stateObj && stateObj.attributes && stateObj.attributes.options;
    if (Array.isArray(options) && !options.includes(raw)) {
      console.warn(
        `[alpicair-recuperation-card] mode_map.${key} = "${raw}" is not a valid option for ` +
        `${this._config.mode_entity}. Valid options are: ${options.join(", ")}`
      );
      return;
    }
    const [domain, service] = this._config.mode_service.split(".");
    const dataKey = this._config.mode_service_data_key;
    this._hass.callService(domain, service, {
      entity_id: this._config.mode_entity,
      [dataKey]: raw,
    });
  }

  /**
   * Only offer modes that actually exist on the target entity. For
   * `select`/`input_select` entities Home Assistant exposes the valid
   * choices as the `options` attribute — if present, any RC_ACTIVE_MODES
   * entry whose mapped raw value isn't in that list is hidden instead of
   * being offered as a (invalid, silently rejected) button.
   */
  _availableActiveModes() {
    if (!this._hass || !this._config.mode_entity) return RC_ACTIVE_MODES;
    const stateObj = this._hass.states[this._config.mode_entity];
    const options = stateObj && stateObj.attributes && stateObj.attributes.options;
    if (!Array.isArray(options)) return RC_ACTIVE_MODES;
    const available = RC_ACTIVE_MODES.filter((key) => options.includes(this._config.mode_map[key]));
    return available.length ? available : RC_ACTIVE_MODES;
  }

  /** Header power icon: dedicated off / restore-last-mode toggle. */
  _toggleOff() {
    const current = this._currentModeKey();
    const active = this._availableActiveModes();
    if (current && current !== "off") {
      this._lastActiveMode = current;
      this._setModeKey("off");
    } else {
      const restore = active.includes(this._lastActiveMode) ? this._lastActiveMode : active[0];
      this._setModeKey(restore);
    }
  }

  _readNumberState(entityId) {
    if (!this._hass || !entityId) return null;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return null;
    return { value: rcClampPercent(stateObj.state) };
  }

  /* ------------------------- boost countdown ------------------------- */

  _stopCountdownTicker() {
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
  }

  _startCountdownTicker() {
    if (this._countdownInterval) return;
    this._countdownInterval = setInterval(() => this._renderCountdown(), 1000);
  }

  _parseHms(str) {
    const parts = String(str).split(":").map(Number);
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0];
  }

  _formatMmSs(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
  }

  _renderCountdown() {
    if (!this._els) return;
    const entityId = this._config.boost_timer_entity;
    const modeKey = this._currentModeKey();

    if (!entityId || !this._hass || modeKey !== "boost") {
      this._els.countdown.classList.remove("rc-show");
      this._stopCountdownTicker();
      return;
    }

    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      this._els.countdown.classList.remove("rc-show");
      this._stopCountdownTicker();
      return;
    }

    const domain = entityId.split(".")[0];
    let secondsLeft = null;

    if (domain === "timer") {
      if (stateObj.state !== "active") {
        this._els.countdown.classList.remove("rc-show");
        this._stopCountdownTicker();
        return;
      }
      const finishesAt = stateObj.attributes.finishes_at;
      if (finishesAt) {
        secondsLeft = Math.max(0, Math.round((new Date(finishesAt).getTime() - Date.now()) / 1000));
        this._startCountdownTicker();
      } else if (stateObj.attributes.remaining) {
        secondsLeft = this._parseHms(stateObj.attributes.remaining);
        this._stopCountdownTicker();
      }
    } else {
      const n = Number(stateObj.state);
      secondsLeft = Number.isNaN(n) ? null : n;
      this._stopCountdownTicker();
    }

    if (secondsLeft === null) {
      this._els.countdown.classList.remove("rc-show");
      return;
    }

    this._els.countdown.classList.add("rc-show");
    this._els.countdownText.textContent = this._t("boost_ends_in");
    this._els.countdownValue.textContent = this._formatMmSs(secondsLeft);
  }

  _update() {
    if (!this._hass || !this._els) return;
    const lang = this._lang();
    const themeMode = this._themeMode();
    this.setAttribute("data-rc-theme", themeMode);
    this.setAttribute("data-rc-layout", this._config.layout === "wide" ? "wide" : "square");

    const modeKey = this._currentModeKey() || "off";
    const running = modeKey !== "off";
    if (running) this._lastActiveMode = modeKey;

    this._els.title.textContent = this._config.title || this._t("title");
    this._els.power.classList.toggle("rc-power-on", running);
    this._els.statusDot.classList.toggle("rc-on", running);
    this._els.statusText.textContent = `${this._t(modeKey)} · ${running ? this._t("running") : this._t("stopped")}`;

    const fan = this._readNumberState(this._config.fan_speed_entity);
    const recup = this._readNumberState(this._config.recuperation_entity);

    this._els.recupLabel.textContent = this._t("recuperation");
    this._els.fanLabel.textContent = this._t("fan_speed");
    this._els.recupValue.textContent = recup && recup.value !== null ? `${Math.round(recup.value)}%` : "–";
    this._els.fanValue.textContent = fan && fan.value !== null ? `${Math.round(fan.value)}%` : "–";

    const recupPct = recup && recup.value !== null ? recup.value : 0;
    const fanPct = fan && fan.value !== null ? fan.value : 0;
    this._els.barRecup.style.width = `${recupPct}%`;
    this._els.barFan.style.width = `${fanPct}%`;
    this._els.barRecup.classList.toggle("rc-breathing", running);
    this._els.barFan.classList.toggle("rc-breathing", running);

    // mode buttons (rebuild only when the language changes)
    const active = this._availableActiveModes();
    const modeSignature = `${lang}:${active.join(",")}`;
    if (this._els.modes.dataset.sig !== modeSignature) {
      this._els.modes.dataset.sig = modeSignature;
      this._els.modes.innerHTML = "";
      active.forEach((key) => {
        const btn = document.createElement("div");
        btn.className = "rc-mode-btn";
        btn.tabIndex = 0;
        btn.setAttribute("role", "button");
        btn.dataset.mode = key;
        btn.style.setProperty("--rc-accent", RC_MODE_META[key].accent);
        btn.innerHTML = `<ha-icon icon="${RC_MODE_META[key].icon}"></ha-icon><span>${rcT(lang, key)}</span>`;
        btn.addEventListener("click", () => this._setModeKey(key));
        btn.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this._setModeKey(key);
          }
        });
        this._els.modes.appendChild(btn);
      });
    }
    [...this._els.modes.children].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === modeKey);
    });

    this._renderCountdown();
  }
}


/* ----------------------------------------------------------------------- */
/*  <alpicair-recuperation-sensors-card> — temperatures + target temp       */
/*  (square, no header, no mode buttons — mode is controlled on the ring   */
/*  card)                                                                   */
/* ----------------------------------------------------------------------- */

class AlpicairRecuperationSensorsCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("alpicair-recuperation-sensors-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:alpicair-recuperation-sensors-card",
      temp_indoor_entity: "",
      temp_outdoor_entity: "",
      temp_supply_entity: "",
      target_temp_entity: "",
      target_temp_min: 15,
      target_temp_max: 24,
      target_temp_step: 1,
      language: "auto",
      theme: "auto",
      layout: "square",
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      language: "auto",
      theme: "auto",
      layout: "square",
      target_temp_min: 15,
      target_temp_max: 24,
      target_temp_step: 1,
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
    return 4;
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

    this.innerHTML = "";
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = RC_STYLES + `
      .rc-card { aspect-ratio: 1 / 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; }

      .rc-stats { display: flex; flex-direction: column; gap: 8px; }
      .rc-stat {
        background: var(--rc-surface); border-radius: 14px; padding: 12px 16px;
        display: flex; align-items: center; justify-content: space-between;
        border: 1px solid var(--rc-border);
      }
      .rc-stat-label { font-size: 13px; color: var(--rc-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .03em; }
      .rc-stat-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }

      .rc-temp-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
      .rc-temp-label { font-size: 13px; color: var(--rc-muted); font-weight: 600; }
      .rc-temp-value { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rc-text); }
      .rc-temp-slider {
        -webkit-appearance: none; appearance: none; width: 100%; height: 32px;
        background: transparent; margin: 0; cursor: pointer;
      }
      .rc-temp-slider::-webkit-slider-runnable-track {
        height: 12px; border-radius: 999px;
        background: linear-gradient(90deg, var(--rc-accent-cool), var(--rc-accent-warm));
      }
      .rc-temp-slider::-webkit-slider-thumb {
        -webkit-appearance: none; width: 30px; height: 30px; border-radius: 50%;
        background: #ffffff; border: 3px solid var(--rc-accent-warm);
        box-shadow: 0 2px 10px rgba(0,0,0,0.28); margin-top: -9px; cursor: pointer;
      }
      .rc-temp-slider::-moz-range-track {
        height: 12px; border-radius: 999px;
        background: linear-gradient(90deg, var(--rc-accent-cool), var(--rc-accent-warm));
      }
      .rc-temp-slider::-moz-range-thumb {
        width: 30px; height: 30px; border-radius: 50%;
        background: #ffffff; border: 3px solid var(--rc-accent-warm);
        box-shadow: 0 2px 10px rgba(0,0,0,0.28); cursor: pointer;
      }
      .rc-temp-minmax { display: flex; justify-content: space-between; margin-top: 4px; font-size: 11px; color: var(--rc-muted); }

      /* --- Layout: wide (Sonoff NSPanel Pro 120, portrait 9:16 screen) ---- */
      :host([data-rc-layout="wide"]) .rc-card {
        aspect-ratio: 9 / 16; max-width: 340px; width: 100%; box-sizing: border-box; padding: 18px 16px;
      }
    `;

    const card = document.createElement("div");
    card.className = "rc-card";
    card.innerHTML = `
      <div class="rc-stats" id="rc-stats"></div>

      <div class="rc-temp-row" id="rc-temp-row" style="display:none;">
        <div class="rc-temp-top">
          <span class="rc-temp-label" id="rc-temp-label"></span>
          <span class="rc-temp-value" id="rc-temp-value">–</span>
        </div>
        <input type="range" class="rc-temp-slider" id="rc-temp-slider" min="15" max="24" step="1" />
        <div class="rc-temp-minmax">
          <span id="rc-temp-min-label"></span>
          <span id="rc-temp-max-label"></span>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._els = {
      stats: card.querySelector("#rc-stats"),
      tempRow: card.querySelector("#rc-temp-row"),
      tempLabel: card.querySelector("#rc-temp-label"),
      tempValue: card.querySelector("#rc-temp-value"),
      tempSlider: card.querySelector("#rc-temp-slider"),
      tempMinLabel: card.querySelector("#rc-temp-min-label"),
      tempMaxLabel: card.querySelector("#rc-temp-max-label"),
    };

    this._els.tempSlider.addEventListener("input", () => {
      this._els.tempValue.textContent = `${this._els.tempSlider.value}°`;
    });
    this._els.tempSlider.addEventListener("change", () => {
      this._setTargetTemp(Number(this._els.tempSlider.value));
    });
  }

  _readTargetTemp() {
    const entityId = this._config.target_temp_entity;
    if (!this._hass || !entityId) return null;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return null;
    const domain = entityId.split(".")[0];
    if (domain === "climate") {
      const t = stateObj.attributes && stateObj.attributes.temperature;
      return t === undefined || t === null ? null : Number(t);
    }
    const n = Number(stateObj.state);
    return Number.isNaN(n) ? null : n;
  }

  _setTargetTemp(value) {
    const entityId = this._config.target_temp_entity;
    if (!this._hass || !entityId) return;
    const domain = entityId.split(".")[0];
    if (this._config.target_temp_service) {
      const [svcDomain, svcService] = this._config.target_temp_service.split(".");
      const dataKey = this._config.target_temp_service_data_key || "value";
      this._hass.callService(svcDomain, svcService, {
        entity_id: entityId,
        [dataKey]: value,
      });
      return;
    }
    if (domain === "climate") {
      this._hass.callService("climate", "set_temperature", {
        entity_id: entityId,
        temperature: value,
      });
    } else if (domain === "number") {
      this._hass.callService("number", "set_value", {
        entity_id: entityId,
        value,
      });
    } else {
      this._hass.callService("input_number", "set_value", {
        entity_id: entityId,
        value,
      });
    }
  }

  _update() {
    if (!this._hass || !this._els) return;
    const themeMode = this._themeMode();
    this.setAttribute("data-rc-theme", themeMode);
    this.setAttribute("data-rc-layout", this._config.layout === "wide" ? "wide" : "square");

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
        <span class="rc-stat-label">${this._t(def.key)}</span>
        <span class="rc-stat-value">${value !== null && value !== undefined ? `${value}${unit}` : "–"}</span>
      `;
      this._els.stats.appendChild(el);
    });

    if (this._config.target_temp_entity) {
      this._els.tempRow.style.display = "";
      this._els.tempLabel.textContent = this._config.target_temp_label || this._t("target_temp");
      this._els.tempSlider.min = this._config.target_temp_min;
      this._els.tempSlider.max = this._config.target_temp_max;
      this._els.tempSlider.step = this._config.target_temp_step;
      this._els.tempMinLabel.textContent = `${this._config.target_temp_min}°`;
      this._els.tempMaxLabel.textContent = `${this._config.target_temp_max}°`;
      const current = this._readTargetTemp();
      if (
        this.shadowRoot.activeElement !== this._els.tempSlider &&
        current !== null &&
        Number(this._els.tempSlider.value) !== current
      ) {
        this._els.tempSlider.value = current;
      }
      this._els.tempValue.textContent = current !== null ? `${this._els.tempSlider.value}°` : "–";
    } else {
      this._els.tempRow.style.display = "none";
    }
  }
}

/* ----------------------------------------------------------------------- */
/*  <alpicair-recuperation-card-settings>                                   */
/* ----------------------------------------------------------------------- */

class AlpicairRecuperationCardSettings extends HTMLElement {
  static getConfigElement() {
    return document.createElement("alpicair-recuperation-card-settings-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:alpicair-recuperation-card-settings",
      back_tap_action: { action: "navigate", navigation_path: "/lovelace/0" },
      back_hold_action: { action: "none" },
      layout: "square",
    };
  }

  setConfig(config) {
    this._config = { layout: "square", ...config };
    this._built = false;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._built) this._render();
    this._update();
  }

  getCardSize() {
    return this._config && this._config.layout === "wide" ? 3 : 4;
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
      .rc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
      .rc-back {
        width: 46px; height: 46px; border-radius: 14px; display: flex;
        align-items: center; justify-content: center; background: var(--rc-surface-2);
        cursor: pointer; outline: none; transition: transform 120ms;
      }
      .rc-back:active { transform: scale(0.92); }
      .rc-back ha-icon { --mdc-icon-size: 24px; color: var(--rc-muted); }
      .rc-title { font-size: 19px; font-weight: 700; }

      .rc-sections { display: flex; flex-direction: column; gap: 18px; }
      .rc-section-label {
        font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
        color: var(--rc-muted); margin-bottom: 9px;
      }
      .rc-pill-row { display: flex; gap: 9px; flex-wrap: wrap; }
      .rc-pill {
        padding: 12px 18px; border-radius: 999px; background: var(--rc-surface);
        border: 1px solid var(--rc-border); font-size: 15px; font-weight: 600;
        color: var(--rc-muted); cursor: pointer; transition: all var(--rc-transition);
        outline: none;
      }
      .rc-pill.active {
        color: white; background: linear-gradient(135deg, var(--rc-accent-cool), var(--rc-accent-warm));
        border-color: transparent;
      }
      .rc-note { font-size: 12px; color: var(--rc-muted); margin-top: 12px; line-height: 1.55; }

      :host([data-rc-layout="wide"]) .rc-card { padding: 14px 20px; }
      :host([data-rc-layout="wide"]) .rc-header { margin-bottom: 12px; }
      :host([data-rc-layout="wide"]) .rc-note { margin-top: 10px; }
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

      <div class="rc-sections">
        <div class="rc-section">
          <div class="rc-section-label" id="rc-lang-label"></div>
          <div class="rc-pill-row" id="rc-lang-row"></div>
        </div>

        <div class="rc-section">
          <div class="rc-section-label" id="rc-theme-label"></div>
          <div class="rc-pill-row" id="rc-theme-row"></div>
        </div>
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
    this.setAttribute("data-rc-layout", this._config.layout === "wide" ? "wide" : "square");

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

/* ----------------------------------------------------------------------- */
/*  <alpicair-recuperation-device-settings-card>                            */
/*  Night cooling toggle + 8 fan speed sliders (supply/extract × 4 modes)   */
/* ----------------------------------------------------------------------- */

class AlpicairRecuperationDeviceSettingsCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("alpicair-recuperation-device-settings-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:alpicair-recuperation-device-settings-card",
      night_cooling_entity: "",
      fan_speed_min: 0,
      fan_speed_max: 100,
      fan_speed_step: 5,
      language: "auto",
      theme: "auto",
      layout: "square",
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = {
      language: "auto",
      theme: "auto",
      layout: "square",
      fan_speed_min: 0,
      fan_speed_max: 100,
      fan_speed_step: 5,
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
    return 8;
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

    this.innerHTML = "";
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = RC_STYLES + `
      .rc-card { display: flex; flex-direction: column; gap: 18px; }

      .rc-toggle-row {
        display: flex; align-items: center; gap: 12px; padding: 14px 16px;
        border-radius: 14px; background: var(--rc-surface); border: 1px solid var(--rc-border);
        cursor: pointer; outline: none; transition: border-color var(--rc-transition);
      }
      .rc-toggle-row.rc-on { border-color: var(--rc-accent-cool); }
      .rc-toggle-icon {
        width: 38px; height: 38px; border-radius: 12px; flex: 0 0 auto;
        display: flex; align-items: center; justify-content: center;
        background: var(--rc-surface-2);
      }
      .rc-toggle-row.rc-on .rc-toggle-icon { background: var(--rc-accent-cool); }
      .rc-toggle-icon ha-icon { --mdc-icon-size: 20px; color: var(--rc-muted); }
      .rc-toggle-row.rc-on .rc-toggle-icon ha-icon { color: #0B2521; }
      .rc-toggle-label { flex: 1 1 auto; font-size: 15px; font-weight: 600; }
      .rc-toggle-switch {
        width: 46px; height: 27px; border-radius: 999px; background: var(--rc-surface-2);
        position: relative; flex: 0 0 auto; transition: background var(--rc-transition);
      }
      .rc-toggle-row.rc-on .rc-toggle-switch { background: var(--rc-accent-cool); }
      .rc-toggle-switch::after {
        content: ""; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px;
        border-radius: 50%; background: #fff; transition: transform var(--rc-transition);
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }
      .rc-toggle-row.rc-on .rc-toggle-switch::after { transform: translateX(19px); }

      .rc-mode-section { display: flex; flex-direction: column; gap: 10px; }
      .rc-mode-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: var(--rc-text); }
      .rc-mode-title ha-icon { --mdc-icon-size: 17px; }
      .rc-fan-slider { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; }
      .rc-fan-top { display: flex; justify-content: space-between; align-items: baseline; }
      .rc-fan-label { font-size: 12.5px; color: var(--rc-muted); font-weight: 600; }
      .rc-fan-value { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--rc-text); }
      .rc-fan-input {
        -webkit-appearance: none; appearance: none; width: 100%; height: 26px;
        background: transparent; margin: 0; cursor: pointer;
      }
      .rc-fan-input::-webkit-slider-runnable-track {
        height: 9px; border-radius: 999px; background: var(--rc-surface-2);
      }
      .rc-fan-input.rc-fan-supply::-webkit-slider-runnable-track { background: linear-gradient(90deg, var(--rc-surface-2), var(--rc-accent-cool)); }
      .rc-fan-input.rc-fan-extract::-webkit-slider-runnable-track { background: linear-gradient(90deg, var(--rc-surface-2), var(--rc-accent-warm)); }
      .rc-fan-input::-webkit-slider-thumb {
        -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
        background: #fff; border: 3px solid var(--rc-accent-cool); margin-top: -7px; cursor: pointer;
        box-shadow: 0 1px 6px rgba(0,0,0,0.25);
      }
      .rc-fan-input.rc-fan-extract::-webkit-slider-thumb { border-color: var(--rc-accent-warm); }
      .rc-fan-input::-moz-range-track { height: 9px; border-radius: 999px; background: var(--rc-surface-2); }
      .rc-fan-input::-moz-range-thumb {
        width: 22px; height: 22px; border-radius: 50%; background: #fff;
        border: 3px solid var(--rc-accent-cool); cursor: pointer; box-shadow: 0 1px 6px rgba(0,0,0,0.25);
      }
      .rc-fan-input.rc-fan-extract::-moz-range-thumb { border-color: var(--rc-accent-warm); }

      .rc-mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 20px; }

      /* --- Layout: wide (Sonoff NSPanel Pro 120, portrait 9:16 screen) ---- */
      :host([data-rc-layout="wide"]) .rc-mode-grid { grid-template-columns: 1fr; }
    `;

    const card = document.createElement("div");
    card.className = "rc-card";
    card.innerHTML = `
      <div class="rc-toggle-row" id="rc-night-cooling" tabindex="0" role="switch" aria-label="night cooling">
        <div class="rc-toggle-icon"><ha-icon icon="mdi:weather-night"></ha-icon></div>
        <div class="rc-toggle-label" id="rc-night-cooling-label"></div>
        <div class="rc-toggle-switch"></div>
      </div>

      <div class="rc-mode-grid" id="rc-mode-grid"></div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(card);

    this._els = {
      nightCooling: card.querySelector("#rc-night-cooling"),
      nightCoolingLabel: card.querySelector("#rc-night-cooling-label"),
      modeGrid: card.querySelector("#rc-mode-grid"),
    };

    this._els.nightCooling.addEventListener("click", () => this._toggleNightCooling());
    this._els.nightCooling.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        this._toggleNightCooling();
      }
    });
  }

  _toggleNightCooling() {
    const entityId = this._config.night_cooling_entity;
    if (!this._hass || !entityId) return;
    const domain = entityId.split(".")[0];
    this._hass.callService(domain, "toggle", { entity_id: entityId });
  }

  _setFanSpeed(entityId, value) {
    if (!this._hass || !entityId) return;
    const domain = entityId.split(".")[0];
    if (domain === "number") {
      this._hass.callService("number", "set_value", { entity_id: entityId, value });
    } else {
      this._hass.callService("input_number", "set_value", { entity_id: entityId, value });
    }
  }

  _readValue(entityId) {
    if (!this._hass || !entityId) return null;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) return null;
    const n = Number(stateObj.state);
    return Number.isNaN(n) ? null : n;
  }

  _buildModeGrid() {
    const lang = this._lang();
    this._els.modeGrid.dataset.lang = lang;
    this._els.modeGrid.innerHTML = "";
    this._fanInputs = {};

    RC_ACTIVE_MODES.forEach((mode) => {
      const section = document.createElement("div");
      section.className = "rc-mode-section";

      const title = document.createElement("div");
      title.className = "rc-mode-title";
      title.innerHTML = `<ha-icon icon="${RC_MODE_META[mode].icon}" style="color:${RC_MODE_META[mode].accent}"></ha-icon><span>${rcT(lang, mode)}</span>`;
      section.appendChild(title);

      [
        { kind: "supply", labelKey: "supply_fan", cls: "rc-fan-supply" },
        { kind: "extract", labelKey: "extract_fan", cls: "rc-fan-extract" },
      ].forEach(({ kind, labelKey, cls }) => {
        const entityKey = `${mode}_${kind}_entity`;
        const wrap = document.createElement("div");
        wrap.className = "rc-fan-slider";
        wrap.innerHTML = `
          <div class="rc-fan-top">
            <span class="rc-fan-label">${rcT(lang, labelKey)}</span>
            <span class="rc-fan-value" data-value-for="${entityKey}">–</span>
          </div>
          <input type="range" class="rc-fan-input ${cls}" data-entity-key="${entityKey}"
                 min="${this._config.fan_speed_min}" max="${this._config.fan_speed_max}" step="${this._config.fan_speed_step}" />
        `;
        const input = wrap.querySelector("input");
        const valueEl = wrap.querySelector(`[data-value-for="${entityKey}"]`);
        this._fanInputs[entityKey] = { input, valueEl };

        input.addEventListener("input", () => {
          valueEl.textContent = `${input.value}%`;
        });
        input.addEventListener("change", () => {
          this._setFanSpeed(this._config[entityKey], Number(input.value));
        });

        section.appendChild(wrap);
      });

      this._els.modeGrid.appendChild(section);
    });
  }

  _update() {
    if (!this._hass || !this._els) return;
    const lang = this._lang();
    const themeMode = this._themeMode();
    this.setAttribute("data-rc-theme", themeMode);
    this.setAttribute("data-rc-layout", this._config.layout === "wide" ? "wide" : "square");

    this._els.nightCoolingLabel.textContent = this._t("night_cooling");
    const ncEntity = this._config.night_cooling_entity;
    const ncOn = ncEntity && this._hass.states[ncEntity] && this._hass.states[ncEntity].state === "on";
    this._els.nightCooling.classList.toggle("rc-on", !!ncOn);

    if (this._els.modeGrid.dataset.lang !== lang) {
      this._buildModeGrid();
    }

    RC_ACTIVE_MODES.forEach((mode) => {
      ["supply", "extract"].forEach((kind) => {
        const entityKey = `${mode}_${kind}_entity`;
        const entityId = this._config[entityKey];
        const refs = this._fanInputs && this._fanInputs[entityKey];
        if (!refs) return;
        refs.input.min = this._config.fan_speed_min;
        refs.input.max = this._config.fan_speed_max;
        refs.input.step = this._config.fan_speed_step;
        const value = this._readValue(entityId);
        if (
          this.shadowRoot.activeElement !== refs.input &&
          value !== null &&
          Number(refs.input.value) !== value
        ) {
          refs.input.value = value;
        }
        refs.valueEl.textContent = value !== null ? `${refs.input.value}%` : "–";
      });
    });
  }
}


customElements.define("alpicair-recuperation-card", AlpicairRecuperationCard);
customElements.define("alpicair-recuperation-sensors-card", AlpicairRecuperationSensorsCard);
customElements.define("alpicair-recuperation-card-settings", AlpicairRecuperationCardSettings);
customElements.define("alpicair-recuperation-device-settings-card", AlpicairRecuperationDeviceSettingsCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alpicair-recuperation-card",
  name: "Alpicair Recuperation — Main",
  description: "Square card for an Alpicair recuperator: recuperation % / fan speed % bars, mode buttons, boost countdown.",
  preview: false,
});
window.customCards.push({
  type: "alpicair-recuperation-sensors-card",
  name: "Alpicair Recuperation — Sensors",
  description: "Square card with temperatures and a 15-24°C target temperature slider.",
  preview: false,
});
window.customCards.push({
  type: "alpicair-recuperation-card-settings",
  name: "Alpicair Recuperation — Settings",
  description: "Dedicated settings screen for the Alpicair Recuperation cards: language, theme, back button behaviour.",
  preview: false,
});
window.customCards.push({
  type: "alpicair-recuperation-device-settings-card",
  name: "Alpicair Recuperation — Device settings",
  description: "Night cooling toggle and 8 fan speed sliders (supply/extract × 4 modes).",
  preview: false,
});

console.info(
  "%c ALPICAIR-RECUPERATION-CARD %c registered ",
  "background:#131B29;color:#4FD1C5;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "background:#223154;color:#E8EEF5;padding:2px 6px;border-radius:0 4px 4px 0;"
);
