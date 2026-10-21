import * as THREE from 'three';

export const SKY_THEMES = {
  GOLDEN_HOUR: {
    id: 'GOLDEN_HOUR',
    name: 'GOLDEN HOUR',
    shortName: 'GOLDEN',
    vibe: 'Warm Honey Horizon & Bright Cobalt Zenith',
    topColor: 0x1a356b,      // Bright cobalt blue twilight
    midColor: 0x7b4a78,      // Vivid twilight magenta-rose
    horizonColor: 0xffaa2e,  // Radiant golden honey amber
    bottomColor: 0x1d2c47,
    fogColor: 0x273859,      // Clear radiant twilight fog
    fogNear: 65,
    fogFar: 360,
    ambientColor: 0xaec0ea,
    ambientIntensity: 1.45,
    hemiSky: 0xffe2a4,
    hemiGround: 0x2e3c54,
    hemiIntensity: 1.05,
    sunColor: 0xffd07e,
    sunIntensity: 2.35,
    sunDiscColor: 0xfff0aa,
    haloColor: 0xffa832
  },
  CRIMSON_DUSK: {
    id: 'CRIMSON_DUSK',
    name: 'CRIMSON DUSK',
    shortName: 'CRIMSON',
    vibe: 'Fiery Coral Horizon & Violet Twilight',
    topColor: 0x2e1e4f,      // Rich royal purple
    midColor: 0xc23b60,      // Vibrant crimson coral
    horizonColor: 0xff7c32,  // Blazing neon orange
    bottomColor: 0x301a35,
    fogColor: 0x3d2745,      // Luminous mauve fog
    fogNear: 65,
    fogFar: 350,
    ambientColor: 0xc99ec4,
    ambientIntensity: 1.4,
    hemiSky: 0xffab85,
    hemiGround: 0x3a2338,
    hemiIntensity: 1.0,
    sunColor: 0xff8c4a,
    sunIntensity: 2.3,
    sunDiscColor: 0xffdd9e,
    haloColor: 0xff4040
  },
  TROPICAL_MANGO: {
    id: 'TROPICAL_MANGO',
    name: 'TROPICAL MANGO',
    shortName: 'TROPICAL',
    vibe: 'Warm Mango Glow & Turquoise Lagoon',
    topColor: 0x174861,      // Luminous turquoise-azure
    midColor: 0x3a8c85,      // Lush tropical dusk teal
    horizonColor: 0xffb844,  // Brilliant sunny mango
    bottomColor: 0x153545,
    fogColor: 0x1e4654,      // Bright tropical sea spray fog
    fogNear: 70,
    fogFar: 370,
    ambientColor: 0x92cfd6,
    ambientIntensity: 1.45,
    hemiSky: 0xffdd94,
    hemiGround: 0x1c414c,
    hemiIntensity: 1.1,
    sunColor: 0xffd470,
    sunIntensity: 2.4,
    sunDiscColor: 0xfffaa8,
    haloColor: 0x4fe0c2
  },
  PASTEL_PEACH: {
    id: 'PASTEL_PEACH',
    name: 'PASTEL PEACH',
    shortName: 'PEACH',
    vibe: 'Dreamy Lilac & Pastel Peach (Liquid DnB)',
    topColor: 0x282352,      // Soft pastel indigo
    midColor: 0x8a74a8,      // Dreamy lilac lavender
    horizonColor: 0xffa98c,  // Warm pastel peach
    bottomColor: 0x2f2445,
    fogColor: 0x3c3459,      // Lavender dusk mist
    fogNear: 65,
    fogFar: 350,
    ambientColor: 0xc4b4db,
    ambientIntensity: 1.4,
    hemiSky: 0xffcfba,
    hemiGround: 0x382d4c,
    hemiIntensity: 1.05,
    sunColor: 0xffcdae,
    sunIntensity: 2.2,
    sunDiscColor: 0xfff0df,
    haloColor: 0xf58ea8
  },
  AFTERNOON_GOLD: {
    id: 'AFTERNOON_GOLD',
    name: 'AFTERNOON GOLD',
    shortName: 'AFTERNOON',
    vibe: 'Crisp High Sun & Maximum Island Visibility',
    topColor: 0x32649e,      // Clear azure blue
    midColor: 0x6ca5cd,      // Bright coastal cerulean
    horizonColor: 0xffd775,  // Radiant afternoon gold
    bottomColor: 0x264666,
    fogColor: 0x406a8f,      // Bright atmospheric sea fog
    fogNear: 75,
    fogFar: 400,
    ambientColor: 0xc4def5,
    ambientIntensity: 1.6,
    hemiSky: 0xfff3c8,
    hemiGround: 0x35506b,
    hemiIntensity: 1.25,
    sunColor: 0xffe699,
    sunIntensity: 2.6,
    sunDiscColor: 0xfffae6,
    haloColor: 0xffd870
  },
  CYBER_MIDNIGHT: {
    id: 'CYBER_MIDNIGHT',
    name: 'SYNTHWAVE DUSK',
    shortName: 'DUSK',
    vibe: 'Golden-Coral Dusk Horizon & Electric Lavender Zenith',
    topColor: 0x221f45,      // Mellow indigo twilight (not pitch black)
    midColor: 0x6e387e,      // Rich dusk magenta-violet
    horizonColor: 0xff6b60,  // Radiant golden-coral dusk glow
    bottomColor: 0x2c223c,
    fogColor: 0x483256,      // Luminous twilight haze (smooth atmospheric blend)
    fogNear: 150,
    fogFar: 800,             // Expansive draw distance across multi-block city
    ambientColor: 0x9c8dbd,  // Soft lavender-blue ambient fill so building details are clearly visible
    ambientIntensity: 2.4,
    hemiSky: 0xff99b0,      // Warm dusk sky bounce
    hemiGround: 0x3d3a54,   // Soft street reflection
    hemiIntensity: 1.6,
    sunColor: 0xffb366,      // Warm golden dusk sun accent
    sunIntensity: 3.2,
    sunDiscColor: 0xff4f38,  // Radiant golden-coral sunset disc
    haloColor: 0xffbb44      // Warm golden corona
  }
};

export const SKY_THEME_KEYS = Object.keys(SKY_THEMES);

/**
 * SceneManager — Sets up the Three.js scene, atmospheric lighting,
 * distance fog, low-poly sky dome, and WebGL rendering pipeline.
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.currentThemeKey = 'GOLDEN_HOUR';

    // 1. Scene
    this.scene = new THREE.Scene();
    
    // Twilight dusk palette: deep indigo-slate fog
    const defaultTheme = SKY_THEMES[this.currentThemeKey];
    this.scene.background = new THREE.Color(defaultTheme.fogColor);
    this.scene.fog = new THREE.Fog(defaultTheme.fogColor, defaultTheme.fogNear, defaultTheme.fogFar);

    // 2. Camera (far plane 950m for vast multi-block city horizons)
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.1, 950);
    this.camera.position.set(0, 5, 12);

    // 3. Renderer
    this.retroPixelMode = false; // HD crisp graphics by default (PS1 pixelation is optional via toggle)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.34;
    this.container.appendChild(this.renderer.domElement);
    this._applyResolution();

    // 4. Atmospheric Lights
    this._setupLighting();

    // 5. Sky Dome with rich 3-stop sunset gradient
    this._setupSkyGradient();

    // 6. Low-poly setting Sun disc on the ocean horizon
    this._setupSunDisc();

    // Apply default theme to initialize all uniforms and lights cleanly
    this.applySkyTheme(this.currentThemeKey);

    // Resize listener
    window.addEventListener('resize', () => this.onWindowResize());
  }

  _setupLighting() {
    const theme = SKY_THEMES[this.currentThemeKey];

    // Ambient light: cool shadow fill
    this.ambientLight = new THREE.AmbientLight(theme.ambientColor, theme.ambientIntensity);
    this.scene.add(this.ambientLight);

    // Hemisphere light for natural sky/ground bounce
    this.hemiLight = new THREE.HemisphereLight(theme.hemiSky, theme.hemiGround, theme.hemiIntensity);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    // Directional Sun low on the horizon (aligned with setting sun disc at -65, 18, -180)
    this.sunLight = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    this.sunLight.position.set(-65, 30, -170);
    this.sunLight.target.position.set(0, 0, 0);
    this.scene.add(this.sunLight.target);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 280;
    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
  }

  _setupSkyGradient() {
    const theme = SKY_THEMES[this.currentThemeKey];

    // Low-poly retro sky hemisphere covering entire city expanse
    const skyGeo = new THREE.SphereGeometry(850, 24, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(theme.topColor) },
        midColor: { value: new THREE.Color(theme.midColor) },
        horizonColor: { value: new THREE.Color(theme.horizonColor) },
        bottomColor: { value: new THREE.Color(theme.bottomColor) },
        offset: { value: 16.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform float offset;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          if (h >= 0.0) {
            // Rich 3-stop atmospheric transition:
            // Warm horizon -> Dusky twilight belt -> Deep zenith
            float tMid = smoothstep(0.0, 0.28, h);
            float tTop = smoothstep(0.18, 0.85, h);
            vec3 c = mix(horizonColor, midColor, tMid);
            c = mix(c, topColor, tTop);
            gl_FragColor = vec4(c, 1.0);
          } else {
            float b = clamp(-h * 2.5, 0.0, 1.0);
            gl_FragColor = vec4(mix(horizonColor, bottomColor, b), 1.0);
          }
        }
      `
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);
  }

  _setupSunDisc() {
    const theme = SKY_THEMES[this.currentThemeKey];

    this.sunGroup = new THREE.Group();
    // Low-poly 24-sided circle disc
    const sunGeo = new THREE.CircleGeometry(15, 24);
    this.sunDiscMat = new THREE.MeshBasicMaterial({
      color: theme.sunDiscColor,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const sunDisc = new THREE.Mesh(sunGeo, this.sunDiscMat);
    this.sunGroup.add(sunDisc);

    // Glowing atmospheric corona halo
    const haloGeo = new THREE.RingGeometry(15, 25, 24);
    this.sunHaloMat = new THREE.MeshBasicMaterial({
      color: theme.haloColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeo, this.sunHaloMat);
    this.sunGroup.add(halo);

    // Position sun disc dipping into ocean horizon
    this.sunGroup.position.set(-65, 16, -180);
    this.sunGroup.lookAt(0, 16, 0); // Face inward towards island
    this.scene.add(this.sunGroup);
  }

  /**
   * Apply a sunset sky theme by ID ('GOLDEN_AMBER', 'PASTEL_DUSK', 'TROPICAL_TEAL', 'BLUE_HOUR')
   */
  applySkyTheme(themeId) {
    const theme = SKY_THEMES[themeId] || SKY_THEMES.GOLDEN_HOUR;
    this.currentThemeKey = theme.id;

    // 1. Update Sky Shader Uniforms
    if (this.skyMat && this.skyMat.uniforms) {
      this.skyMat.uniforms.topColor.value.setHex(theme.topColor);
      this.skyMat.uniforms.midColor.value.setHex(theme.midColor);
      this.skyMat.uniforms.horizonColor.value.setHex(theme.horizonColor);
      this.skyMat.uniforms.bottomColor.value.setHex(theme.bottomColor);
    }

    // 2. Update Scene Fog & Background
    if (this.scene.fog) {
      this.scene.fog.color.setHex(theme.fogColor);
      this.scene.fog.near = theme.fogNear;
      this.scene.fog.far = theme.fogFar;
    }
    this.scene.background.setHex(theme.fogColor);

    // 3. Update Lights
    if (this.ambientLight) {
      this.ambientLight.color.setHex(theme.ambientColor);
      this.ambientLight.intensity = theme.ambientIntensity;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(theme.hemiSky);
      this.hemiLight.groundColor.setHex(theme.hemiGround);
      this.hemiLight.intensity = theme.hemiIntensity;
    }
    if (this.sunLight) {
      this.sunLight.color.setHex(theme.sunColor);
      this.sunLight.intensity = theme.sunIntensity;
    }

    // 4. Update Sun Disc & Corona
    if (this.sunDiscMat) {
      this.sunDiscMat.color.setHex(theme.sunDiscColor);
    }
    if (this.sunHaloMat) {
      this.sunHaloMat.color.setHex(theme.haloColor);
    }

    return theme;
  }

  /**
   * Cycle to next sunset theme in order
   */
  cycleSkyTheme() {
    const idx = SKY_THEME_KEYS.indexOf(this.currentThemeKey);
    const nextIdx = (idx + 1) % SKY_THEME_KEYS.length;
    return this.applySkyTheme(SKY_THEME_KEYS[nextIdx]);
  }

  _applyResolution() {
    const retroOverlay = document.getElementById('retro-overlay');
    const width = this.container ? (this.container.clientWidth || window.innerWidth) : window.innerWidth;
    const height = this.container ? (this.container.clientHeight || window.innerHeight) : window.innerHeight;

    if (this.retroPixelMode) {
      // 480x270 aspect-scaled resolution for authentic PS1 / late-90s look
      const scaleFactor = 2.2;
      const w = Math.round(width / scaleFactor);
      const h = Math.round(height / scaleFactor);
      this.renderer.setSize(w, h, false);
      this.renderer.domElement.style.imageRendering = 'pixelated';
    } else {
      // Crisp native resolution with smooth edges
      this.renderer.setSize(width, height, true);
      this.renderer.domElement.style.imageRendering = 'auto';
    }
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (retroOverlay) {
      if (this.retroPixelMode) retroOverlay.classList.add('active');
      else retroOverlay.classList.remove('active');
    }
  }

  toggleRetroPixelMode() {
    this.retroPixelMode = !this.retroPixelMode;
    this._applyResolution();
    return this.retroPixelMode;
  }

  onWindowResize() {
    this._applyResolution();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
