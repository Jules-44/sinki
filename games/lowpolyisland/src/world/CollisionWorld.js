import * as THREE from 'three';

/**
 * CollisionWorld — Lightweight, robust 3D collision & platform query system.
 * Handles:
 * 1. Solid horizontal obstacle collisions (sliding along walls, boulders, pillars).
 * 2. Walkable horizontal surfaces & platforms (landing, standing on, and jumping off objects).
 * 3. Step-up tolerance for curbs and stairs.
 */
export class CollisionWorld {
  constructor() {
    this.colliders = [];
  }

  addBox(minX, maxX, minZ, maxZ, minY, maxY, isWalkableTop = true, tag = '') {
    this.colliders.push({
      type: 'box',
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      minY,
      maxY,
      isWalkableTop,
      tag
    });
  }

  addRotatedBox(cx, cz, cy, halfW, halfD, halfH, rotY, isWalkableTop = true, tag = '') {
    const cosA = Math.cos(rotY);
    const sinA = Math.sin(rotY);
    this.colliders.push({
      type: 'rotated_box',
      cx,
      cz,
      minY: cy - halfH,
      maxY: cy + halfH,
      halfW,
      halfD,
      cosA,
      sinA,
      rotY,
      isWalkableTop,
      tag
    });
  }

  addRamp(cx, cz, baseY, halfW, length, height, rotY, tag = 'ramp') {
    const cosA = Math.cos(rotY);
    const sinA = Math.sin(rotY);
    this.colliders.push({
      type: 'ramp',
      cx,
      cz,
      baseY,
      maxY: baseY + height,
      minY: baseY,
      halfW,
      length,
      height,
      cosA,
      sinA,
      rotY,
      isWalkableTop: true,
      tag
    });
  }

  addCylinder(x, z, minY, maxY, radius, isWalkableTop = true, tag = '') {
    this.colliders.push({
      type: 'cylinder',
      x,
      z,
      minY,
      maxY,
      radius,
      isWalkableTop,
      tag
    });
  }

  addBoulder(x, z, baseY, radiusX, radiusZ, height, isWalkableTop = true, tag = '') {
    this.colliders.push({
      type: 'boulder',
      x,
      z,
      minY: baseY,
      maxY: baseY + height,
      radiusX,
      radiusZ,
      height,
      isWalkableTop,
      tag
    });
  }

  addStaticBox(cx, cy, cz, w, h, d, isWalkableTop = false, tag = '') {
    this.addBox(
      cx - w * 0.5, cx + w * 0.5,
      cz - d * 0.5, cz + d * 0.5,
      cy - h * 0.5, cy + h * 0.5,
      isWalkableTop,
      tag
    );
  }

  addStaticCylinder(x, y, z, radius, height, isWalkableTop = false, tag = '') {
    this.addCylinder(x, z, y - height * 0.5, y + height * 0.5, radius, isWalkableTop, tag);
  }

  resolve(pos, radius, currentY) {
    this.resolveHorizontalCollisions(pos, radius, currentY);
  }

  /**
   * Returns the surface elevation underneath point (x, z) considering both
   * terrain and any walkable object tops beneath the player.
   */
  getSurfaceHeight(x, z, currentY, baseTerrainHeight) {
    let highest = baseTerrainHeight;
    const stepUpTolerance = 0.5; // Max height difference to step up onto a surface

    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];
      if (!col.isWalkableTop) continue;

      if (col.type === 'box') {
        if (x >= col.minX && x <= col.maxX && z >= col.minZ && z <= col.maxZ) {
          // If player is at/above top surface or stepping up onto it
          if (currentY >= col.maxY - stepUpTolerance) {
            if (col.maxY > highest) {
              highest = col.maxY;
            }
          }
        }
      } else if (col.type === 'rotated_box') {
        // Transform to local coordinates
        const dx = x - col.cx;
        const dz = z - col.cz;
        const lx = dx * col.cosA + dz * col.sinA;
        const lz = -dx * col.sinA + dz * col.cosA;

        if (Math.abs(lx) <= col.halfW && Math.abs(lz) <= col.halfD) {
          if (currentY >= col.maxY - stepUpTolerance) {
            if (col.maxY > highest) {
              highest = col.maxY;
            }
          }
        }
      } else if (col.type === 'cylinder') {
        const distSq = (x - col.x) ** 2 + (z - col.z) ** 2;
        if (distSq <= col.radius * col.radius) {
          if (currentY >= col.maxY - stepUpTolerance) {
            if (col.maxY > highest) {
              highest = col.maxY;
            }
          }
        }
      } else if (col.type === 'boulder') {
        // Scaled radial distance for ellipsoidal boulders
        const nx = (x - col.x) / col.radiusX;
        const nz = (z - col.z) / col.radiusZ;
        const dSq = nx * nx + nz * nz;
        if (dSq <= 1.0) {
          // Curved dome surface
          const domeH = col.minY + col.height * Math.sqrt(Math.max(0, 1.0 - dSq * 0.75));
          if (currentY >= domeH - stepUpTolerance) {
            if (domeH > highest) {
              highest = domeH;
            }
          }
        }
      } else if (col.type === 'ramp') {
        const dx = x - col.cx;
        const dz = z - col.cz;
        const lx = dx * col.cosA + dz * col.sinA;
        const lz = -dx * col.sinA + dz * col.cosA;

        // lx is width [-halfW, halfW], lz is length [0, length]
        if (Math.abs(lx) <= col.halfW && lz >= -0.2 && lz <= col.length + 0.25) {
          const t = Math.max(0, Math.min(1, lz / col.length));
          const rampH = col.baseY + t * col.height;
          if (currentY >= rampH - stepUpTolerance) {
            if (rampH > highest) {
              highest = rampH;
            }
          }
        }
      }
    }

    return highest;
  }

  /**
   * Resolves horizontal penetrations with solid obstacle walls.
   * Slides the player smoothly along obstacle edges.
   */
  resolveHorizontalCollisions(pos, radius, currentY, playerHeight = 1.8) {
    const playerFeet = currentY;
    const playerHead = currentY + playerHeight;
    const stepUpTolerance = 0.42;

    for (let i = 0; i < this.colliders.length; i++) {
      const col = this.colliders[i];

      // Vertical clearance checks:
      // 1. If player's feet are high enough to walk on top, don't collide horizontally with top edge
      if (col.isWalkableTop && playerFeet >= col.maxY - stepUpTolerance) {
        continue;
      }
      // 2. If player is completely below obstacle (e.g. under high walkway)
      if (playerHead <= col.minY) {
        continue;
      }
      // 3. If player is completely above obstacle
      if (playerFeet >= col.maxY) {
        continue;
      }

      // Horizontal resolution by shape with fast coarse rejection:
      if (col.type === 'box') {
        if (pos.x < col.minX - radius || pos.x > col.maxX + radius ||
            pos.z < col.minZ - radius || pos.z > col.maxZ + radius) continue;
        this._resolveBoxCollision(pos, radius, col);
      } else if (col.type === 'rotated_box') {
        this._resolveRotatedBoxCollision(pos, radius, col);
      } else if (col.type === 'cylinder') {
        const maxDist = radius + col.radius;
        if (Math.abs(pos.x - col.x) > maxDist || Math.abs(pos.z - col.z) > maxDist) continue;
        this._resolveCylinderCollision(pos, radius, col.x, col.z, col.radius);
      } else if (col.type === 'boulder') {
        const maxDist = radius + Math.max(col.radiusX, col.radiusZ);
        if (Math.abs(pos.x - col.x) > maxDist || Math.abs(pos.z - col.z) > maxDist) continue;
        const avgR = (col.radiusX + col.radiusZ) * 0.45;
        this._resolveCylinderCollision(pos, radius, col.x, col.z, avgR);
      }
    }
  }

  _resolveBoxCollision(pos, radius, box) {
    // Find closest point on AABB to player
    const closestX = Math.max(box.minX, Math.min(box.maxX, pos.x));
    const closestZ = Math.max(box.minZ, Math.min(box.maxZ, pos.z));

    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        // Outside the box, pushing out
        const overlap = radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      } else {
        // Inside the box: push to nearest face
        const leftDist = Math.abs(pos.x - box.minX);
        const rightDist = Math.abs(box.maxX - pos.x);
        const frontDist = Math.abs(pos.z - box.minZ);
        const backDist = Math.abs(box.maxZ - pos.z);

        const minDist = Math.min(leftDist, rightDist, frontDist, backDist);
        if (minDist === leftDist) pos.x = box.minX - radius;
        else if (minDist === rightDist) pos.x = box.maxX + radius;
        else if (minDist === frontDist) pos.z = box.minZ - radius;
        else pos.z = box.maxZ + radius;
      }
    }
  }

  _resolveRotatedBoxCollision(pos, radius, box) {
    // 1. Transform player pos into box local coordinate system
    const dx = pos.x - box.cx;
    const dz = pos.z - box.cz;
    const lx = dx * box.cosA + dz * box.sinA;
    const lz = -dx * box.sinA + dz * box.cosA;

    // 2. Closest point in local AABB [-halfW, halfW] x [-halfD, halfD]
    const closestLX = Math.max(-box.halfW, Math.min(box.halfW, lx));
    const closestLZ = Math.max(-box.halfD, Math.min(box.halfD, lz));

    const ldx = lx - closestLX;
    const ldz = lz - closestLZ;
    const distSq = ldx * ldx + ldz * ldz;

    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      let pushLX = 0;
      let pushLZ = 0;

      if (dist > 0.0001) {
        const overlap = radius - dist;
        pushLX = (ldx / dist) * overlap;
        pushLZ = (ldz / dist) * overlap;
      } else {
        const leftDist = Math.abs(lx - (-box.halfW));
        const rightDist = Math.abs(box.halfW - lx);
        const frontDist = Math.abs(lz - (-box.halfD));
        const backDist = Math.abs(box.halfD - lz);

        const minDist = Math.min(leftDist, rightDist, frontDist, backDist);
        if (minDist === leftDist) pushLX = -box.halfW - radius - lx;
        else if (minDist === rightDist) pushLX = box.halfW + radius - lx;
        else if (minDist === frontDist) pushLZ = -box.halfD - radius - lz;
        else pushLZ = box.halfD + radius - lz;
      }

      // 3. Transform push back to world coordinates
      // worldX = pushLX * cosA - pushLZ * sinA
      // worldZ = pushLX * sinA + pushLZ * cosA
      pos.x += pushLX * box.cosA - pushLZ * box.sinA;
      pos.z += pushLX * box.sinA + pushLZ * box.cosA;
    }
  }

  _resolveCylinderCollision(pos, radius, cx, cz, cylRadius) {
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const dist = Math.hypot(dx, dz);
    const minDist = radius + cylRadius;

    if (dist < minDist) {
      if (dist > 0.0001) {
        const overlap = minDist - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      } else {
        pos.x += minDist;
      }
    }
  }

  getGroundHeight(x, z, currentY = null, baseTerrain = 0) {
    const testY = currentY !== null ? currentY : baseTerrain;
    return this.getSurfaceHeight(x, z, testY, baseTerrain);
  }

  resolveCollisions(pos, radius, currentY) {
    return this.resolveHorizontalCollisions(pos, radius, currentY);
  }
}
