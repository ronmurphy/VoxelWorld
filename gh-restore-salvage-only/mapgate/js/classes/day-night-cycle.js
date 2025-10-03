class DayNightCycle {
  constructor(scene3D) {
    // Store reference to the Scene3D controller
    this.scene3D = scene3D;
    this.scene = scene3D.scene;
    
    // Time settings
    this.currentTime = 12; // Start at noon (in 24-hour format)
    this.cycleDuration = 600; // Full day cycle in seconds (10 minutes)
    this.timeScale = 1.0;     // Time multiplier (1.0 = normal speed)
    this.isActive = false;    // Whether cycle is running or paused
    this.lastUpdate = Date.now();
    
    // UI elements
    this.controls = null;
    this.timeDisplay = null;
    
    // Resource paths (these will be updated when resources are loaded)
    this.skyboxResources = {
      dawn: null,
      day: null,
      dusk: null,
      night: null
    };
    
    // Initialize settings for lighting
    this.colorSettings = {
      dawn: {
        directional: { color: 0xffcb8c, intensity: 0.7 },
        ambient: { color: 0x8e93ae, intensity: 0.4 },
        sky: 0xffd6b6,
        fogColor: 0xeec9a5,
        fogDensity: 0.01
      },
      day: {
        directional: { color: 0xffffff, intensity: 1.0 },
        ambient: { color: 0x90b0ff, intensity: 0.5 },
        sky: 0x87ceeb,
        fogColor: 0xf0f5ff,
        fogDensity: 0.005
      },
      dusk: {
        directional: { color: 0xff9d4a, intensity: 0.5 },
        ambient: { color: 0x7f5783, intensity: 0.3 },
        sky: 0xff7e46,
        fogColor: 0xc9546d,
        fogDensity: 0.02
      },
      night: {
        directional: { color: 0x4876d5, intensity: 0.2 },
        ambient: { color: 0x243b71, intensity: 0.2 },
        sky: 0x141f34,
        fogColor: 0x0f1a2d,
        fogDensity: 0.03
      }
    };
    
    // Initialize lights
    this.setupLights();
    
    // Set up skybox if we have the resources
    this.setupSkybox();
  }
  
  /**
   * Sets up the light sources for the day/night cycle
   */
  setupLights() {
    // Main directional light (sun/moon)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    
    // Configure shadow properties
    if (this.scene3D.preferences && this.scene3D.preferences.shadowsEnabled) {
      this.directionalLight.shadow.mapSize.width = 2048;
      this.directionalLight.shadow.mapSize.height = 2048;
      this.directionalLight.shadow.camera.near = 0.5;
      this.directionalLight.shadow.camera.far = 50;
      this.directionalLight.shadow.camera.left = -20;
      this.directionalLight.shadow.camera.right = 20;
      this.directionalLight.shadow.camera.top = 20;
      this.directionalLight.shadow.camera.bottom = -20;
      this.directionalLight.shadow.bias = -0.0005;
    }
    
    this.scene.add(this.directionalLight);
    
    // Ambient light (general illumination)
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(this.ambientLight);
    
    // Store initial background color
    this.initialBackground = this.scene.background ? this.scene.background.clone() : new THREE.Color(0x222222);
  }
  
  /**
   * Sets up the skybox if resources are available
   */
  async setupSkybox() {
    try {
      // Try to load skybox resources if they're not already loaded
      await this.loadSkyboxResources();
      
      // If we have resources, create the skybox
      if (this.hasSkyboxResources()) {
        this.createSkybox();
      }
    } catch (error) {
      console.warn('Could not set up skybox:', error);
    }
  }
  
  /**
   * Loads skybox resources from resource manager
   */
  async loadSkyboxResources() {
    if (!this.scene3D.resourceManager) {
      console.warn('Resource manager not available, skipping skybox resources');
      return;
    }
    
    // Try loading from splash-art > background first
    try {
      const backgrounds = this.scene3D.resourceManager.resources.splashArt.background;
      
      if (backgrounds) {
        // Check for daylight cycle backgrounds
        ['dawn', 'day', 'dusk', 'night'].forEach(timeOfDay => {
          const match = Array.from(backgrounds.values()).find(bg => 
            bg.name.toLowerCase().includes(timeOfDay) && 
            bg.name.toLowerCase().includes('sky')
          );
          
          if (match) {
            this.skyboxResources[timeOfDay] = match.data;
            console.log(`Found skybox for ${timeOfDay}:`, match.name);
          }
        });
      }
    } catch (error) {
      console.warn('Error loading skybox resources from backgrounds:', error);
    }
    
    // If we don't have all resources, try environmental textures
    if (!this.hasSkyboxResources() && this.scene3D.resourceManager.resources.textures.environmental) {
      try {
        const envTextures = this.scene3D.resourceManager.resources.textures.environmental;
        
        ['dawn', 'day', 'dusk', 'night'].forEach(timeOfDay => {
          if (!this.skyboxResources[timeOfDay]) {
            const match = Array.from(envTextures.values()).find(tex => 
              tex.name.toLowerCase().includes(timeOfDay) && 
              tex.name.toLowerCase().includes('sky')
            );
            
            if (match) {
              this.skyboxResources[timeOfDay] = match.data;
              console.log(`Found skybox for ${timeOfDay} in environmental textures:`, match.name);
            }
          }
        });
      } catch (error) {
        console.warn('Error loading skybox resources from environmental textures:', error);
      }
    }
  }
  
  /**
   * Checks if all skybox resources are loaded
   */
  hasSkyboxResources() {
    return ['dawn', 'day', 'dusk', 'night'].every(time => !!this.skyboxResources[time]);
  }
  
  /**
   * Creates a skybox using the loaded resources
   */
  createSkybox() {
    // Create textures for each time of day
    this.skyboxTextures = {};
    
    Object.entries(this.skyboxResources).forEach(([time, dataUrl]) => {
      const texture = new THREE.TextureLoader().load(dataUrl);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.skyboxTextures[time] = texture;
    });
    
    // Set initial skybox
    this.updateSkybox();
  }
  
  /**
   * Updates the skybox based on current time
   */
  updateSkybox() {
    if (!this.hasSkyboxResources() || !this.skyboxTextures) return;
    
    // Determine which skybox textures to blend based on time
    let texture1, texture2, blend;
    
    if (this.currentTime >= 5 && this.currentTime < 8) {
      // Dawn transition (5am-8am)
      texture1 = this.skyboxTextures.dawn;
      texture2 = this.skyboxTextures.day;
      blend = (this.currentTime - 5) / 3;
    }
    else if (this.currentTime >= 8 && this.currentTime < 17) {
      // Daytime (8am-5pm)
      texture1 = this.skyboxTextures.day;
      texture2 = this.skyboxTextures.day;
      blend = 0;
    }
    else if (this.currentTime >= 17 && this.currentTime < 20) {
      // Dusk transition (5pm-8pm)
      texture1 = this.skyboxTextures.day;
      texture2 = this.skyboxTextures.dusk;
      blend = (this.currentTime - 17) / 3;
    }
    else if (this.currentTime >= 20 && this.currentTime < 22) {
      // Evening transition (8pm-10pm)
      texture1 = this.skyboxTextures.dusk;
      texture2 = this.skyboxTextures.night;
      blend = (this.currentTime - 20) / 2;
    }
    else {
      // Nighttime (10pm-5am)
      texture1 = this.skyboxTextures.night;
      texture2 = this.skyboxTextures.night;
      blend = 0;
    }
    
    // Set the appropriate texture as environment map
    // Note: For simplicity, we're not blending textures, just switching between them
    // A more advanced approach would use a custom shader to blend between textures
    if (blend < 0.5) {
      this.scene.environment = texture1;
    } else {
      this.scene.environment = texture2;
    }
  }
  
  /**
   * Updates lighting based on current time
   */
  updateLighting() {
    // Calculate sun position based on time of day
    const sunAngle = ((this.currentTime - 6) / 12) * Math.PI; // Sun rises at 6am, peaks at noon, sets at 6pm
    const sunX = Math.cos(sunAngle) * 10;
    const sunY = Math.max(0.1, Math.sin(sunAngle) * 10); // Keep light slightly above horizon
    this.directionalLight.position.set(sunX, sunY, 0);
    
    // Determine which color settings to blend based on time
    let settings1, settings2, blend;
    
    if (this.currentTime >= 5 && this.currentTime < 8) {
      // Dawn (5am-8am)
      settings1 = this.colorSettings.dawn;
      settings2 = this.colorSettings.day;
      blend = (this.currentTime - 5) / 3;
    }
    else if (this.currentTime >= 8 && this.currentTime < 17) {
      // Day (8am-5pm)
      settings1 = this.colorSettings.day;
      settings2 = this.colorSettings.day;
      blend = 0;
    }
    else if (this.currentTime >= 17 && this.currentTime < 20) {
      // Dusk (5pm-8pm)
      settings1 = this.colorSettings.day;
      settings2 = this.colorSettings.dusk;
      blend = (this.currentTime - 17) / 3;
    }
    else if (this.currentTime >= 20 && this.currentTime < 22) {
      // Evening (8pm-10pm)
      settings1 = this.colorSettings.dusk;
      settings2 = this.colorSettings.night;
      blend = (this.currentTime - 20) / 2;
    }
    else {
      // Night (10pm-5am)
      settings1 = this.colorSettings.night;
      settings2 = this.colorSettings.night;
      blend = 0;
    }
    
    // Blend colors and intensities
    this.blendLightingSettings(settings1, settings2, blend);
  }
  
  /**
   * Blends between two lighting settings based on blend factor
   */
  blendLightingSettings(settings1, settings2, blend) {
    // Blend directional light
    const directionalColor = this.blendColors(
      settings1.directional.color,
      settings2.directional.color,
      blend
    );
    this.directionalLight.color.set(directionalColor);
    this.directionalLight.intensity = this.lerp(
      settings1.directional.intensity,
      settings2.directional.intensity,
      blend
    );
    
    // Blend ambient light
    const ambientColor = this.blendColors(
      settings1.ambient.color,
      settings2.ambient.color,
      blend
    );
    this.ambientLight.color.set(ambientColor);
    this.ambientLight.intensity = this.lerp(
      settings1.ambient.intensity,
      settings2.ambient.intensity,
      blend
    );
    
    // Blend sky/background color
    const skyColor = this.blendColors(
      settings1.sky,
      settings2.sky,
      blend
    );
    
    // Only change background if we're not using a skybox
    if (!this.scene.environment) {
      this.scene.background = new THREE.Color(skyColor);
    }
    
    // Update fog if it exists
    if (this.scene.fog) {
      const fogColor = this.blendColors(
        settings1.fogColor,
        settings2.fogColor,
        blend
      );
      this.scene.fog.color.set(fogColor);
      
      // Adjust fog density if it's exponential fog
      if (this.scene.fog.isExponentialFog) {
        this.scene.fog.density = this.lerp(
          settings1.fogDensity,
          settings2.fogDensity,
          blend
        );
      }
    }
  }
  
  /**
   * Blends between two colors using a blend factor
   */
  blendColors(color1, color2, blend) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    
    const r = this.lerp(c1.r, c2.r, blend);
    const g = this.lerp(c1.g, c2.g, blend);
    const b = this.lerp(c1.b, c2.b, blend);
    
    return new THREE.Color(r, g, b);
  }
  
  /**
   * Linear interpolation helper
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  /**
   * Creates UI controls for the day/night cycle
   */
  createControls() {
    // Create container
    const container = document.createElement('div');
    container.className = 'day-night-controls';
    container.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 10px;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 1000;
      min-width: 200px;
    `;
    
    // Time display
    const timeDisplay = document.createElement('div');
    timeDisplay.style.cssText = `
      font-family: monospace;
      font-size: 16px;
      text-align: center;
      margin-bottom: 5px;
    `;
    timeDisplay.textContent = this.formatTime(this.currentTime);
    
    // Time slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 24;
    slider.step = 0.1;
    slider.value = this.currentTime;
    slider.style.width = '100%';
    
    // Controls row
    const controlsRow = document.createElement('div');
    controlsRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 5px;
    `;
    
    // Play/pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.innerHTML = `<span class="material-icons">${this.isActive ? 'pause' : 'play_arrow'}</span>`;
    playPauseBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 4px;
      padding: 5px 8px;
      cursor: pointer;
    `;
    
    // Speed controls
    const speedControls = document.createElement('div');
    speedControls.style.cssText = `
      display: flex;
      gap: 5px;
    `;
    
    const speeds = [0.5, 1, 2, 5];
    speeds.forEach(speed => {
      const btn = document.createElement('button');
      btn.textContent = `${speed}x`;
      btn.style.cssText = `
        background: ${this.timeScale === speed ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)'};
        border: none;
        color: white;
        border-radius: 4px;
        padding: 5px 8px;
        cursor: pointer;
        font-size: 0.8em;
      `;
      
      btn.addEventListener('click', () => {
        this.timeScale = speed;
        // Update active button
        speedControls.querySelectorAll('button').forEach(b => {
          b.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        btn.style.background = 'rgba(255, 255, 255, 0.4)';
      });
      
      speedControls.appendChild(btn);
    });
    
    // Time presets
    const presetContainer = document.createElement('div');
    presetContainer.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 5px;
    `;
    
    const presets = [
      { name: 'Dawn', time: 6 },
      { name: 'Day', time: 12 },
      { name: 'Dusk', time: 18 },
      { name: 'Night', time: 0 }
    ];
    
    presets.forEach(preset => {
      const btn = document.createElement('button');
      btn.textContent = preset.name;
      btn.style.cssText = `
        flex: 1;
        min-width: 40px;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        border-radius: 4px;
        padding: 5px;
        cursor: pointer;
        font-size: 0.9em;
      `;
      
      btn.addEventListener('click', () => {
        this.setTime(preset.time);
        slider.value = preset.time;
      });
      
      presetContainer.appendChild(btn);
    });
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = `<span class="material-icons">close</span>`;
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0;
      font-size: 16px;
    `;
    
    // Assemble the control panel
    controlsRow.appendChild(playPauseBtn);
    controlsRow.appendChild(speedControls);
    
    container.appendChild(closeButton);
    container.appendChild(timeDisplay);
    container.appendChild(slider);
    container.appendChild(controlsRow);
    container.appendChild(presetContainer);
    
    // Event handlers
    slider.addEventListener('input', (e) => {
      const time = parseFloat(e.target.value);
      this.setTime(time);
    });
    
    playPauseBtn.addEventListener('click', () => {
      if (this.isActive) {
        this.pause();
        playPauseBtn.innerHTML = '<span class="material-icons">play_arrow</span>';
      } else {
        this.start();
        playPauseBtn.innerHTML = '<span class="material-icons">pause</span>';
      }
    });
    
    closeButton.addEventListener('click', () => {
      container.remove();
      this.controls = null;
    });
    
    // Store references
    this.controls = container;
    this.timeDisplay = timeDisplay;
    
    // Add to DOM - find the 3D container if possible
    const targetContainer = document.querySelector('.drawer-3d-view') || document.body;
    targetContainer.appendChild(container);
  }
  
  /**
   * Formats the time in hours:minutes AM/PM
   */
  formatTime(time) {
    // Handle midnight wrapping
    const wrappedTime = time % 24;
    
    // Convert to hours and minutes
    const hours = Math.floor(wrappedTime);
    const minutes = Math.floor((wrappedTime - hours) * 60);
    
    // Format with AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    
    // Also show the game time scale
    return `${formattedTime} (${this.timeScale}x)`;
  }
  
  /**
   * Starts the day/night cycle
   */
  start() {
    this.isActive = true;
    this.lastUpdate = Date.now();
    console.log('Day/night cycle started');
    return this;
  }
  
  /**
   * Pauses the day/night cycle
   */
  pause() {
    this.isActive = false;
    console.log('Day/night cycle paused');
    return this;
  }
  
  /**
   * Sets the time directly (0-24)
   */
  setTime(hour) {
    // Ensure time is within 0-24 range
    this.currentTime = (hour + 24) % 24;
    
    // Update lighting immediately
    this.updateLighting();
    this.updateSkybox();
    
    // Update time display if controls exist
    if (this.timeDisplay) {
      this.timeDisplay.textContent = this.formatTime(this.currentTime);
    }
    
    return this;
  }
  
  /**
   * Sets the time scale (speed multiplier)
   */
  setTimeScale(scale) {
    this.timeScale = Math.max(0.1, scale);
    return this;
  }
  
  /**
   * Main update method called each frame
   */
  update() {
    if (!this.isActive) return;
    
    // Calculate time delta
    const now = Date.now();
    const delta = (now - this.lastUpdate) / 1000; // in seconds
    this.lastUpdate = now;
    
    // Update time based on time scale
    const timeIncrease = delta * (24 / this.cycleDuration) * this.timeScale;
    this.currentTime = (this.currentTime + timeIncrease) % 24;
    
    // Update lighting and skybox
    this.updateLighting();
    this.updateSkybox();
    
    // Update time display if controls exist
    if (this.timeDisplay) {
      this.timeDisplay.textContent = this.formatTime(this.currentTime);
    }
  }
  
  /**
   * Shows UI controls
   */
  showControls() {
    if (!this.controls) {
      this.createControls();
    }
    return this;
  }
  
  /**
   * Cleans up resources
   */
  dispose() {
    // Remove UI controls if they exist
    if (this.controls && this.controls.parentNode) {
      this.controls.parentNode.removeChild(this.controls);
      this.controls = null;
    }
    
    // Restore original scene background
    if (this.initialBackground) {
      this.scene.background = this.initialBackground;
    }
    
    // Remove lights from scene
    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }
    
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }
  }
}