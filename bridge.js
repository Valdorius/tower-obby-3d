/**
 * Tower of Obby 3D - Playgama Bridge v2.4.0 Integration & Storage Manager
 */
(function() {
  'use strict';

  class BridgeWrapper {
    constructor(game) {
      this.game = game;
      this.isReady = false;
      this.rewardCallback = null;
      this.hasEarnedReward = false;
      this.lastInterstitialTime = 0;

      // Immediately load local progress synchronously so standalone mode works instantly
      this.loadLocalProgress();
      this.init();
    }

    async init() {
      // Document visibility listener for pausing/resuming
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.game.pauseGame();
        } else {
          this.game.resumeGame();
        }
      });

      if (window.bridge) {
        try {
          await window.bridge.initialize();
          this.isReady = true;

          if (window.bridge.platform && typeof window.bridge.platform.sendMessage === 'function') {
            window.bridge.platform.sendMessage('game_ready');
          }
          console.log('[Playgama Bridge] Initialized successfully');

          // Attach advertisement lifecycle events
          if (window.bridge.advertisement && typeof window.bridge.advertisement.on === 'function') {
            const ad = window.bridge.advertisement;
            const events = window.bridge.EVENT_NAME;
            const rewStates = window.bridge.REWARDED_STATE;
            const intStates = window.bridge.INTERSTITIAL_STATE;

            // Rewarded Ad State Flow
            if (events && events.REWARDED_STATE_CHANGED) {
              ad.on(events.REWARDED_STATE_CHANGED, (state) => {
                if (state === rewStates.OPENED) {
                  this.game.pauseForAd();
                  this.hasEarnedReward = false;
                } else if (state === rewStates.REWARDED) {
                  this.hasEarnedReward = true;
                } else if (state === rewStates.CLOSED) {
                  this.game.resumeAfterAd();
                  if (this.hasEarnedReward && typeof this.rewardCallback === 'function') {
                    const cb = this.rewardCallback;
                    this.rewardCallback = null;
                    cb();
                  } else {
                    this.rewardCallback = null;
                  }
                  this.hasEarnedReward = false;
                } else if (state === rewStates.FAILED) {
                  this.game.resumeAfterAd();
                  this.rewardCallback = null;
                  this.hasEarnedReward = false;
                }
              });
            }

            // Interstitial Ad State Flow
            if (events && events.INTERSTITIAL_STATE_CHANGED) {
              ad.on(events.INTERSTITIAL_STATE_CHANGED, (state) => {
                if (state === intStates.OPENED) {
                  this.game.pauseForAd();
                } else if (state === intStates.CLOSED || state === intStates.FAILED) {
                  this.game.resumeAfterAd();
                  this.lastInterstitialTime = Date.now();
                }
              });
            }

            // Visibility State
            if (events && events.VISIBILITY_STATE_CHANGED && typeof window.bridge.on === 'function') {
              window.bridge.on(events.VISIBILITY_STATE_CHANGED, (state) => {
                if (state === 'hidden') {
                  this.game.pauseGame();
                } else if (state === 'visible') {
                  this.game.resumeGame();
                }
              });
            }
          }

          // Fetch cloud storage data and sync
          await this.loadCloudProgress();

          // Sync platform language if user hasn't explicitly chosen one
          try {
            if (window.bridge && window.bridge.platform && window.bridge.platform.language) {
              const pLang = String(window.bridge.platform.language).toLowerCase().slice(0, 2);
              const targetLang = ['ru', 'be', 'uk', 'kk'].includes(pLang) ? 'ru' : 'en';
              if (typeof localStorage !== 'undefined' && !localStorage.getItem('tower_lang') && window.I18N) {
                window.I18N.setLanguage(targetLang);
              }
            }
          } catch (e) {}
        } catch (e) {
          console.warn('[Playgama Bridge] Init failed, operating in standalone mode', e);
        }
      } else {
        console.log('[Playgama Bridge] Standalone mode (no bridge detected)');
      }
    }

    showRewarded(placement, onRewarded) {
      if (this.isReady && window.bridge && window.bridge.advertisement) {
        this.rewardCallback = onRewarded;
        this.hasEarnedReward = false;
        // Correct API: pass placement name string
        window.bridge.advertisement.showRewarded(placement);
      } else {
        // Fallback for standalone/local development mode
        if (typeof onRewarded === 'function') {
          onRewarded();
        }
      }
    }

    showFloorCompletedAd(floorNum) {
      const cooldownMs = (window.TOWER_CONFIG ? window.TOWER_CONFIG.ADS.MIN_INTERSTITIAL_COOLDOWN_SEC : 70) * 1000;
      if (Date.now() - this.lastInterstitialTime < cooldownMs) {
        return; // Still in cooldown
      }

      if (this.isReady && window.bridge && window.bridge.advertisement) {
        this.lastInterstitialTime = Date.now();
        // Correct API: pass placement name string
        window.bridge.advertisement.showInterstitial('floor_completed');
      }
    }

    showWinAd() {
      if (this.isReady && window.bridge && window.bridge.advertisement) {
        this.lastInterstitialTime = Date.now();
        window.bridge.advertisement.showInterstitial('game_win');
      }
    }

    async saveProgress(bestTime, coins) {
      try {
        // Save to localStorage
        if (typeof bestTime === 'number' && bestTime > 0) {
          localStorage.setItem('tower_best_time', bestTime.toString());
        }
        if (typeof coins === 'number') {
          localStorage.setItem('tower_coins', coins.toString());
        }

        // Save to cloud storage via Playgama Bridge API (key array + value array)
        if (this.isReady && window.bridge && window.bridge.storage) {
          const keys = [];
          const values = [];
          if (typeof bestTime === 'number' && bestTime > 0) {
            keys.push('tower_best_time');
            values.push(bestTime.toString());
          }
          if (typeof coins === 'number') {
            keys.push('tower_coins');
            values.push(coins.toString());
          }
          if (keys.length > 0) {
            await window.bridge.storage.set(keys, values);
          }
        }

        // Submit score to Platform Leaderboard
        if (typeof bestTime === 'number' && bestTime > 0 && this.isReady && window.bridge && window.bridge.leaderboards) {
          // Playgama score integer (hundredths of a second: e.g. 12.34s -> 1234)
          const score = Math.round(bestTime * 100);
          window.bridge.leaderboards.setScore('tower_best_time', score).catch((err) => {
            console.warn('[Playgama Bridge] Leaderboard setScore notice:', err);
          });
        }
      } catch (e) {
        console.warn('Failed saving progress', e);
      }
    }

    getLeaderboardType() {
      if (this.isReady && window.bridge && window.bridge.leaderboards) {
        return window.bridge.leaderboards.type || 'not_available';
      }
      return 'not_available';
    }

    async showLeaderboard() {
      const type = this.getLeaderboardType();
      if (type === 'native_popup') {
        try {
          await window.bridge.leaderboards.showNativePopup('tower_best_time');
          return { type: 'native_popup', success: true };
        } catch (err) {
          console.warn('[Playgama Bridge] showNativePopup error:', err);
          return { type: 'native_popup', success: false, error: err };
        }
      } else if (type === 'in_game') {
        try {
          const raw = await window.bridge.leaderboards.getEntries('tower_best_time');
          let entries = [];
          if (Array.isArray(raw)) {
            entries = raw;
          } else if (raw && Array.isArray(raw.entries)) {
            entries = raw.entries;
          }
          return { type: 'in_game', success: true, entries };
        } catch (err) {
          console.warn('[Playgama Bridge] getEntries error:', err);
          return { type: 'in_game', success: false, error: err };
        }
      }
      return { type: 'not_available' };
    }

    loadLocalProgress() {
      try {
        const localBest = localStorage.getItem('tower_best_time');
        const localCoins = localStorage.getItem('tower_coins');
        if (localBest) {
          const parsedBest = parseFloat(localBest);
          if (parsedBest > 0) this.game.bestTime = parsedBest;
        }
        if (localCoins) {
          const parsedCoins = parseInt(localCoins, 10);
          if (!isNaN(parsedCoins)) this.game.savedTotalCoins = parsedCoins;
        }
      } catch (e) {}
    }

    async loadCloudProgress() {
      if (!this.isReady || !window.bridge || !window.bridge.storage) return;
      try {
        const results = await window.bridge.storage.get(['tower_best_time', 'tower_coins']);
        if (Array.isArray(results)) {
          const cloudBest = results[0] ? parseFloat(results[0]) : null;
          const cloudCoins = results[1] ? parseInt(results[1], 10) : null;

          if (cloudBest && cloudBest > 0) {
            if (!this.game.bestTime || cloudBest < this.game.bestTime) {
              this.game.bestTime = cloudBest;
              localStorage.setItem('tower_best_time', cloudBest.toString());
            }
          }
          if (cloudCoins !== null && !isNaN(cloudCoins)) {
            if (cloudCoins > (this.game.savedTotalCoins || 0)) {
              this.game.savedTotalCoins = cloudCoins;
              localStorage.setItem('tower_coins', cloudCoins.toString());
            }
          }
          if (this.game.updateUI) this.game.updateUI();
        }
      } catch (e) {
        console.warn('Failed loading cloud progress', e);
      }
    }
  }

  window.BridgeWrapper = BridgeWrapper;
})();
