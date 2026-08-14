/*!
 * Recuperator Card v1.0.0
 * A modern, custom Lovelace card for controlling and monitoring a home
 * heat-recovery ventilation unit (HRV/ERV) in Home Assistant.
 *
 * Two custom elements are registered:
 *  - <recuperator-card>            main control card
 *  - <recuperator-settings-card>   companion settings page card
 *
 * https://github.com/YOUR_GITHUB_USER/ha-recuperator-card
 * License: MIT
 */
(() => {
  // ---------------------------------------------------------------------
  // Reuse Home Assistant's own bundled LitElement instead of shipping one.
  // ---------------------------------------------------------------------
  const LitElementBase = Object.getPrototypeOf(
    customElements.get('ha-panel-lovelace') || customElements.get('hui-view') || customElements.get('hui-masonry-view')
  );
  const { html, css, LitElement } = {
    html: LitElementBase.prototype.html,
    css: LitElementBase.prototype.css,
    LitElement: LitElementBase,
  };

  // ---------------------------------------------------------------------
  // Translations
  // ---------------------------------------------------------------------
  const STRINGS = {
    en: {
      modes: {
        off: 'Off',
        building_protection: 'Building protection',
        economy: 'Economy',
        comfort: 'Comfort',
        boost: 'Boost',
      },
      fan_speed: 'Fan speed',
      recovery: 'Heat recovery',
      outdoor: 'Outdoor',
      supply: 'Supply',
      indoor: 'Indoor',
      settings: 'Settings',
      back: 'Back',
      language: 'Language',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      auto: 'Auto',
      unavailable: 'Unavailable',
      display: 'Display',
      navigation: 'Navigation',
    },
    ru: {
      modes: {
        off: 'Выключено',
        building_protection: 'Защита здания',
        economy: 'Экономия',
        comfort: 'Комфорт',
        boost: 'Ускоренный',
      },
      fan_speed: 'Скорость вентилятора',
      recovery: 'Рекуперация',
      outdoor: 'Улица',
      supply: 'Приток',
      indoor: 'Вытяжка',
      settings: 'Настройки',
      back: 'Назад',
      language: 'Язык',
      theme: 'Тема',
      light: 'Светлая',
      dark: 'Тёмная',
      auto: 'Авто',
      unavailable: 'Нет данных',
      display: 'Отображение',
      navigation: 'Навигация',
    },
    lv: {
      modes: {
        off: 'Izslēgts',
        building_protection: 'Ēkas aizsardzība',
        economy: 'Ekonomiskais',
        comfort: 'Komforts',
        boost: 'Paātrināts',
      },
      fan_speed: 'Ventilatora ātrums',
      recovery: 'Rekuperācija',
      outdoor: 'Āra',
      supply: 'Pieplūde',
      indoor: 'Nosūce',
      settings: 'Iestatījumi',
      back: 'Atpakaļ',
      language: 'Valoda',
      theme: 'Tēma',
      light: 'Gaišs',
      dark: 'Tumšs',
      auto: 'Auto',
      unavailable: 'Nav pieejams',
      display: 'Attēlojums',
      navigation: 'Navigācija',
    },
  };

  function translate(lang, key) {
    const dict = STRINGS[lang] || STRINGS.en;
    return key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict) || key;
  }

  // ---------------------------------------------------------------------
  // Small shared helpers: events, actions, long-press detection
  // ---------------------------------------------------------------------
  function fireEvent(node, type, detail = {}, options = {}) {
    const event = new Event(type, {
      bubbles: options.bubbles !== undefined ? options.bubbles : true,
      cancelable: Boolean(options.cancelable),
      composed: options.composed !== undefined ? options.composed : true,
    });
    event.detail = detail;
    node.dispatchEvent(event);
    return event;
  }

  function navigate(path) {
    if (!path) return;
    if (/^https?:\/\//.test(path)) {
      window.open(path, '_blank');
      return;
    }
    history.pushState(null, '', path);
    const evt = new Event('location-changed', { bubbles: true, composed: true });
    evt.detail = { replace: false };
    window.dispatchEvent(evt);
  }

  function handleAction(node, hass, actionConfig) {
    if (!actionConfig || !actionConfig.action || actionConfig.action === 'none') return;
    switch (actionConfig.action) {
      case 'navigate':
        navigate(actionConfig.navigation_path);
        break;
      case 'url':
        window.open(actionConfig.url_path, '_blank');
        break;
      case 'more-info': {
        const entityId = actionConfig.entity || actionConfig.entity_id;
        if (entityId) {
          fireEvent(node, 'hass-more-info', { entityId });
        }
        break;
      }
      case 'call-service':
      case 'perform-action': {
        const [domain, service] = (actionConfig.service || actionConfig.perform_action || '').split('.');
        if (domain && service) {
          hass.callService(domain, service, actionConfig.service_data || actionConfig.data || {});
        }
        break;
      }
      case 'assist':
        fireEvent(node, 'show-dialog', { dialogTag: 'ha-voice-command-dialog', dialogImport: () => {}, dialogParams: {} });
        break;
      default:
        break;
    }
  }

  /**
   * Attaches press handling to a node: fires `tapped` on a short click and
   * `held` once the pointer has been down for LONG_PRESS_MS. While the
   * pointer is down a CSS custom property (--rc-press) is animated from
   * 0 -> 1 so buttons can show a filling radial-progress affordance.
   */
  const LONG_PRESS_MS = 600;
  function bindPress(el, { onTap, onHold }) {
    let timer = null;
    let fired = false;
    let start = 0;

    const clearTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      el.style.setProperty('--rc-press', 0);
    };

    const down = (ev) => {
      ev.stopPropagation();
      fired = false;
      start = Date.now();
      el.classList.add('rc-pressing');
      timer = setInterval(() => {
        const pct = Math.min(1, (Date.now() - start) / LONG_PRESS_MS);
        el.style.setProperty('--rc-press', pct);
        if (pct >= 1 && !fired) {
          fired = true;
          clearTimer();
          el.classList.remove('rc-pressing');
          if (navigator.vibrate) navigator.vibrate(15);
          onHold && onHold();
        }
      }, 16);
    };

    const up = (ev) => {
      ev.stopPropagation();
      el.classList.remove('rc-pressing');
      const held = fired;
      clearTimer();
      if (!held) {
        onTap && onTap();
      }
    };

    const cancel = () => {
      el.classList.remove('rc-pressing');
      clearTimer();
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', cancel);
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
  }

  const MODE_ORDER = ['off', 'building_protection', 'economy', 'comfort', 'boost'];
  const MODE_ICONS = {
    off: 'mdi:power',
    building_protection: 'mdi:home-lock-outline',
    economy: 'mdi:leaf',
    comfort: 'mdi:sofa-outline',
    boost: 'mdi:rocket-launch-outline',
  };

  function themeIsDark(hass, themeConfig) {
    if (themeConfig === 'dark') return true;
    if (themeConfig === 'light') return false;
    return !!(hass && hass.themes && hass.themes.darkMode);
  }

  // =======================================================================
  //  MAIN CARD:  <recuperator-card>
  // =======================================================================
  class RecuperatorCard extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    static getStubConfig() {
      return {
        title: 'Ventilation',
        language: 'en',
        theme: 'auto',
        mode_entity: '',
        fan_speed_entity: '',
        recovery_entity: '',
        outdoor_temp_entity: '',
        supply_temp_entity: '',
        indoor_temp_entity: '',
        mode_state_map: {
          off: 'off',
          building_protection: 'building_protection',
          economy: 'economy',
          comfort: 'comfort',
          boost: 'boost',
        },
        settings_tap_action: { action: 'none' },
        settings_hold_action: { action: 'none' },
      };
    }

    static getConfigElement() {
      return document.createElement('recuperator-card-editor');
    }

    setConfig(config) {
      if (!config) throw new Error('Invalid configuration');
      this.config = {
        title: 'Ventilation',
        language: 'en',
        theme: 'auto',
        mode_state_map: {
          off: 'off',
          building_protection: 'building_protection',
          economy: 'economy',
          comfort: 'comfort',
          boost: 'boost',
        },
        settings_tap_action: { action: 'none' },
        settings_hold_action: { action: 'none' },
        ...config,
      };
    }

    getCardSize() {
      return 4;
    }

    t(key) {
      return translate(this.config.language || 'en', key);
    }

    _stateOf(entityId) {
      if (!entityId || !this.hass) return undefined;
      const st = this.hass.states[entityId];
      return st ? st.state : undefined;
    }

    _numberOf(entityId) {
      const v = this._stateOf(entityId);
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }

    _currentModeKey() {
      const raw = this._stateOf(this.config.mode_entity);
      const map = this.config.mode_state_map || {};
      const found = Object.keys(map).find((k) => map[k] === raw);
      return found || 'off';
    }

    _setMode(modeKey) {
      if (!this.hass || !this.config.mode_entity) return;
      const map = this.config.mode_state_map || {};
      const target = map[modeKey];
      if (target === undefined) return;
      const entityId = this.config.mode_entity;
      const domain = entityId.split('.')[0];
      if (domain === 'input_select') {
        this.hass.callService('input_select', 'select_option', { entity_id: entityId, option: target });
      } else if (domain === 'select') {
        this.hass.callService('select', 'select_option', { entity_id: entityId, option: target });
      } else if (domain === 'climate') {
        this.hass.callService('climate', 'set_preset_mode', { entity_id: entityId, preset_mode: target });
      } else if (domain === 'fan') {
        this.hass.callService('fan', 'set_preset_mode', { entity_id: entityId, preset_mode: target });
      } else {
        this.hass.callService(domain, 'set_value', { entity_id: entityId, value: target });
      }
    }

    _fmtTemp(entityId) {
      const n = this._numberOf(entityId);
      if (n === null) return '—';
      const unit = (this.hass.states[entityId] && this.hass.states[entityId].attributes.unit_of_measurement) || '°C';
      return `${n.toFixed(1)}${unit}`;
    }

    _openSettings(hold) {
      const action = hold ? this.config.settings_hold_action : this.config.settings_tap_action;
      handleAction(this, this.hass, action);
    }

    updated() {
      const btn = this.renderRoot.querySelector('.rc-gear');
      if (btn && !btn.__rcBound) {
        btn.__rcBound = true;
        bindPress(btn, {
          onTap: () => this._openSettings(false),
          onHold: () => this._openSettings(true),
        });
      }
      const modeButtons = this.renderRoot.querySelectorAll('.rc-mode-btn');
      modeButtons.forEach((b) => {
        if (!b.__rcBound) {
          b.__rcBound = true;
          b.addEventListener('click', () => this._setMode(b.dataset.mode));
        }
      });
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const dark = themeIsDark(this.hass, this.config.theme);
      const fan = this._numberOf(this.config.fan_speed_entity);
      const recovery = this._numberOf(this.config.recovery_entity);
      const fanPct = fan === null ? 0 : Math.max(0, Math.min(100, fan));
      const recPct = recovery === null ? 0 : Math.max(0, Math.min(100, recovery));
      const modeKey = this._currentModeKey();
      const modeIcon = MODE_ICONS[modeKey] || 'mdi:fan';

      // Dual concentric arc gauge geometry
      const R1 = 74; // outer = fan speed
      const R2 = 56; // inner = recovery
      const C1 = 2 * Math.PI * R1;
      const C2 = 2 * Math.PI * R2;

      return html`
        <ha-card class="${dark ? 'rc-dark' : 'rc-light'}">
          <div class="rc-root">
            <div class="rc-header">
              <div class="rc-title">${this.config.title || this.t('display')}</div>
              <button class="rc-gear" title="${this.t('settings')}">
                <svg viewBox="0 0 36 36" class="rc-gear-ring">
                  <circle cx="18" cy="18" r="16" class="rc-gear-track" />
                  <circle cx="18" cy="18" r="16" class="rc-gear-fill" />
                </svg>
                <ha-icon icon="mdi:cog-outline"></ha-icon>
              </button>
            </div>

            <div class="rc-dial-wrap">
              <svg viewBox="0 0 180 180" class="rc-dial">
                <circle cx="90" cy="90" r="${R1}" class="rc-track" />
                <circle
                  cx="90" cy="90" r="${R1}"
                  class="rc-arc rc-arc-fan"
                  stroke-dasharray="${C1}"
                  stroke-dashoffset="${C1 - (C1 * fanPct) / 100}"
                />
                <circle cx="90" cy="90" r="${R2}" class="rc-track rc-track-inner" />
                <circle
                  cx="90" cy="90" r="${R2}"
                  class="rc-arc rc-arc-rec"
                  stroke-dasharray="${C2}"
                  stroke-dashoffset="${C2 - (C2 * recPct) / 100}"
                />
              </svg>
              <div class="rc-dial-center">
                <ha-icon icon="${modeIcon}"></ha-icon>
                <div class="rc-mode-label">${this.t(`modes.${modeKey}`)}</div>
              </div>
            </div>

            <div class="rc-metrics">
              <div class="rc-metric">
                <span class="rc-dot rc-dot-fan"></span>
                <span class="rc-metric-label">${this.t('fan_speed')}</span>
                <span class="rc-metric-value">${fan === null ? this.t('unavailable') : `${fanPct}%`}</span>
              </div>
              <div class="rc-metric">
                <span class="rc-dot rc-dot-rec"></span>
                <span class="rc-metric-label">${this.t('recovery')}</span>
                <span class="rc-metric-value">${recovery === null ? this.t('unavailable') : `${recPct}%`}</span>
              </div>
            </div>

            <div class="rc-modes">
              <div class="rc-modes-line"></div>
              ${MODE_ORDER.map(
                (m) => html`
                  <button
                    class="rc-mode-btn ${m === modeKey ? 'rc-active' : ''}"
                    data-mode="${m}"
                    title="${this.t(`modes.${m}`)}"
                  >
                    <ha-icon icon="${MODE_ICONS[m]}"></ha-icon>
                    <span>${this.t(`modes.${m}`)}</span>
                  </button>
                `
              )}
            </div>

            <div class="rc-temps">
              <div class="rc-temp">
                <ha-icon icon="mdi:weather-windy"></ha-icon>
                <div>
                  <div class="rc-temp-label">${this.t('outdoor')}</div>
                  <div class="rc-temp-value">${this._fmtTemp(this.config.outdoor_temp_entity)}</div>
                </div>
              </div>
              <div class="rc-temp">
                <ha-icon icon="mdi:arrow-down-bold-box-outline"></ha-icon>
                <div>
                  <div class="rc-temp-label">${this.t('supply')}</div>
                  <div class="rc-temp-value">${this._fmtTemp(this.config.supply_temp_entity)}</div>
                </div>
              </div>
              <div class="rc-temp">
                <ha-icon icon="mdi:home-thermometer-outline"></ha-icon>
                <div>
                  <div class="rc-temp-label">${this.t('indoor')}</div>
                  <div class="rc-temp-value">${this._fmtTemp(this.config.indoor_temp_entity)}</div>
                </div>
              </div>
            </div>
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return css`
        :host {
          --rc-radius: 20px;
        }
        ha-card {
          overflow: hidden;
          border-radius: var(--rc-radius);
          padding: 0;
        }
        .rc-light {
          --rc-bg: linear-gradient(160deg, #eef4f3 0%, #e4ece9 100%);
          --rc-ink: #12201d;
          --rc-mist: #5c716b;
          --rc-card: #ffffffcc;
          --rc-track: #d7e2de;
          --rc-fresh: #0f9c8f;
          --rc-extract: #d97706;
          --rc-shadow: 0 8px 24px rgba(18, 32, 29, 0.08);
        }
        .rc-dark {
          --rc-bg: linear-gradient(160deg, #10181a 0%, #0a1112 100%);
          --rc-ink: #eef4f3;
          --rc-mist: #8ba39c;
          --rc-card: #16211fcc;
          --rc-track: #223330;
          --rc-fresh: #2dd4bf;
          --rc-extract: #f5a623;
          --rc-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        }
        .rc-root {
          background: var(--rc-bg);
          color: var(--rc-ink);
          padding: 16px 18px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .rc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .rc-title {
          font-size: 1.05rem;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        .rc-gear {
          --rc-press: 0;
          position: relative;
          width: 36px;
          height: 36px;
          border: none;
          background: transparent;
          color: var(--rc-mist);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        .rc-gear:hover {
          color: var(--rc-ink);
        }
        .rc-gear-ring {
          position: absolute;
          inset: 0;
          transform: rotate(-90deg);
        }
        .rc-gear-track {
          fill: none;
          stroke: transparent;
        }
        .rc-gear-fill {
          fill: none;
          stroke: var(--rc-fresh);
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-dasharray: 100.5;
          stroke-dashoffset: calc(100.5 - (100.5 * var(--rc-press)));
          opacity: var(--rc-press);
          transition: opacity 0.1s;
        }
        .rc-dial-wrap {
          position: relative;
          width: 180px;
          height: 180px;
          margin: 6px auto 4px;
        }
        .rc-dial {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .rc-track {
          fill: none;
          stroke: var(--rc-track);
          stroke-width: 10;
        }
        .rc-arc {
          fill: none;
          stroke-width: 10;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .rc-arc-fan {
          stroke: var(--rc-fresh);
        }
        .rc-arc-rec {
          stroke: var(--rc-extract);
        }
        .rc-dial-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 2px;
        }
        .rc-dial-center ha-icon {
          --mdc-icon-size: 30px;
          color: var(--rc-ink);
        }
        .rc-mode-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--rc-mist);
          max-width: 110px;
        }
        .rc-metrics {
          display: flex;
          justify-content: center;
          gap: 22px;
          margin: 6px 0 18px;
          font-size: 0.8rem;
        }
        .rc-metric {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--rc-mist);
        }
        .rc-metric-value {
          font-variant-numeric: tabular-nums;
          font-family: ui-monospace, 'Roboto Mono', 'SFMono-Regular', monospace;
          color: var(--rc-ink);
          font-weight: 600;
        }
        .rc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .rc-dot-fan {
          background: var(--rc-fresh);
        }
        .rc-dot-rec {
          background: var(--rc-extract);
        }
        .rc-modes {
          position: relative;
          display: flex;
          justify-content: space-between;
          padding: 10px 4px 4px;
        }
        .rc-modes-line {
          position: absolute;
          left: 20px;
          right: 20px;
          top: 22px;
          height: 2px;
          background: var(--rc-track);
          z-index: 0;
        }
        .rc-mode-btn {
          position: relative;
          z-index: 1;
          border: none;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--rc-mist);
          cursor: pointer;
          flex: 1;
          padding: 0;
        }
        .rc-mode-btn ha-icon {
          --mdc-icon-size: 20px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: var(--rc-card);
          box-shadow: var(--rc-shadow);
          transition: transform 0.15s, color 0.15s, background 0.15s;
        }
        .rc-mode-btn span {
          font-size: 0.62rem;
          font-weight: 600;
          text-align: center;
          line-height: 1.1;
          max-width: 58px;
        }
        .rc-mode-btn.rc-active ha-icon {
          color: #fff;
          background: var(--rc-fresh);
          transform: scale(1.1);
        }
        .rc-mode-btn.rc-active span {
          color: var(--rc-ink);
        }
        .rc-temps {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 18px;
        }
        .rc-temp {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--rc-card);
          border-radius: 14px;
          padding: 8px 10px;
          box-shadow: var(--rc-shadow);
        }
        .rc-temp ha-icon {
          --mdc-icon-size: 18px;
          color: var(--rc-fresh);
        }
        .rc-temp-label {
          font-size: 0.62rem;
          color: var(--rc-mist);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .rc-temp-value {
          font-family: ui-monospace, 'Roboto Mono', 'SFMono-Regular', monospace;
          font-weight: 700;
          font-size: 0.9rem;
        }
      `;
    }
  }

  // =======================================================================
  //  SETTINGS CARD:  <recuperator-settings-card>
  // =======================================================================
  class RecuperatorSettingsCard extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    static getStubConfig() {
      return {
        title: 'Ventilation settings',
        language: 'en',
        theme: 'auto',
        show_language_picker: true,
        show_theme_picker: true,
        back_tap_action: { action: 'navigate', navigation_path: '/lovelace/0' },
        back_hold_action: { action: 'none' },
      };
    }

    static getConfigElement() {
      return document.createElement('recuperator-settings-card-editor');
    }

    setConfig(config) {
      if (!config) throw new Error('Invalid configuration');
      this.config = {
        title: 'Ventilation settings',
        language: 'en',
        theme: 'auto',
        show_language_picker: true,
        show_theme_picker: true,
        back_tap_action: { action: 'none' },
        back_hold_action: { action: 'none' },
        ...config,
      };
      this._lang = this._readLanguage();
    }

    getCardSize() {
      return 3;
    }

    t(key) {
      return translate(this._lang || this.config.language || 'en', key);
    }

    _readLanguage() {
      if (this.config.language_entity && this.hass) {
        const st = this.hass.states[this.config.language_entity];
        if (st) return st.state;
      }
      return localStorage.getItem('rc-language') || this.config.language || 'en';
    }

    _readTheme() {
      if (this.config.theme_entity && this.hass) {
        const st = this.hass.states[this.config.theme_entity];
        if (st) return st.state;
      }
      return localStorage.getItem('rc-theme') || this.config.theme || 'auto';
    }

    _setLanguage(lang) {
      this._lang = lang;
      localStorage.setItem('rc-language', lang);
      if (this.config.language_entity && this.hass) {
        const domain = this.config.language_entity.split('.')[0];
        if (domain === 'input_select') {
          this.hass.callService('input_select', 'select_option', {
            entity_id: this.config.language_entity,
            option: lang,
          });
        }
      }
      this.requestUpdate();
    }

    _setTheme(theme) {
      localStorage.setItem('rc-theme', theme);
      if (this.config.theme_entity && this.hass) {
        const domain = this.config.theme_entity.split('.')[0];
        if (domain === 'input_select') {
          this.hass.callService('input_select', 'select_option', {
            entity_id: this.config.theme_entity,
            option: theme,
          });
        }
      }
      this.requestUpdate();
    }

    _goBack(hold) {
      const action = hold ? this.config.back_hold_action : this.config.back_tap_action;
      handleAction(this, this.hass, action);
    }

    updated() {
      const btn = this.renderRoot.querySelector('.rc-back');
      if (btn && !btn.__rcBound) {
        btn.__rcBound = true;
        bindPress(btn, {
          onTap: () => this._goBack(false),
          onHold: () => this._goBack(true),
        });
      }
    }

    render() {
      if (!this.hass || !this.config) return html``;
      if (!this._lang) this._lang = this._readLanguage();
      const dark = themeIsDark(this.hass, this._readTheme());
      const theme = this._readTheme();

      return html`
        <ha-card class="${dark ? 'rc-dark' : 'rc-light'}">
          <div class="rc-root">
            <div class="rc-header">
              <button class="rc-back" title="${this.t('back')}">
                <svg viewBox="0 0 36 36" class="rc-gear-ring">
                  <circle cx="18" cy="18" r="16" class="rc-gear-track" />
                  <circle cx="18" cy="18" r="16" class="rc-gear-fill" />
                </svg>
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </button>
              <div class="rc-title">${this.config.title || this.t('settings')}</div>
              <div style="width:36px"></div>
            </div>

            ${this.config.show_language_picker
              ? html`
                  <div class="rc-section">
                    <div class="rc-section-label">${this.t('language')}</div>
                    <div class="rc-pillrow">
                      ${['en', 'ru', 'lv'].map(
                        (code) => html`
                          <button
                            class="rc-pill ${this._lang === code ? 'rc-active' : ''}"
                            @click=${() => this._setLanguage(code)}
                          >
                            ${code.toUpperCase()}
                          </button>
                        `
                      )}
                    </div>
                  </div>
                `
              : ''}
            ${this.config.show_theme_picker
              ? html`
                  <div class="rc-section">
                    <div class="rc-section-label">${this.t('theme')}</div>
                    <div class="rc-pillrow">
                      <button class="rc-pill ${theme === 'light' ? 'rc-active' : ''}" @click=${() => this._setTheme('light')}>
                        <ha-icon icon="mdi:white-balance-sunny"></ha-icon> ${this.t('light')}
                      </button>
                      <button class="rc-pill ${theme === 'dark' ? 'rc-active' : ''}" @click=${() => this._setTheme('dark')}>
                        <ha-icon icon="mdi:weather-night"></ha-icon> ${this.t('dark')}
                      </button>
                      <button class="rc-pill ${theme === 'auto' ? 'rc-active' : ''}" @click=${() => this._setTheme('auto')}>
                        <ha-icon icon="mdi:theme-light-dark"></ha-icon> ${this.t('auto')}
                      </button>
                    </div>
                  </div>
                `
              : ''}
            <slot></slot>
          </div>
        </ha-card>
      `;
    }

    static get styles() {
      return RecuperatorCard.styles.concat(css`
        .rc-section {
          margin-top: 18px;
        }
        .rc-section-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--rc-mist);
          margin-bottom: 8px;
        }
        .rc-pillrow {
          display: flex;
          gap: 8px;
        }
        .rc-pill {
          flex: 1;
          border: none;
          border-radius: 12px;
          padding: 10px 8px;
          background: var(--rc-card);
          box-shadow: var(--rc-shadow);
          color: var(--rc-mist);
          font-weight: 600;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .rc-pill ha-icon {
          --mdc-icon-size: 16px;
        }
        .rc-pill.rc-active {
          background: var(--rc-fresh);
          color: #fff;
        }
      `);
    }
  }

  // =======================================================================
  //  Shared editor helpers
  // =======================================================================
  function editorRow(label, contentTemplate) {
    return html`
      <div class="rc-ed-row">
        <div class="rc-ed-label">${label}</div>
        <div class="rc-ed-field">${contentTemplate}</div>
      </div>
    `;
  }

  const editorStyles = css`
    .rc-ed-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, #eee);
    }
    .rc-ed-label {
      flex: 0 0 40%;
      font-size: 0.85rem;
      color: var(--secondary-text-color, #666);
    }
    .rc-ed-field {
      flex: 1;
    }
    .rc-ed-field input,
    .rc-ed-field select {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #ccc);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
    }
    .rc-ed-section {
      font-weight: 600;
      margin: 18px 0 4px;
      font-size: 0.9rem;
    }
  `;

  function entityPicker(hass, value, onChange, domainFilter) {
    const picker = document.createElement('ha-entity-picker');
    picker.hass = hass;
    picker.value = value || '';
    if (domainFilter) picker.includeDomains = domainFilter;
    picker.addEventListener('value-changed', (ev) => onChange(ev.detail.value));
    return picker;
  }

  function actionPicker(hass, value, onChange) {
    if (customElements.get('ha-selector')) {
      const sel = document.createElement('ha-selector');
      sel.hass = hass;
      sel.selector = { ui_action: {} };
      sel.value = value || { action: 'none' };
      sel.addEventListener('value-changed', (ev) => onChange(ev.detail.value));
      return sel;
    }
    // Fallback simple select if ha-selector isn't available.
    const wrap = document.createElement('select');
    ['none', 'navigate', 'more-info', 'call-service', 'url'].forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      if (value && value.action === a) opt.selected = true;
      wrap.appendChild(opt);
    });
    wrap.addEventListener('change', () => onChange({ action: wrap.value }));
    return wrap;
  }

  class RecuperatorCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    setConfig(config) {
      this.config = config;
    }

    _update(key, value) {
      this.config = { ...this.config, [key]: value };
      fireEvent(this, 'config-changed', { config: this.config });
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      return html`
        <div class="rc-ed-section">Display</div>
        ${editorRow(
          'Title',
          html`<input type="text" .value=${c.title || ''} @input=${(e) => this._update('title', e.target.value)} />`
        )}
        ${editorRow(
          'Language',
          html`<select @change=${(e) => this._update('language', e.target.value)}>
            ${['en', 'ru', 'lv'].map((l) => html`<option value=${l} ?selected=${c.language === l}>${l.toUpperCase()}</option>`)}
          </select>`
        )}
        ${editorRow(
          'Theme',
          html`<select @change=${(e) => this._update('theme', e.target.value)}>
            ${['auto', 'light', 'dark'].map((th) => html`<option value=${th} ?selected=${c.theme === th}>${th}</option>`)}
          </select>`
        )}

        <div class="rc-ed-section">Entities</div>
        ${editorRow('Mode entity (input_select / select / climate / fan)', entityPicker(this.hass, c.mode_entity, (v) => this._update('mode_entity', v)))}
        ${editorRow('Fan speed % sensor', entityPicker(this.hass, c.fan_speed_entity, (v) => this._update('fan_speed_entity', v), ['sensor']))}
        ${editorRow('Heat recovery % sensor', entityPicker(this.hass, c.recovery_entity, (v) => this._update('recovery_entity', v), ['sensor']))}
        ${editorRow('Outdoor temperature sensor', entityPicker(this.hass, c.outdoor_temp_entity, (v) => this._update('outdoor_temp_entity', v), ['sensor']))}
        ${editorRow('Supply temperature sensor', entityPicker(this.hass, c.supply_temp_entity, (v) => this._update('supply_temp_entity', v), ['sensor']))}
        ${editorRow('Indoor / extract temperature sensor', entityPicker(this.hass, c.indoor_temp_entity, (v) => this._update('indoor_temp_entity', v), ['sensor']))}

        <div class="rc-ed-section">Mode entity state values</div>
        ${MODE_ORDER.map((m) =>
          editorRow(
            translate(c.language || 'en', `modes.${m}`),
            html`<input
              type="text"
              .value=${(c.mode_state_map && c.mode_state_map[m]) || m}
              @input=${(e) =>
                this._update('mode_state_map', { ...(c.mode_state_map || {}), [m]: e.target.value })}
            />`
          )
        )}

        <div class="rc-ed-section">Settings button (gear icon)</div>
        ${editorRow('Tap action', actionPicker(this.hass, c.settings_tap_action, (v) => this._update('settings_tap_action', v)))}
        ${editorRow('Hold action', actionPicker(this.hass, c.settings_hold_action, (v) => this._update('settings_hold_action', v)))}
      `;
    }

    static get styles() {
      return editorStyles;
    }
  }

  class RecuperatorSettingsCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, config: {} };
    }

    setConfig(config) {
      this.config = config;
    }

    _update(key, value) {
      this.config = { ...this.config, [key]: value };
      fireEvent(this, 'config-changed', { config: this.config });
    }

    render() {
      if (!this.hass || !this.config) return html``;
      const c = this.config;
      return html`
        <div class="rc-ed-section">Display</div>
        ${editorRow(
          'Title',
          html`<input type="text" .value=${c.title || ''} @input=${(e) => this._update('title', e.target.value)} />`
        )}
        ${editorRow(
          'Default language',
          html`<select @change=${(e) => this._update('language', e.target.value)}>
            ${['en', 'ru', 'lv'].map((l) => html`<option value=${l} ?selected=${c.language === l}>${l.toUpperCase()}</option>`)}
          </select>`
        )}
        ${editorRow(
          'Default theme',
          html`<select @change=${(e) => this._update('theme', e.target.value)}>
            ${['auto', 'light', 'dark'].map((th) => html`<option value=${th} ?selected=${c.theme === th}>${th}</option>`)}
          </select>`
        )}
        ${editorRow(
          'Show language picker',
          html`<input type="checkbox" ?checked=${c.show_language_picker !== false} @change=${(e) => this._update('show_language_picker', e.target.checked)} />`
        )}
        ${editorRow(
          'Show theme picker',
          html`<input type="checkbox" ?checked=${c.show_theme_picker !== false} @change=${(e) => this._update('show_theme_picker', e.target.checked)} />`
        )}

        <div class="rc-ed-section">Persistence (optional helpers)</div>
        ${editorRow('Language helper entity (input_select)', entityPicker(this.hass, c.language_entity, (v) => this._update('language_entity', v), ['input_select']))}
        ${editorRow('Theme helper entity (input_select)', entityPicker(this.hass, c.theme_entity, (v) => this._update('theme_entity', v), ['input_select']))}

        <div class="rc-ed-section">Back button</div>
        ${editorRow('Tap action', actionPicker(this.hass, c.back_tap_action, (v) => this._update('back_tap_action', v)))}
        ${editorRow('Hold action', actionPicker(this.hass, c.back_hold_action, (v) => this._update('back_hold_action', v)))}
      `;
    }

    static get styles() {
      return editorStyles;
    }
  }

  // ---------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------
  customElements.define('recuperator-card', RecuperatorCard);
  customElements.define('recuperator-settings-card', RecuperatorSettingsCard);
  customElements.define('recuperator-card-editor', RecuperatorCardEditor);
  customElements.define('recuperator-settings-card-editor', RecuperatorSettingsCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'recuperator-card',
    name: 'Recuperator Card',
    description: 'Modern control card for a heat-recovery ventilation unit: modes, fan speed, recovery %, temperatures.',
    preview: false,
  });
  window.customCards.push({
    type: 'recuperator-settings-card',
    name: 'Recuperator Settings Card',
    description: 'Companion settings page for the Recuperator Card: language, theme and a configurable back button.',
    preview: false,
  });

  // eslint-disable-next-line no-console
  console.info('%c RECUPERATOR-CARD %c v1.0.0 ', 'color: white; background: #0f9c8f; font-weight: 700;', 'color: #0f9c8f; background: white; font-weight: 700;');
})();
