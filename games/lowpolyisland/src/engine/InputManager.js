/**
 * InputManager — Handles keyboard and mouse/touchpad look state.
 * Supports:
 * 1. Two-finger trackpad swipe look (zero clicks needed!).
 * 2. Pointer-lock look (click canvas to lock cursor, move 1 finger freely).
 * 3. Arrow keys look (laptop friendly).
 * 4. Click & drag look.
 */
export class InputManager {
  constructor(domElement) {
    this.domElement = domElement || document.body;
    this.keys = {};
    this.mouse = {
      isDragging: false,
      isPointerLocked: false,
      deltaX: 0,
      deltaY: 0,
      prevX: 0,
      prevY: 0,
      pitch: 0.08, // Level horizon look angle
      yaw: 0.0     // Facing straight down the scenic pier
    };

    // Camera control preferences
    this.arrowControlsCamera = true; // True: Arrows orbit camera
    this.keyLookSpeed = 2.4;         // Radians per second for arrow key camera orbit
    this.trackpadLookSpeed = 0.0035;  // Sensitivity for 2-finger trackpad swipe

    // Callback hooks
    this.onCameraToggle = null; // 'V'
    this.onInteract = null;     // 'E'
    this.onSkyToggle = null;     // 'T'
    this.onLevelSelect = null;   // 'L'
    this.onArrowModeToggle = null;
    this.onPointerLockChange = null;

    // Running speed tracking (Walk, Run, Zoom)
    this.lastShiftPressTime = 0;
    this.isDoubleTapZoom = false;
    this.sprintHoldDuration = 0;

    this._bindEvents();
  }

  setArrowMode(controlsCamera) {
    this.arrowControlsCamera = controlsCamera;
    if (this.onArrowModeToggle) {
      this.onArrowModeToggle(this.arrowControlsCamera);
    }
  }

  toggleArrowMode() {
    this.setArrowMode(!this.arrowControlsCamera);
    return this.arrowControlsCamera;
  }

  requestPointerLock() {
    try {
      this.domElement.requestPointerLock();
    } catch (err) {
      console.warn("Pointer lock error:", err);
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  _bindEvents() {
    // 1. Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      // Prevent default page scroll on arrow keys / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      // Double-tap Shift detection for instant ZOOM
      if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
        const now = performance.now();
        if (now - this.lastShiftPressTime < 380) {
          this.isDoubleTapZoom = true;
        }
        this.lastShiftPressTime = now;
      }

      if (e.code === 'KeyV' && !e.repeat) {
        if (this.onCameraToggle) this.onCameraToggle();
      }

      if (e.code === 'KeyT' && !e.repeat) {
        if (this.onSkyToggle) this.onSkyToggle();
      }

      if (e.code === 'KeyE' && !e.repeat) {
        if (this.onInteract) this.onInteract();
      }

      if (e.code === 'KeyL' && !e.repeat) {
        if (this.onLevelSelect) this.onLevelSelect();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;

      // If shift is released, reset double-tap zoom and hold duration
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (!this.keys['ShiftLeft'] && !this.keys['ShiftRight']) {
          this.isDoubleTapZoom = false;
          this.sprintHoldDuration = 0;
        }
      }
    });

    // Reset keys on window blur so keys (like Shift or WASD) never get stuck
    window.addEventListener('blur', () => {
      this.keys = {};
      this.isDoubleTapZoom = false;
      this.sprintHoldDuration = 0;
      this.mouse.isDragging = false;
    });

    // 2. Trackpad Two-Finger Swipe (wheel event) — ZERO CLICKS NEEDED!
    window.addEventListener('wheel', (e) => {
      // Don't intercept if scrolling over walkman player or range slider
      if (e.target.closest('#walkman') || e.target.closest('input')) return;
      e.preventDefault();

      const maxPitch = Math.PI / 3.4;
      const minPitch = -Math.PI / 3.2;

      this.mouse.yaw -= e.deltaX * this.trackpadLookSpeed;
      this.mouse.pitch -= e.deltaY * this.trackpadLookSpeed; // Standard non-inverted: swipe up tilts camera up
      this.mouse.pitch = Math.max(minPitch, Math.min(maxPitch, this.mouse.pitch));
    }, { passive: false });

    // 3. Pointer Lock state tracking
    document.addEventListener('pointerlockchange', () => {
      this.mouse.isPointerLocked = (document.pointerLockElement === this.domElement);
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.mouse.isPointerLocked);
      }
    });

    // 4. Mouse click & drag fallback
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.target.closest('#walkman') || e.target.closest('button') || e.target.closest('input')) return;
      this.mouse.isDragging = true;
      this.mouse.prevX = e.clientX;
      this.mouse.prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.mouse.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      const maxPitch = Math.PI / 3.4;
      const minPitch = -Math.PI / 3.2;

      // Pointer lock active: 1 finger moves freely without clicking!
      if (this.mouse.isPointerLocked) {
        const sens = 0.0028;
        this.mouse.yaw -= (e.movementX || 0) * sens;
        this.mouse.pitch -= (e.movementY || 0) * sens; // Non-inverted: push mouse up tilts view up
        this.mouse.pitch = Math.max(minPitch, Math.min(maxPitch, this.mouse.pitch));
        return;
      }

      // Dragging active
      if (!this.mouse.isDragging) return;

      const dx = e.clientX - this.mouse.prevX;
      const dy = e.clientY - this.mouse.prevY;
      this.mouse.prevX = e.clientX;
      this.mouse.prevY = e.clientY;

      const sensitivity = 0.004;
      this.mouse.yaw -= dx * sensitivity;
      this.mouse.pitch -= dy * sensitivity; // Non-inverted: drag up tilts view up
      this.mouse.pitch = Math.max(minPitch, Math.min(maxPitch, this.mouse.pitch));
    });

    // 5. Touchscreen support
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.target.closest('#walkman') || touch.target.closest('button')) return;
        this.mouse.isDragging = true;
        this.mouse.prevX = touch.clientX;
        this.mouse.prevY = touch.clientY;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.mouse.isDragging || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const dx = touch.clientX - this.mouse.prevX;
      const dy = touch.clientY - this.mouse.prevY;
      this.mouse.prevX = touch.clientX;
      this.mouse.prevY = touch.clientY;

      const sensitivity = 0.005;
      this.mouse.yaw -= dx * sensitivity;
      this.mouse.pitch -= dy * sensitivity;
      this.mouse.pitch = Math.max(-Math.PI / 3.2, Math.min(Math.PI / 3.4, this.mouse.pitch));
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.mouse.isDragging = false;
    });
  }

  update(dt) {
    // Track continuous sprint duration (auto-surges to Zoom after 1.2s of running)
    if (this.isSprint()) {
      this.sprintHoldDuration += dt;
    } else {
      this.sprintHoldDuration = 0;
      this.isDoubleTapZoom = false;
    }

    // Arrow keys camera look (active by default for laptop users)
    if (this.arrowControlsCamera) {
      const maxPitch = Math.PI / 3.4;
      const minPitch = -Math.PI / 3.2;

      if (this.keys['ArrowLeft']) {
        this.mouse.yaw += this.keyLookSpeed * dt;
      }
      if (this.keys['ArrowRight']) {
        this.mouse.yaw -= this.keyLookSpeed * dt;
      }
      if (this.keys['ArrowUp']) {
        this.mouse.pitch = Math.min(maxPitch, this.mouse.pitch + this.keyLookSpeed * dt); // Up tilts camera up
      }
      if (this.keys['ArrowDown']) {
        this.mouse.pitch = Math.max(minPitch, this.mouse.pitch - this.keyLookSpeed * dt); // Down tilts camera down
      }
    }
  }

  isForward() {
    return !!(this.keys['KeyW'] || (!this.arrowControlsCamera && this.keys['ArrowUp']));
  }

  isBackward() {
    return !!(this.keys['KeyS'] || (!this.arrowControlsCamera && this.keys['ArrowDown']));
  }

  isLeft() {
    return !!(this.keys['KeyA'] || (!this.arrowControlsCamera && this.keys['ArrowLeft']));
  }

  isRight() {
    return !!(this.keys['KeyD'] || (!this.arrowControlsCamera && this.keys['ArrowRight']));
  }

  isSprint() {
    return !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  isZoom() {
    if (!this.isSprint()) return false;
    // 1. Explicit secondary modifier (Shift + Alt / Ctrl / KeyZ)
    if (this.keys['AltLeft'] || this.keys['AltRight'] || this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyZ']) {
      return true;
    }
    // 2. Double-tap Shift (tap Shift then hold Shift)
    if (this.isDoubleTapZoom) {
      return true;
    }
    // 3. Continuous sprint acceleration (after holding Shift for > 1.1s)
    if (this.sprintHoldDuration > 1.1) {
      return true;
    }
    return false;
  }

  isJump() {
    return !!this.keys['Space'];
  }
}
