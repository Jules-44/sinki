import * as THREE from 'three';

export const CameraMode = {
  THIRD_PERSON: '3RD PERSON [V]',
  FIRST_PERSON: '1ST PERSON [V]'
};

/**
 * CameraController — Dual-mode camera system supporting smooth 3rd-person chase
 * and 1st-person exploration with seamless toggle.
 */
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.mode = CameraMode.THIRD_PERSON;

    // Chase camera parameters
    this.distance = 5.8;
    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();

    // Callback on view toggle
    this.onModeChange = null;
  }

  toggleMode(player) {
    if (this.mode === CameraMode.THIRD_PERSON) {
      this.mode = CameraMode.FIRST_PERSON;
      if (player) player.setVisible(false);
    } else {
      this.mode = CameraMode.THIRD_PERSON;
      if (player) player.setVisible(true);
    }

    if (this.onModeChange) {
      this.onModeChange(this.mode);
    }
  }

  getMode() {
    return this.mode;
  }

  reset() {
    this.currentPosition.set(0, 0, 0);
    this.currentTarget.set(0, 0, 0);
  }

  update(dt, player, input) {
    if (!player) return;

    // Dynamic FOV adjustment for high-speed Zoom & Quad Nitro Boost & Jumps & Gliding
    let targetFov = 62;
    if (player.isDrivingQuad) {
      if (player.quadTurbo) {
        targetFov = 84; // Intense nitro tunnel-vision rush!
      } else if (player.quadSpeed > 10) {
        targetFov = 72;
      }
    } else if (player.isGliding) {
      targetFov = 75; // Majestic panoramic flight view
    } else if (player.moveState === 'ZOOM' && player.isMoving) {
      targetFov = 73;
    }

    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 7.0);
      this.camera.updateProjectionMatrix();
    }

    const yaw = input.mouse.yaw;
    const pitch = input.mouse.pitch;

    if (this.mode === CameraMode.FIRST_PERSON) {
      // 1st Person: Camera directly at player's eye level
      const eyePos = player.getEyePosition();
      this.camera.position.copy(eyePos);

      // Compute look-at point from spherical coordinates (positive pitch = up toward sky)
      const forward = new THREE.Vector3(
        -Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch)
      );
      const target = eyePos.clone().add(forward);
      this.camera.lookAt(target);

    } else {
      // 3rd Person: Smooth chase camera orbiting behind player
      const targetPos = player.position.clone();
      targetPos.y += player.isGliding ? 1.4 : 1.1; // Base torso level

      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      // Positive pitch = tilt view up to sky (camera lowers, look target elevates)
      // Negative pitch = tilt view down to ground (camera elevates, look target lowers)
      const currentDistance = player.isGliding ? 7.6 : this.distance;
      const camElevation = player.isGliding ? 2.1 : 1.35;
      const offsetX = Math.sin(yaw) * cosPitch * currentDistance;
      const offsetY = camElevation - sinPitch * currentDistance;
      const offsetZ = Math.cos(yaw) * cosPitch * currentDistance;

      const idealCameraPos = new THREE.Vector3(
        targetPos.x + offsetX,
        targetPos.y + offsetY,
        targetPos.z + offsetZ
      );

      // Keep camera above ground minimum
      const groundMin = (player.position.y) + 0.5;
      if (idealCameraPos.y < groundMin) idealCameraPos.y = groundMin;

      const lookTarget = targetPos.clone();
      lookTarget.y += sinPitch * 1.6;

      // Initialize on first frame immediately
      if (this.currentPosition.lengthSq() < 0.001) {
        this.currentPosition.copy(idealCameraPos);
        this.currentTarget.copy(lookTarget);
      } else {
        const t = Math.min(1.0, dt * 10);
        this.currentPosition.lerp(idealCameraPos, t);
        this.currentTarget.lerp(lookTarget, t);
      }

      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentTarget);
    }
  }
}
