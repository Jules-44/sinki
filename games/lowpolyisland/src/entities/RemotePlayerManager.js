import * as THREE from 'three';
import { QuadBike } from './QuadBike.js';

const COLOR_PALETTES = [
  { jacket: '#eb3467', stripe: '#2de2e6', pants: '#1b2238' }, // Cyber Coral
  { jacket: '#3b82f6', stripe: '#facc15', pants: '#1e293b' }, // Cobalt Blue
  { jacket: '#10b981', stripe: '#ffffff', pants: '#064e3b' }, // Emerald Green
  { jacket: '#8b5cf6', stripe: '#f43f5e', pants: '#2e1065' }, // Electric Violet
  { jacket: '#f97316', stripe: '#06b6d4', pants: '#431407' }, // Solar Orange
  { jacket: '#ec4899', stripe: '#a855f7', pants: '#831843' }  // Neon Magenta
];

export class RemotePlayerManager {
  constructor(scene) {
    this.scene = scene;
    this.remotePlayers = new Map();
  }

  _createPixelTexture(type, palette) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    if (type === 'jacket') {
      ctx.fillStyle = palette.jacket;
      ctx.fillRect(0, 0, 64, 64);

      // Geometric diagonal stripe
      ctx.fillStyle = palette.stripe;
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(64, 40);
      ctx.lineTo(64, 48);
      ctx.lineTo(0, 24);
      ctx.fill();

      // Deep navy bottom hem
      ctx.fillStyle = '#16192b';
      ctx.fillRect(0, 54, 64, 10);

      // Center silver zipper
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(30, 0, 4, 54);
      ctx.fillStyle = '#888888';
      ctx.fillRect(31, 0, 2, 54);
    } else if (type === 'pants') {
      ctx.fillStyle = palette.pants;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#121726';
      ctx.fillRect(0, 0, 4, 64);
      ctx.fillRect(60, 0, 4, 64);
      ctx.fillRect(16, 24, 32, 16);
      ctx.fillStyle = '#263152';
      ctx.fillRect(18, 26, 28, 12);
    } else if (type === 'sneaker') {
      ctx.fillStyle = '#e8ecf2';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#222633';
      ctx.fillRect(0, 50, 64, 14);
      ctx.fillStyle = palette.jacket;
      ctx.fillRect(8, 24, 48, 8);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
  }

  _createNameBillboard(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 15, 30, 0.78)';
    ctx.roundRect(10, 10, 236, 44, 22);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(45, 226, 230, 0.85)';
    ctx.stroke();

    ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.8, 0.45, 1);
    sprite.position.y = 2.45;
    return sprite;
  }

  _buildAuthenticRemoteAvatar(nickname, colorIdx) {
    const root = new THREE.Group();
    const palette = COLOR_PALETTES[colorIdx % COLOR_PALETTES.length];

    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe0ad82, flatShading: true });
    const jacketTex = this._createPixelTexture('jacket', palette);
    const jacketMat = new THREE.MeshLambertMaterial({ map: jacketTex, flatShading: true });
    const pantsTex = this._createPixelTexture('pants', palette);
    const pantsMat = new THREE.MeshLambertMaterial({ map: pantsTex, flatShading: true });
    const shoeTex = this._createPixelTexture('sneaker', palette);
    const shoeMat = new THREE.MeshLambertMaterial({ map: shoeTex, flatShading: true });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x161a29, flatShading: true });
    const cyanVisorMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.stripe) });

    // 1. Tapered Torso
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.72, 6);
    const torso = new THREE.Mesh(torsoGeo, jacketMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    root.add(torso);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.14, 6), darkMat);
    collar.position.y = 0.4;
    torso.add(collar);

    // 2. Head & Cap
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 5), skinMat);
    neck.position.y = 1.55;
    root.add(neck);

    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.32, 7), skinMat);
    head.position.y = 1.74;
    head.castShadow = true;
    root.add(head);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 7), darkMat);
    cap.position.y = 0.12;
    head.add(cap);

    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.18), darkMat);
    brim.position.set(0, 0.08, -0.18);
    brim.rotation.x = 0.2;
    head.add(brim);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), cyanVisorMat);
    visor.position.set(0, 0.04, 0.17);
    head.add(visor);

    // Headphones around neck
    const phoneGeo = new THREE.TorusGeometry(0.22, 0.04, 5, 10, Math.PI);
    const headphones = new THREE.Mesh(phoneGeo, darkMat);
    headphones.rotation.x = Math.PI / 2;
    headphones.position.set(0, 1.54, 0);
    root.add(headphones);

    // 3. Limbs
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.36, 1.42, 0);
    const leftUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.35, 5), jacketMat);
    leftUpper.position.y = -0.17;
    leftArmPivot.add(leftUpper);
    const leftFore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.35, 5), skinMat);
    leftFore.position.y = -0.48;
    leftArmPivot.add(leftFore);
    root.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.36, 1.42, 0);
    const rightUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.35, 5), jacketMat);
    rightUpper.position.y = -0.17;
    rightArmPivot.add(rightUpper);
    const rightFore = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.35, 5), skinMat);
    rightFore.position.y = -0.48;
    rightArmPivot.add(rightFore);
    root.add(rightArmPivot);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.16, 0.82, 0);
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 6), pantsMat);
    leftThigh.position.y = -0.21;
    leftLegPivot.add(leftThigh);
    const leftCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.42, 6), pantsMat);
    leftCalf.position.y = -0.58;
    leftLegPivot.add(leftCalf);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.36), shoeMat);
    leftShoe.position.set(0, -0.76, 0.06);
    leftLegPivot.add(leftShoe);
    root.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.16, 0.82, 0);
    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.42, 6), pantsMat);
    rightThigh.position.y = -0.21;
    rightLegPivot.add(rightThigh);
    const rightCalf = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.42, 6), pantsMat);
    rightCalf.position.y = -0.58;
    rightLegPivot.add(rightCalf);
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.36), shoeMat);
    rightShoe.position.set(0, -0.76, 0.06);
    rightLegPivot.add(rightShoe);
    root.add(rightLegPivot);

    // 4. Over-head Name Billboard
    const billboard = this._createNameBillboard(nickname);
    root.add(billboard);

    // 5. Hang Glider Delta Wing
    const gliderGroup = new THREE.Group();
    gliderGroup.position.set(0, 1.82, 0.05);
    gliderGroup.visible = false;
    const sailYellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, side: THREE.DoubleSide, flatShading: true });
    const sailPinkMat = new THREE.MeshLambertMaterial({ color: 0xec4899, side: THREE.DoubleSide, flatShading: true });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true });

    const sailGeo = new THREE.BufferGeometry();
    const sailVerts = new Float32Array([
      0.0, 0.0, 1.15, -1.2, -0.10, -0.9, 0.0, 0.06, -0.8,
      0.0, 0.0, 1.15, -2.2, -0.22, -1.05, -1.2, -0.10, -0.9,
      0.0, 0.0, 1.15, 0.0, 0.06, -0.8, 1.2, -0.10, -0.9,
      0.0, 0.0, 1.15, 1.2, -0.10, -0.9, 2.2, -0.22, -1.05
    ]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
    sailGeo.computeVertexNormals();
    gliderGroup.add(new THREE.Mesh(sailGeo, sailYellowMat));

    const keelGeo = new THREE.CylinderGeometry(0.028, 0.028, 2.05, 5);
    keelGeo.rotateX(Math.PI / 2);
    gliderGroup.add(new THREE.Mesh(keelGeo, frameMat));
    root.add(gliderGroup);

    // 6. Dedicated Quad Bike Model for Remote Player
    const quadBikeInstance = new QuadBike(this.scene, 0, 0);
    quadBikeInstance.mesh.visible = false;

    return {
      root,
      torso,
      head,
      neck,
      leftArmPivot,
      rightArmPivot,
      leftLegPivot,
      rightLegPivot,
      billboard,
      gliderGroup,
      quadBike: quadBikeInstance,
      targetPos: new THREE.Vector3(),
      targetYaw: 0,
      animTime: Math.random() * 10
    };
  }

  update(dt, playerList, localPlayerId, currentIsland) {
    const activeIds = new Set();

    for (const p of Object.values(playerList || {})) {
      if (p.playerId === localPlayerId) continue;
      if (p.island !== currentIsland) continue;

      activeIds.add(p.playerId);

      let avatar = this.remotePlayers.get(p.playerId);
      if (!avatar) {
        avatar = this._buildAuthenticRemoteAvatar(p.nickname, p.colorIndex || 0);
        avatar.root.position.set(p.x, p.y, p.z);
        avatar.targetPos.set(p.x, p.y, p.z);
        avatar.root.rotation.y = p.yaw;
        avatar.targetYaw = p.yaw;
        this.scene.add(avatar.root);
        this.remotePlayers.set(p.playerId, avatar);
      }

      avatar.targetPos.set(p.x, p.y, p.z);
      avatar.targetYaw = p.yaw;

      // Smooth interpolation of position and yaw
      avatar.root.position.lerp(avatar.targetPos, Math.min(1.0, dt * 14.0));
      let diff = avatar.targetYaw - avatar.root.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      avatar.root.rotation.y += diff * Math.min(1.0, dt * 14.0);

      // Handle Quad Bike Driving State
      if (p.isDrivingQuad) {
        avatar.gliderGroup.visible = false;
        avatar.quadBike.mesh.visible = true;

        // Position remote quad bike at avatar location
        avatar.quadBike.position.copy(avatar.root.position);
        avatar.quadBike.heading = avatar.root.rotation.y;
        avatar.quadBike.mesh.position.copy(avatar.root.position);
        avatar.quadBike.mesh.rotation.y = avatar.root.rotation.y;

        // Rotate remote quad wheels
        const speed = p.quadSpeed || 10;
        avatar.quadBike.wheelRot += (speed / avatar.quadBike.wheelRadius) * dt;
        avatar.quadBike.wheels.forEach((w) => (w.rotation.x = avatar.quadBike.wheelRot));

        // Seated rider posture
        avatar.torso.position.set(0, 0.72, -0.15);
        avatar.torso.rotation.x = 0.35;
        avatar.head.position.set(0, 1.25, -0.05);
        avatar.head.rotation.x = -0.2;
        avatar.neck.position.set(0, 1.05, -0.08);

        avatar.leftArmPivot.position.set(-0.32, 0.98, -0.12);
        avatar.leftArmPivot.rotation.set(-0.85, 0.35, 0);
        avatar.rightArmPivot.position.set(0.32, 0.98, -0.12);
        avatar.rightArmPivot.rotation.set(-0.85, -0.35, 0);

        avatar.leftLegPivot.position.set(-0.2, 0.52, -0.2);
        avatar.leftLegPivot.rotation.set(0.95, -0.2, 0);
        avatar.rightLegPivot.position.set(0.2, 0.52, -0.2);
        avatar.rightLegPivot.rotation.set(0.95, 0.2, 0);

        avatar.billboard.position.y = 2.2;
      } else if (p.isGliding) {
        // Hang Glider State
        avatar.quadBike.mesh.visible = false;
        avatar.gliderGroup.visible = true;

        avatar.torso.position.set(0, 1.15, 0);
        avatar.torso.rotation.x = -1.1;
        avatar.head.position.set(0, 1.74, 0);
        avatar.head.rotation.x = 0.65;
        avatar.neck.position.set(0, 1.55, 0);

        avatar.leftArmPivot.position.set(-0.30, 1.48, 0.08);
        avatar.leftArmPivot.rotation.set(-1.25, 0, 0);
        avatar.rightArmPivot.position.set(0.30, 1.48, 0.08);
        avatar.rightArmPivot.rotation.set(-1.25, 0, 0);

        avatar.leftLegPivot.position.set(-0.16, 0.82, 0);
        avatar.leftLegPivot.rotation.set(0.22, 0, 0);
        avatar.rightLegPivot.position.set(0.16, 0.82, 0);
        avatar.rightLegPivot.rotation.set(0.22, 0, 0);

        avatar.billboard.position.y = 2.45;
      } else {
        // Standard Walking / Running / Idle
        avatar.quadBike.mesh.visible = false;
        avatar.gliderGroup.visible = false;

        avatar.torso.position.set(0, 1.15, 0);
        avatar.torso.rotation.x = 0;
        avatar.head.position.set(0, 1.74, 0);
        avatar.head.rotation.x = 0;
        avatar.neck.position.set(0, 1.55, 0);

        avatar.leftArmPivot.position.set(-0.36, 1.42, 0);
        avatar.rightArmPivot.position.set(0.36, 1.42, 0);
        avatar.leftLegPivot.position.set(-0.16, 0.82, 0);
        avatar.rightLegPivot.position.set(0.16, 0.82, 0);

        if (p.moveState === 'RUN' || p.moveState === 'WALK' || p.moveState === 'ZOOM') {
          avatar.animTime += dt * (p.moveState === 'ZOOM' ? 22 : 14);
          const swing = Math.sin(avatar.animTime) * 0.75;
          avatar.leftLegPivot.rotation.x = swing;
          avatar.rightLegPivot.rotation.x = -swing;
          avatar.leftArmPivot.rotation.x = -swing;
          avatar.rightArmPivot.rotation.x = swing;
        } else {
          avatar.leftLegPivot.rotation.x = 0;
          avatar.rightLegPivot.rotation.x = 0;
          avatar.leftArmPivot.rotation.x = 0;
          avatar.rightArmPivot.rotation.x = 0;
        }

        avatar.billboard.position.y = 2.45;
      }
    }

    // Cleanup players who left or switched islands
    for (const [id, avatar] of this.remotePlayers.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(avatar.root);
        if (avatar.quadBike) this.scene.remove(avatar.quadBike.mesh);
        this.remotePlayers.delete(id);
      }
    }
  }

  destroy() {
    for (const avatar of this.remotePlayers.values()) {
      this.scene.remove(avatar.root);
      if (avatar.quadBike) this.scene.remove(avatar.quadBike.mesh);
    }
    this.remotePlayers.clear();
  }
}
