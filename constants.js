/**
 * Tower of Obby 3D - Global Game Constants & Configuration
 */
(function() {
  'use strict';

  const TOWER_CONFIG = {
    // Tower Architecture
    TOTAL_FLOORS: 20,
    STEPS_PER_FLOOR: 8,
    ANGLE_STEP: 0.38, // radians per platform (~21.77 deg)
    RADIUS: 10.5,
    FLOOR_HEIGHT: 9.2,
    HEIGHT_STEP: 9.2 / 8, // 1.15m per step
    SUMMIT_Y: 20 * 9.2 + 3.0,

    // Player Physical Attributes & Tuning
    PLAYER: {
      HEIGHT: 1.8,
      RADIUS: 0.4,
      WALK_SPEED: 8.5,
      SPRINT_SPEED: 12.0,
      JUMP_FORCE: 12.5,
      GRAVITY: 28.0,
      MAX_FALL_SPEED: 38.0,
      COYOTE_TIME: 0.15, // seconds grace period after walking off edges
      JUMP_BUFFER: 0.15  // seconds pre-input buffer before touching ground
    },

    // Advertisements & Monetization Rules
    ADS: {
      MIN_INTERSTITIAL_COOLDOWN_SEC: 70,
      INTERSTITIAL_FLOOR_INTERVAL: 4 // e.g. Floors 4, 8, 12, 16
    },

    // Centralized Angle & Height Helpers
    getFloorBaseAngle(floorNum) {
      return (floorNum - 1) * this.STEPS_PER_FLOOR * this.ANGLE_STEP;
    },

    getFloorBaseHeight(floorNum) {
      return (floorNum - 1) * this.FLOOR_HEIGHT;
    }
  };

  window.TOWER_CONFIG = TOWER_CONFIG;
})();
