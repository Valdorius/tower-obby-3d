/**
 * Tower of Obby 3D - Internationalization (i18n) Module
 * Supports Russian ('ru') and English ('en')
 * Auto-detects from URL param, localStorage, Playgama Bridge platform, and navigator.
 */
(function() {
  'use strict';

  const TRANSLATIONS = {
    ru: {
      gameTitle: 'Башня Обби 3D (Tower of Obby)',
      floor: 'ЭТАЖ',
      skipFloor: '⏩ Пропустить (+📺)',
      skipFloorTitle: 'Пропустить сложный этаж',
      leaderboard: 'Лидеры',
      leaderboardTitle: 'Таблица лидеров платформы',
      fullscreenFull: 'Экран',
      fullscreenWindow: 'Окно',
      fullscreenTitle: 'Полноэкранный режим',
      muteTitle: 'Вкл/Выкл звук',
      respawn: '🔄 Респаун',
      respawnTitle: 'Вернуться на чекпоинт (R)',
      rotateHint: 'Поверните экран в альбомный режим',
      jumpTitle: 'Прыжок',
      switchLangTitle: 'Сменить язык / Switch language',
      langLabel: '🌐 RU',
      langShort: 'RU',

      // Victory Modal
      victoryTitle: '🏆 ПОБЕДА! 🏆',
      victoryDesc: 'Ты покорил все 20 этажей великой Башни Обби!',
      statTime: 'Твое Время',
      statCoins: 'Собрано Монет',
      statDeaths: 'Падений / Смертей',
      statBest: 'Лучший Рекорд',
      doubleCoinsBtn: '🎁 Удвоить Монеты (x2) (+📺)',
      doubleCoinsDone: '✅ Монеты удвоены!',
      victoryLeaderboardBtn: '🏆 Таблица Лидеров',
      restartBtn: 'Сыграть Снова 🚀',

      // Leaderboard Modal
      lbTitle: '🏆 Таблица Лидеров',
      lbCloseTitle: 'Закрыть',
      lbRankCol: '#',
      lbPlayerCol: 'Игрок',
      lbTimeCol: 'Время',
      lbLoading: '⏳ Загрузка таблицы лидеров платформы...',
      lbEmptyTitle: 'Таблица Лидеров',
      lbEmptyDesc: 'Вы пока первый претендент на рекорд! Покорите вершину Башни, чтобы зафиксировать своё лучшее время.',
      lbErrorTitle: 'Ошибка загрузки',
      lbErrorDesc: 'Не удалось получить данные с сервера лидеров платформы. Попробуйте снова чуть позже.',
      lbPlatformTitle: 'Платформенная Таблица Лидеров',
      lbPlatformDesc: 'Официальный рейтинг и соревнование с другими игроками синхронизируются через <strong>Playgama Bridge</strong> на платформах <strong>Яндекс Игры</strong> и <strong>VK Play</strong>.',
      lbPlatformBadge: '✓ Интеграция API Playgama v2.4.0 подключена',
      lbMyRecord: 'Ваш рекорд времени:',
      lbCloseBtn: 'Закрыть',
      defaultPlayerName: 'Игрок',

      // 20 Floor Stage Names
      floors: [
        'Первые шаги',
        'Парящие диски',
        'Узкие тропы',
        'Прыжковые батуты',
        'Микро-столбики',
        'Супер-батуты',
        'Живые платформы',
        'Встречный дрифт',
        'Ледяные дорожки',
        'Хрупкий мост',
        'Быстрый распад',
        'Лавовые полосы',
        'Лавовый крест',
        'Лед и лава',
        'Лазерные барьеры',
        'Бегущие лазеры',
        'Вращающийся луч',
        'Двойные спиннеры',
        'Хрупкие лучи',
        'Корона Башни'
      ]
    },
    en: {
      gameTitle: 'Tower of Obby 3D',
      floor: 'FLOOR',
      skipFloor: '⏩ Skip (+📺)',
      skipFloorTitle: 'Skip difficult floor',
      leaderboard: 'Rank',
      leaderboardTitle: 'Platform Leaderboard',
      fullscreenFull: 'Full',
      fullscreenWindow: 'Window',
      fullscreenTitle: 'Fullscreen mode',
      muteTitle: 'Toggle sound',
      respawn: '🔄 Respawn',
      respawnTitle: 'Back to checkpoint (R)',
      rotateHint: 'Rotate device to landscape mode',
      jumpTitle: 'Jump',
      switchLangTitle: 'Switch language / Сменить язык',
      langLabel: '🌐 EN',
      langShort: 'EN',

      // Victory Modal
      victoryTitle: '🏆 VICTORY! 🏆',
      victoryDesc: 'You conquered all 20 floors of the Great Obby Tower!',
      statTime: 'Your Time',
      statCoins: 'Coins Collected',
      statDeaths: 'Falls / Deaths',
      statBest: 'Best Record',
      doubleCoinsBtn: '🎁 Double Coins (x2) (+📺)',
      doubleCoinsDone: '✅ Coins doubled!',
      victoryLeaderboardBtn: '🏆 Leaderboard',
      restartBtn: 'Play Again 🚀',

      // Leaderboard Modal
      lbTitle: '🏆 Leaderboard',
      lbCloseTitle: 'Close',
      lbRankCol: '#',
      lbPlayerCol: 'Player',
      lbTimeCol: 'Time',
      lbLoading: '⏳ Loading platform leaderboard...',
      lbEmptyTitle: 'Leaderboard',
      lbEmptyDesc: 'You are the first contender! Reach the top of the Tower to set your best time record.',
      lbErrorTitle: 'Loading Error',
      lbErrorDesc: 'Failed to retrieve leaderboard data from the platform. Please try again later.',
      lbPlatformTitle: 'Platform Leaderboard',
      lbPlatformDesc: 'Official competitive ranking with other players syncs via <strong>Playgama Bridge</strong> on gaming platforms (<strong>Yandex Games</strong>, <strong>VK Play</strong>).',
      lbPlatformBadge: '✓ Playgama Bridge API v2.4.0 Active',
      lbMyRecord: 'Your best time:',
      lbCloseBtn: 'Close',
      defaultPlayerName: 'Player',

      // 20 Floor Stage Names
      floors: [
        'First Steps',
        'Floating Discs',
        'Narrow Paths',
        'Jump Trampolines',
        'Micro Pillars',
        'Super Bouncers',
        'Moving Platforms',
        'Counter Drift',
        'Icy Walkways',
        'Fragile Bridge',
        'Rapid Decay',
        'Lava Stripes',
        'Lava Cross',
        'Ice & Lava',
        'Laser Barriers',
        'Moving Lasers',
        'Spinning Beam',
        'Twin Spinners',
        'Fragile Spinners',
        'Tower Crown'
      ]
    }
  };

  class I18NManager {
    constructor() {
      this.listeners = [];
      this.currentLang = this.detectInitialLanguage();
    }

    detectInitialLanguage() {
      // 1. Explicit query param (e.g. ?lang=en)
      try {
        if (typeof window !== 'undefined' && window.location && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const langParam = params.get('lang');
          if (langParam) {
            const clean = langParam.toLowerCase().slice(0, 2);
            if (TRANSLATIONS[clean]) return clean;
          }
        }
      } catch (e) {}

      // 2. Saved user preference
      try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
          const saved = localStorage.getItem('tower_lang');
          if (saved && TRANSLATIONS[saved]) return saved;
        }
      } catch (e) {}

      // 3. Platform Bridge language (if already initialized)
      try {
        if (typeof window !== 'undefined' && window.bridge && window.bridge.platform && window.bridge.platform.language) {
          const pLang = String(window.bridge.platform.language).toLowerCase().slice(0, 2);
          if (['ru', 'be', 'uk', 'kk'].includes(pLang)) return 'ru';
          return 'en';
        }
      } catch (e) {}

      // 4. System / Browser navigator language
      try {
        if (typeof navigator !== 'undefined' && navigator.language) {
          const navLang = navigator.language.toLowerCase().slice(0, 2);
          if (['ru', 'be', 'uk', 'kk'].includes(navLang)) return 'ru';
          return 'en';
        }
      } catch (e) {}

      return 'ru';
    }

    setLanguage(lang, notify = true) {
      if (!TRANSLATIONS[lang]) return;
      this.currentLang = lang;

      try {
        if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
          localStorage.setItem('tower_lang', lang);
        }
      } catch (e) {}

      this.applyToDOM();

      if (notify) {
        for (let i = 0; i < this.listeners.length; i++) {
          try {
            this.listeners[i](this.currentLang);
          } catch (err) {
            console.warn('[i18n] Listener error:', err);
          }
        }
      }
    }

    toggleLanguage() {
      const nextLang = this.currentLang === 'ru' ? 'en' : 'ru';
      this.setLanguage(nextLang, true);
      return nextLang;
    }

    onLanguageChange(fn) {
      if (typeof fn === 'function') {
        this.listeners.push(fn);
      }
    }

    t(key) {
      const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.ru;
      return dict[key] || TRANSLATIONS.ru[key] || key;
    }

    getFloorName(floorNum) {
      const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.ru;
      const idx = floorNum - 1;
      if (dict.floors && dict.floors[idx]) {
        return dict.floors[idx];
      }
      return `${this.t('floor')} ${floorNum}`;
    }

    applyToDOM() {
      if (typeof document === 'undefined') return;

      // Update <html lang="...">
      document.documentElement.lang = this.currentLang;

      // Update document title
      document.title = this.t('gameTitle');

      // Update elements with data-i18n
      const textEls = document.querySelectorAll('[data-i18n]');
      textEls.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = this.t(key);
        if (val) {
          el.innerHTML = val;
        }
      });

      // Update elements with data-i18n-title
      const titleEls = document.querySelectorAll('[data-i18n-title]');
      titleEls.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = this.t(key);
        if (val) {
          el.title = val;
        }
      });

      // Update language button
      const langLabel = document.getElementById('lang-label');
      if (langLabel) langLabel.textContent = this.t('langLabel');
      const langShort = document.getElementById('lang-short');
      if (langShort) langShort.textContent = this.t('langShort');
      const langBtn = document.getElementById('lang-btn');
      if (langBtn) langBtn.title = this.t('switchLangTitle');
    }
  }

  window.I18N = new I18NManager();
})();
