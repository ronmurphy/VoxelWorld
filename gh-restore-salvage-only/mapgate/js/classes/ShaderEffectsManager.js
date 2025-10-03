/**
 * ShaderEffectsManager handles special visual effects throughout the scene
 * Supports both prop-based effects and area/zone effects
 */
if (!window.ShaderEffectsManager) {
  class ShaderEffectsManager {
    /**
     * Create a new ShaderEffectsManager
     * @param {Scene3DController} scene3D - Reference to the main scene controller
     */
    constructor(scene3D) {
      this.scene3D = scene3D;
      this.effects = new Map(); // Maps object ID to its effects
      this.effectDefinitions = new Map(); // Maps effect type to its definition
      this.zoneEffects = new Map(); // For area/zone effects
      this.enabled = true; // Global toggle
      this.qualityLevel = 'medium'; // performance setting (low, medium, high)
      this.debug = false;
      this.temporaryEffects = new Map();
      this.maxTempEffects = 20; // Maximum number of temporary effects like dust
      this.effectCleanupInterval = null;

      // Register built-in effects
      this.registerEffectDefinitions();
    }

    /**
     * Register all available effect definitions
     */
    // registerEffectDefinitions() {
    //   // Light sources with particles
    //   this.registerEffectType('fire', {
    //     keywords: ['fire', 'candle', 'lantern'],
    //     color: 0xff6600,
    //     intensity: 1.5,
    //     distance: 8,
    //     decay: 2,
    //     particleCount: 20,
    //     particleSize: 0.05,
    //     particleColor: 0xff8844,
    //     animationSpeed: 1.0,
    //     // Use different creation method based on quality
    //     create: (object, definition, qualityLevel) => {
    //       // Use enhanced effects for medium and high quality
    //       if (qualityLevel === 'high' || qualityLevel === 'ultra' || qualityLevel === 'medium') {
    //         return this.createEnhancedFireEffect(object, definition, qualityLevel);
    //       } else {
    //         // Use basic effect for low quality
    //         return this.createFireEffect(object, definition, qualityLevel);
    //       }
    //     }
    //   });

    //   // Add this to the registerEffectDefinitions method in ShaderEffectsManager
    //   this.registerEffectType('burning', {
    //     keywords: ['burning', 'campfire', 'torch', 'flame', 'ember'],
    //     color: 0xff6600,
    //     intensity: 1.4,
    //     distance: 8,
    //     decay: 2,
    //     particleCount: 20,
    //     particleSize: 0.05,
    //     particleColor: 0xff8844,
    //     animationSpeed: 1.0,
    //     preserveMaterial: true, // Important: flag to not modify original material
    //     // Use enhanced effects for medium and high quality
    //     create: (object, definition, qualityLevel) => {
    //       return this.createBurningEffect(object, definition, qualityLevel);
    //     }
    //   });

    //   this.registerEffectType('coldMagic', {
    //     keywords: ['ice', 'frost', 'chill', 'freeze', 'snow', 'winter'],
    //     color: 0x66ccff,
    //     intensity: 1.2,
    //     distance: 6,
    //     decay: 1.5,
    //     particleCount: 15,
    //     particleSize: 0.03,
    //     particleColor: 0x88ccff,
    //     animationSpeed: 0.7,
    //     create: this.createMagicEffect.bind(this)
    //   });

    //   // possilbly newer cold magic effect
    //   // this.registerEffectType('coldMagic', {
    //   //   keywords: ['ice', 'frost', 'chill', 'freeze', 'snow', 'winter'],
    //   //   color: 0x88ccff, // Ice blue color
    //   //   intensity: 0.6, 
    //   //   distance: 4,
    //   //   decay: 1.5,
    //   //   particleCount: 12,
    //   //   particleSize: 0.03,
    //   //   particleColor: 0xaaddff,
    //   //   animationSpeed: 0.5,
    //   //   create: this.createPropGlowEffect.bind(this)
    //   // });

    //   this.registerEffectType('lava', {
    //     keywords: ['lava', 'magma', 'ember'],
    //     color: 0xff3300,
    //     intensity: 1.3,
    //     distance: 7,
    //     decay: 2,
    //     particleCount: 25,
    //     particleSize: 0.04,
    //     particleColor: 0xff5500,
    //     animationSpeed: 0.8,
    //     create: this.createLavaEffect.bind(this)
    //   });

    //   this.registerEffectType('holy', {
    //     keywords: ['radiant', 'holy', 'divine', 'sacred', 'blessed'],
    //     color: 0xffe599,
    //     intensity: 1.2,
    //     distance: 6,
    //     decay: 1.5,
    //     particleCount: 15,
    //     particleSize: 0.04,
    //     particleColor: 0xffffaa,
    //     animationSpeed: 0.5,
    //     create: this.createHolyEffect.bind(this)
    //   });

    //   // Add new enhanced magic effect
    //   this.registerEffectType('magic', {
    //     keywords: ['crystal', 'gem', 'magic', 'arcane', 'rune', 'glow'],
    //     color: 0x8800ff, // Purple
    //     intensity: 1.0,
    //     distance: 6,
    //     decay: 1.5,
    //     particleCount: 60,
    //     particleSize: 0.04,
    //     particleColor: 0xaa66ff,
    //     animationSpeed: 0.7,
    //     colorCycle: 1.0, // Enable color cycling
    //     create: this.createEnhancedMagicEffect.bind(this)
    //   });

    //   this.registerEffectType('waterProp', {
    //     keywords: ['waterProp'],
    //     color: 0x4488aa,
    //     intensity: 0.8,
    //     distance: 4,
    //     forceShowOnLow: true,
    //     particleCount: 12,
    //     particleSize: 0.03,
    //     isAreaEffect: false,
    //     create: this.createWaterPropEffect.bind(this),
    //     // Settings for different quality levels
    //     low: {
    //       maxIterations: 2,
    //       waveSpeed: 0.5,
    //       useParticles: false,
    //       useShader: true
    //     },
    //     medium: {
    //       maxIterations: 5,
    //       waveSpeed: 1.0,
    //       useParticles: true
    //     },
    //     high: {
    //       maxIterations: 7,
    //       waveSpeed: 1.2,
    //       useParticles: true
    //     }
    //   });

    //   this.registerEffectType('fog', {
    //     keywords: ['fog', 'mist', 'haze', 'smoke'],
    //     create: this.createFogEffect.bind(this),
    //     isAreaEffect: true,
    //     color: 0xcccccc,
    //     density: 0.03,
    //     low: { particleCount: 50 },
    //     medium: { particleCount: 100 },
    //     high: { particleCount: 200 }
    //   });

    //   this.registerEffectType('coldMagic', {
    //     keywords: ['ice', 'frost', 'chill', 'freeze', 'snow', 'winter'],
    //     color: 0x88ccff, // Ice blue color
    //     intensity: 0.6,
    //     distance: 4,
    //     decay: 1.5,
    //     particleCount: 12,
    //     particleSize: 0.03,
    //     particleColor: 0xaaddff,
    //     animationSpeed: 0.5,
    //     create: this.createPropGlowEffect.bind(this)
    //   });

    //   // Add dungeon portal effect
    //   // this.registerEffectType('portalEffect', {
    //   //   keywords: ['portal', 'dungeon', 'entrance', 'gate', 'doorway', 'vortex'],
    //   //   color: 0x66ccff, // Default blue portal
    //   //   intensity: 1.2,
    //   //   distance: 6,
    //   //   decay: 1.5,
    //   //   particleCount: 50,
    //   //   particleSize: 0.05,
    //   //   animationSpeed: 1.0,
    //   //   forceShowOnLow: true, // Important effect, show even on low quality
    //   //   create: this.createPortalEffect.bind(this)
    //   // });

    //   // Add more effect types as needed
    // }

    /**
 * Register all available effect definitions
 */
registerEffectDefinitions() {
  // Light sources with particles
  this.registerEffectType('fire', {
    keywords: ['fire', 'candle', 'lantern'],
    color: 0xff6600,
    intensity: 1.5,
    distance: 8,
    decay: 2,
    particleCount: 20,
    particleSize: 0.05,
    particleColor: 0xff8844,
    animationSpeed: 1.0,
    scale: 1.0,  // Add default scale
    // Use different creation method based on quality
    create: (object, definition, qualityLevel) => {
      // Use enhanced effects for medium and high quality
      if (qualityLevel === 'high' || qualityLevel === 'ultra' || qualityLevel === 'medium') {
        return this.createEnhancedFireEffect(object, definition, qualityLevel);
      } else {
        // Use basic effect for low quality
        return this.createFireEffect(object, definition, qualityLevel);
      }
    }
  });

  // Add this to the registerEffectDefinitions method in ShaderEffectsManager
  this.registerEffectType('burning', {
    keywords: ['burning', 'campfire', 'torch', 'flame', 'ember'],
    color: 0xff6600,
    intensity: 1.4,
    distance: 8,
    decay: 2,
    particleCount: 20,
    particleSize: 0.05,
    particleColor: 0xff8844,
    animationSpeed: 1.0,
    scale: 1.0,  // Add default scale
    preserveMaterial: true, // Important: flag to not modify original material
    // Use enhanced effects for medium and high quality
    create: (object, definition, qualityLevel) => {
      return this.createBurningEffect(object, definition, qualityLevel);
    }
  });

  this.registerEffectType('coldMagic', {
    keywords: ['ice', 'frost', 'chill', 'freeze', 'snow', 'winter'],
    color: 0x66ccff,
    intensity: 1.2,
    distance: 6,
    decay: 1.5,
    particleCount: 15,
    particleSize: 0.03,
    particleColor: 0x88ccff,
    animationSpeed: 0.7,
    scale: 1.0,  // Add default scale
    create: this.createMagicEffect.bind(this)
  });

  this.registerEffectType('lava', {
    keywords: ['lava', 'magma', 'ember'],
    color: 0xff3300,
    intensity: 1.3,
    distance: 7,
    decay: 2,
    particleCount: 25,
    particleSize: 0.04,
    particleColor: 0xff5500,
    animationSpeed: 0.8,
    scale: 1.0,  // Add default scale
    create: this.createLavaEffect.bind(this)
  });

  this.registerEffectType('holy', {
    keywords: ['radiant', 'holy', 'divine', 'sacred', 'blessed'],
    color: 0xffe599,
    intensity: 1.2,
    distance: 6,
    decay: 1.5,
    particleCount: 15,
    particleSize: 0.04,
    particleColor: 0xffffaa,
    animationSpeed: 0.5,
    scale: 1.0,  // Add default scale
    create: this.createHolyEffect.bind(this)
  });

  // Add new enhanced magic effect
  this.registerEffectType('magic', {
    keywords: ['crystal', 'gem', 'magic', 'arcane', 'rune', 'glow'],
    color: 0x8800ff, // Purple
    intensity: 1.0,
    distance: 6,
    decay: 1.5,
    particleCount: 60,
    particleSize: 0.04,
    particleColor: 0xaa66ff,
    animationSpeed: 0.7,
    colorCycle: 1.0, // Enable color cycling
    scale: 1.0,  // Add default scale
    create: this.createEnhancedMagicEffect.bind(this)
  });

  this.registerEffectType('waterProp', {
    keywords: ['waterProp'],
    color: 0x4488aa,
    intensity: 0.8,
    distance: 4,
    forceShowOnLow: true,
    particleCount: 12,
    particleSize: 0.03,
    isAreaEffect: false,
    scale: 1.0,  // Add default scale
    create: this.createWaterPropEffect.bind(this),
    // Settings for different quality levels
    low: {
      maxIterations: 2,
      waveSpeed: 0.5,
      useParticles: false,
      useShader: true
    },
    medium: {
      maxIterations: 5,
      waveSpeed: 1.0,
      useParticles: true
    },
    high: {
      maxIterations: 7,
      waveSpeed: 1.2,
      useParticles: true
    }
  });

  this.registerEffectType('fog', {
    keywords: ['fog', 'mist', 'haze', 'smoke'],
    create: this.createFogEffect.bind(this),
    isAreaEffect: true,
    color: 0xcccccc,
    density: 0.03,
    scale: 1.0,  // Add default scale
    low: { particleCount: 50 },
    medium: { particleCount: 100 },
    high: { particleCount: 200 }
  });

  this.registerEffectType('coldMagic', {
    keywords: ['ice', 'frost', 'chill', 'freeze', 'snow', 'winter'],
    color: 0x88ccff, // Ice blue color
    intensity: 0.6,
    distance: 4,
    decay: 1.5,
    particleCount: 12,
    particleSize: 0.03,
    particleColor: 0xaaddff,
    animationSpeed: 0.5,
    scale: 1.0,  // Add default scale
    create: this.createPropGlowEffect.bind(this)
  });

  // Add more effect types as needed
}

    /**
     * Register a new effect type
     * @param {string} type - Effect type identifier
     * @param {Object} definition - Effect definition object
     */
    registerEffectType(type, definition) {
      this.effectDefinitions.set(type, definition);
      if (this.debug) {
        console.log(`Registered effect type: ${type} with keywords:`, definition.keywords);
      }
    }

    /**
     * Set quality level for all effects
     * @param {string} level - 'low', 'medium', or 'high'
     */
    setQualityLevel(level) {
      if (['low', 'medium', 'high'].includes(level)) {
        this.qualityLevel = level;
        console.log(`Set shader effects quality to ${level}`);

        // Update existing effects
        this.effects.forEach((effectData, objectId) => {
          this.updateEffectQuality(objectId, effectData);
        });

        // Update zone effects
        this.zoneEffects.forEach((effectData, zoneId) => {
          this.updateEffectQuality(zoneId, effectData, true);
        });

        this.effects.forEach(effectData => {
          if (effectData.mesh && effectData.mesh.material && effectData.mesh.material.emissiveIntensity !== undefined) {
            switch (level) {
              case 'high':
                effectData.mesh.material.emissiveIntensity = 1.0;
                break;
              case 'medium':
                effectData.mesh.material.emissiveIntensity = 0.7;
                break;
              case 'low':
                effectData.mesh.material.emissiveIntensity = 0.4;
                break;
            }
          }
        });

        this.ensureLowQualityEffects();
      }
    }

    ensureLowQualityEffects() {
      if (this.qualityLevel !== 'low') return;

      // For each effect, provide a fallback if needed
      this.effects.forEach(effectData => {
        // Ensure the effect is visible even on low quality
        if (effectData.container) {
          effectData.container.visible = true;
        }

        // For water effects specifically
        if (effectData.type === 'waterProp') {
          // Simplify the shader if possible
          if (effectData.material && effectData.material.uniforms) {
            // Reduce wave complexity
            if (effectData.material.uniforms.maxIterations) {
              effectData.material.uniforms.maxIterations.value = 2;
            }
          }
        }
      });
    }

    /**
     * Enable or disable all effects
     * @param {boolean} enabled - Whether effects should be enabled
     */
    setEnabled(enabled) {
      this.enabled = enabled;

      // Toggle visibility of all effects
      this.effects.forEach((effectData) => {
        if (effectData.container) {
          effectData.container.visible = enabled;
        }
        if (effectData.light) {
          effectData.light.visible = enabled;
        }
      });

      this.zoneEffects.forEach((effectData) => {
        if (effectData.mesh) {
          effectData.mesh.visible = enabled;
        }
      });

      console.log(`Shader effects ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Process a new object and apply effects if needed
     * @param {Object3D} object - Object to process
     * @returns {boolean} - Whether an effect was applied
     */
    processObject(object) {
      if (!this.enabled || !object || !object.userData) return false;

      if (object.userData.isWaterProp === true) {
        console.log('Processing water prop via special handler');
        return this.detectAndApplyPropEffects(object);
      }

      // Check if it's a prop
      const isProp = object.userData.type === 'prop';
      const name = object.userData.name || '';

      if (!name) return false;

      // Check which effect applies to this object
      const effectType = this.getEffectTypeForName(name);
      if (!effectType) return false;

      // Create and apply the effect
      return this.applyEffect(object, effectType);
    }

    /**
 * Get the approximate size of an object for scaling effects
 * @param {THREE.Object3D} object - The object to measure
 * @returns {number} Approximate radius/size of the object
 */
getObjectSize(object) {
  // Default size if we can't determine
  const defaultSize = 1;
  
  if (!object) return defaultSize;
  
  try {
    // Use geometry bounding box/sphere if available
    if (object.geometry) {
      // Compute bounding box if not already computed
      if (!object.geometry.boundingBox) {
        object.geometry.computeBoundingBox();
      }
      
      // Get size from bounding box
      if (object.geometry.boundingBox) {
        const boundingBox = object.geometry.boundingBox;
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        
        // Factor in the object's scale
        if (object.scale) {
          size.multiply(object.scale);
        }
        
        // Return average dimension as approximation of size
        return (size.x + size.y + size.z) / 3;
      }
      
      // Alternative: Use bounding sphere
      if (!object.geometry.boundingSphere) {
        object.geometry.computeBoundingSphere();
      }
      
      if (object.geometry.boundingSphere) {
        // Factor in the object's scale (using max scale as approximation)
        const maxScale = object.scale ? 
          Math.max(object.scale.x, object.scale.y, object.scale.z) : 1.0;
        return object.geometry.boundingSphere.radius * maxScale;
      }
    }
    
    // If we couldn't determine from geometry, try to approximate from object scale
    if (object.scale) {
      return Math.max(
        Math.abs(object.scale.x), 
        Math.abs(object.scale.y), 
        Math.abs(object.scale.z)
      );
    }
    
    // Try to estimate from object dimensions
    if (object.userData) {
      if (object.userData.width && object.userData.height) {
        return Math.max(object.userData.width, object.userData.height) / 2;
      }
    }
  } catch (error) {
    console.warn("Error determining object size:", error);
  }
  
  // Default fallback
  return defaultSize;
}

    /**
     * Find what effect type applies to a given name
     * @param {string} name - Name to check for keywords
     * @returns {string|null} - Effect type or null if no match
     */
    getEffectTypeForName(name) {
      const lowerName = name.toLowerCase();

      for (const [type, definition] of this.effectDefinitions) {
        if (definition.keywords && definition.keywords.some(keyword => lowerName.includes(keyword))) {
          return type;
        }
      }

      return null;
    }


    applyEffect(object, effectType) {
      if (!this.enabled || !object) return false;

      if (this.effects.has(object.id)) {
        // Effect already applied
        return false;
      }

      console.log(`Applying effect ${effectType} to object:`, object.userData);

      const definition = this.effectDefinitions.get(effectType);
      if (!definition || !definition.create) {
        console.warn(`No definition or creator for effect type: ${effectType}`);
        return false;
      }

      try {
        // Call the create function from the definition
        const effectData = definition.create(object, definition, this.qualityLevel);

        if (!effectData) return false;

        // ADDED SAFETY CHECKS:
        if (!effectData.definition) {
          effectData.definition = definition; // Ensure definition is included
        }

        // Store the effect data
        this.effects.set(object.id, {
          object,
          type: effectType,
          ...effectData
        });

        if (this.debug) {
          console.log(`Applied ${effectType} effect to object:`, object.userData.name);
        }

        return true;
      } catch (error) {
        console.error(`Error applying ${effectType} effect:`, error);
        return false;
      }
    }

    /**
   * Create a burning effect - like fire but preserves object's original material
   */
    createBurningEffect(object, definition, qualityLevel = 'medium') {
      // Similar to createFireEffect but doesn't modify the object's material
      const container = new THREE.Group();
      container.position.copy(object.position);

      this.scene3D.scene.add(container);

      // Create light
      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      // Position light slightly above object
      light.position.y += 0.5;
      container.add(light);

      // Create fire particles
      const particles = this.createParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor
      );

      container.add(particles);

      // Return data for tracking
      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed
        }
      };
    }

    /**
     * Create a water effect for a surface area
     * @param {Object3D} object - The object representing the water surface
     * @param {Object} definition - The effect definition
     * @param {string} qualityLevel - Current quality setting
     * @returns {Object} Effect data
     */
    createWaterEffect(object, definition, qualityLevel = 'medium') {
      const settings = definition[qualityLevel] || definition.medium;

      // Create water shader material
      const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(0x0066aa) },
          waveHeight: { value: settings.waveHeight },
          waveSpeed: { value: settings.waveSpeed }
        },
        vertexShader: `
        uniform float time;
        uniform float waveHeight;
        uniform float waveSpeed;
        
        varying vec2 vUv;
        
          void main() {
    vUv = uv;
    vPosition = position;
    
    // Add subtle wave movement for horizontal water
    vec3 newPosition = position;
    
    if (isHorizontal > 0.5) {
      // Wave movement but limit the negative amplitude to prevent clipping
      float wave = sin(position.x * 2.0 + time * flowSpeed) * 
                 cos(position.z * 2.0 + time * flowSpeed * 0.8) * 0.05;
      
      // Adjust wave amplitude to be mostly upward rather than downward
      wave = wave * 0.5 + 0.05; // This shifts the wave range to be more positive
      
      newPosition.y += wave;
    }
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
      `,
        fragmentShader: `
        uniform vec3 color;
        uniform float time;
        
        varying vec2 vUv;
        
        void main() {
          // Basic water color
          vec3 waterColor = color;
          
          // Add some variation based on waves
          float foam = smoothstep(0.4, 0.5, sin(vUv.x * 20.0 + time) * 0.5 + 0.5);
          
          // Edge detection for shore foam
          float edge = smoothstep(0.0, 0.2, abs(vUv.y - 0.5) * 2.0);
          foam *= (1.0 - edge) * 0.5;
          
          // Combine water color with foam
          vec3 finalColor = mix(waterColor, vec3(1.0), foam);
          
          // Add transparency
          float alpha = mix(0.7, 0.9, edge);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
        transparent: true,
        side: THREE.DoubleSide
      });

      // Use the object's existing geometry
      const existingMaterial = object.material;
      object.material = waterMaterial;

      // Store original material for cleanup
      const effectData = {
        originalMaterial: existingMaterial,
        material: waterMaterial
      };

      return effectData;
    }



    /**
   * Create a water prop effect for horizontal surfaces (ponds) or vertical surfaces (waterfalls)
   * @param {Object3D} object - The water prop object
   * @param {Object} definition - Effect definition
   * @param {string} qualityLevel - Quality setting
   * @returns {Object} Effect data
   */
    // Enhanced water shader with Shadertoy adaptation
    createWaterPropEffect(object, definition, qualityLevel = 'medium') {
      if (!object || !object.userData) {
        console.warn('Water prop object invalid or missing userData');
        return null;
      }

      console.log('Creating water prop effect for object:', object);
      console.log('Water data:', object.userData.water);
      console.log('Prop data:', object.userData.prop);


      // Get settings based on quality level
      const settings = definition[qualityLevel] || definition.medium;

      // Get water properties from marker data
      const markerData = object.userData;
      const isHorizontal = markerData.prop?.isHorizontal !== false;
      const waterDepth = markerData.water?.depth || 1.0;
      const flowSpeed = markerData.water?.flowSpeed || 1.0;
      const transparency = markerData.water?.transparency || 0.7;



      // Convert hex color to THREE.js color if provided
      let waterColor = new THREE.Color(definition.color);
      if (markerData.water?.color) {
        try {
          const hex = markerData.water.color.replace('#', '0x');
          waterColor = new THREE.Color(parseInt(hex, 16));
        } catch (e) {
          console.warn('Invalid water color, using default', e);
        }
      }

      // Create container for water effect elements
      const container = new THREE.Group();
      container.position.copy(object.position);

      // Add to scene
      this.scene3D.scene.add(container);

      let fragmentShaderCode, vertexShaderCode;

      if (qualityLevel === 'low') {
        // Simpler shaders for low quality
        vertexShaderCode = `
     uniform float time;
     uniform float flowSpeed;
     uniform float isHorizontal;
     
     varying vec2 vUv;
     
     void main() {
       vUv = uv;
       
       // Simple wave movement
       vec3 newPosition = position;
       
       if (isHorizontal > 0.5) {
         float wave = sin(position.x * 2.0 + time * flowSpeed) * 0.05;
         newPosition.y += wave + 0.05; // Offset to stay above ground
       }
       
       gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
     }
   `;

        fragmentShaderCode = `
     uniform float time;
     uniform vec3 baseColor;
     uniform float flowSpeed;
     uniform float transparency;
     uniform float isHorizontal;
     
     varying vec2 vUv;
     
     void main() {
       // Simple water color with animation
       vec3 waterColor = baseColor;
       
       if (isHorizontal > 0.5) {
         // Simple waves
         float wave1 = sin(vUv.x * 10.0 + time * flowSpeed) * 0.5 + 0.5;
         float wave2 = sin(vUv.y * 8.0 + time * flowSpeed * 0.7) * 0.5 + 0.5;
         float waves = wave1 * wave2;
         
         // Add simple highlights
         waterColor += vec3(0.0, 0.1, 0.2) * waves;
       } else {
         // Simple waterfall
         float flow = sin(vUv.y * 20.0 - time * 2.0 * flowSpeed) * 0.5 + 0.5;
         waterColor += vec3(0.0, 0.05, 0.1) * flow;
       }
       
       gl_FragColor = vec4(waterColor, transparency);
     }
   `;
      } else {
        // Full quality shader for medium/high
        vertexShaderCode = `
     uniform float time;
     uniform float flowSpeed;
     uniform float isHorizontal;
     
     varying vec2 vUv;
     varying vec3 vPosition;
     
     void main() {
       vUv = uv;
       vPosition = position;
       
       // Add subtle wave movement for horizontal water
       vec3 newPosition = position;
       
       if (isHorizontal > 0.5) {
         float wave = sin(position.x * 2.0 + time * flowSpeed) * 
                    cos(position.z * 2.0 + time * flowSpeed * 0.8) * 0.05;
         
         newPosition.y += wave + 0.05; // Added offset to stay above ground
       }
       
       gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
     }
   `;

        fragmentShaderCode = `
     uniform float time;
     uniform vec2 resolution;
     uniform vec3 baseColor;
     uniform float flowSpeed;
     uniform float transparency;
     uniform float isHorizontal;
     uniform int maxIterations;
     uniform float intensity;
     
     varying vec2 vUv;
     varying vec3 vPosition;
     
     #define TAU 6.28318530718
     
     void main() {
       vec2 uv = vUv;
       
       // Horizontal water uses the Shadertoy effect
       if (isHorizontal > 0.5) {
         // Adapted from Shadertoy
         float waterTime = time * 0.5 * flowSpeed;
         
         // Modify p to avoid tiling artifacts
         vec2 p = mod(uv * TAU, TAU) - 250.0;
         vec2 i = vec2(p);
         float c = 1.0;
         
         // Fractal water calculation
         for (int n = 0; n < 5; n++) {
           if (n >= maxIterations) break; // Respect maxIterations uniform
           
           float t = waterTime * (1.0 - (3.5 / float(n+1)));
           i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
           c += 1.0/length(vec2(p.x / (sin(i.x+t)/intensity), p.y / (cos(i.y+t)/intensity)));
         }
         
         c /= float(maxIterations);
         c = 1.17-pow(c, 1.4);
         
         // Create water color with more control
         vec3 waterColor = vec3(pow(abs(c), 8.0));
         
         // Mix with base color instead of hardcoded blue
         vec3 targetColor = baseColor + vec3(0.0, 0.15, 0.2);
         waterColor = clamp(waterColor + targetColor, 0.0, 1.0);
         
         // Apply alpha
         gl_FragColor = vec4(waterColor, transparency);
       }
       // Vertical water gets a simpler flowing pattern
       else {
         // Direction of flow = top to bottom
         float flowOffset = -time * 2.0 * flowSpeed;
         
         // Distorted UV for flowing effect
         vec2 flowUv = vec2(
           uv.x + sin(uv.y * 10.0 + time * flowSpeed) * 0.05,
           mod(uv.y + flowOffset, 1.0)
         );
         
         // Create waves in the flow
         float waves = sin(flowUv.y * 20.0) * 0.5 + 0.5;
         waves *= sin(flowUv.x * 10.0 + time) * 0.5 + 0.5;
         
         // Add foam at edges and top
         float foam = smoothstep(0.4, 0.5, sin(flowUv.y * 40.0 + time * 3.0) * 0.5 + 0.5);
         foam *= smoothstep(0.0, 0.1, flowUv.y); // Top foam
         
         // Final color
         vec3 waterColor = mix(baseColor, vec3(1.0), foam * 0.6 + waves * 0.2);
         
         // Apply alpha
         gl_FragColor = vec4(waterColor, transparency);
       }
     }
   `;
      }

      // Now create the material with the selected shaders
      const waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          resolution: { value: new THREE.Vector2(512, 512) },
          baseColor: { value: waterColor },
          flowSpeed: { value: flowSpeed },
          transparency: { value: transparency },
          isHorizontal: { value: isHorizontal ? 1.0 : 0.0 },
          maxIterations: { value: settings.maxIterations || 5 },
          intensity: { value: 0.005 * waterDepth }
        },
        vertexShader: vertexShaderCode,
        fragmentShader: fragmentShaderCode,
        transparent: true,
        side: THREE.DoubleSide
      });

      // Create geometry based on water prop dimensions
      const width = (object.userData.prop?.width || 48) / 50;
      const height = (object.userData.prop?.height || 24) / 50;
      const depth = 0.05; // Thin depth

      let waterGeometry;

      // if (isHorizontal) {
      //   // Horizontal water surface (pond/lake/ocean)
      //   // Higher detail for better waves
      //   const detail = qualityLevel === 'high' ? 32 : (qualityLevel === 'medium' ? 16 : 8);
      //   waterGeometry = new THREE.PlaneGeometry(width, width, detail, detail);
      //   waterGeometry.rotateX(-Math.PI / 2); // Rotate to lay flat
      // } else {
      //   // Vertical water surface (waterfall)
      //   waterGeometry = new THREE.PlaneGeometry(width, height, 8, 16);
      //   // Keep vertical orientation
      // }


      if (object.userData.water?.matchMapWidth || object.userData.water?.matchMapHeight) {
        // Increase detail for large water surfaces
        const detail = qualityLevel === 'high' ? 64 : (qualityLevel === 'medium' ? 32 : 16);

        if (isHorizontal) {
          waterGeometry = new THREE.PlaneGeometry(width, width, detail, detail);
          waterGeometry.rotateX(-Math.PI / 2);
        } else {
          waterGeometry = new THREE.PlaneGeometry(width, height, detail / 2, detail);
        }
      }


      // Create water mesh
      const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);

      // Position water appropriately
      if (isHorizontal) {
        waterMesh.position.y += 0.08; //0.01; // Slightly above ground
      } else {
        waterMesh.position.z += 0.01; // Slightly in front of wall
      }

      container.add(waterMesh);

      // Add extra particle effects for higher quality levels
      if (qualityLevel !== 'low') {
        const particleCount = qualityLevel === 'high' ? 25 : 12;

        // Create particle system
        const waterParticles = this.createWaterParticles(
          particleCount,
          waterColor,
          isHorizontal,
          width,
          height,
          flowSpeed
        );

        if (waterParticles) {
          container.add(waterParticles);
        }
      }

      // Return effect data for tracking and updates
      return {
        container,
        mesh: waterMesh,
        material: waterMaterial,
        originalObject: object,
        animationData: {
          time: 0,
          speed: flowSpeed * 1.2 // Slightly faster animation
        }
      };
    }

    /**
     * Create enhanced water particles with better visuals
     * @param {number} count - Number of particles
     * @param {THREE.Color} color - Water color
     * @param {boolean} isHorizontal - Whether water is horizontal
     * @param {number} width - Width of water area
     * @param {number} height - Height of water area
     * @param {number} flowSpeed - Animation speed multiplier
     * @returns {THREE.Group} Particle system
     */
    createEnhancedWaterParticles(count, color, isHorizontal, width, height, flowSpeed) {
      // Create a group to hold particles
      const particleGroup = new THREE.Group();

      // Particle geometry
      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      // Create a brighter color for foam particles
      const foamColor = new THREE.Color(color.r * 1.5, color.g * 1.5, color.b * 1.5);

      // Create particle material
      const particleMaterial = new THREE.PointsMaterial({
        color: foamColor,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      // Position particles based on water type
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        if (isHorizontal) {
          // For ocean waves, particles along the surface and edges
          // More particles at the edges to simulate foam
          let x, z;

          // 70% chance to place particles near edges
          if (Math.random() < 0.7) {
            // Place near edges
            const edgeChoice = Math.floor(Math.random() * 4); // 0-3 for four edges

            switch (edgeChoice) {
              case 0: // Left edge
                x = -width / 2 + Math.random() * 0.2;
                z = (Math.random() - 0.5) * width;
                break;
              case 1: // Right edge
                x = width / 2 - Math.random() * 0.2;
                z = (Math.random() - 0.5) * width;
                break;
              case 2: // Top edge
                x = (Math.random() - 0.5) * width;
                z = -width / 2 + Math.random() * 0.2;
                break;
              case 3: // Bottom edge
                x = (Math.random() - 0.5) * width;
                z = width / 2 - Math.random() * 0.2;
                break;
            }
          } else {
            // Random position on surface
            x = (Math.random() - 0.5) * width;
            z = (Math.random() - 0.5) * width;
          }

          positions[i3] = x;
          positions[i3 + 1] = 0.02 + Math.random() * 0.05; // Slightly above surface
          positions[i3 + 2] = z;

          // Varied particle sizes
          sizes[i] = 0.03 + Math.random() * 0.04;
        } else {
          // For waterfall, particles flowing down and at bottom for splash
          const isSplash = Math.random() < 0.4; // 40% chance to be a splash at bottom

          if (isSplash) {
            // Bottom splash
            positions[i3] = (Math.random() - 0.5) * width * 1.2; // Wider spread at bottom
            positions[i3 + 1] = -height / 2 + Math.random() * 0.1; // At bottom
            positions[i3 + 2] = 0.05 + Math.random() * 0.1; // More forward

            // Larger particles for splashes
            sizes[i] = 0.05 + Math.random() * 0.05;
          } else {
            // Flowing particles
            positions[i3] = (Math.random() - 0.5) * width * 0.9;
            positions[i3 + 1] = (Math.random() - 0.3) * height; // Mostly upper part
            positions[i3 + 2] = 0.02 + Math.random() * 0.05;

            // Smaller particles for mist
            sizes[i] = 0.02 + Math.random() * 0.03;
          }
        }
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Create particle system with custom sizes
      const particlesMaterial = new THREE.ShaderMaterial({
        uniforms: {
          color: { value: foamColor },
          pointTexture: { value: this.getWaterParticleTexture() }
        },
        vertexShader: `
      attribute float size;
      varying float vSize;
      
      void main() {
        vSize = size;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
        fragmentShader: `
      uniform vec3 color;
      uniform sampler2D pointTexture;
      varying float vSize;
      
      void main() {
        // Create a soft circular particle
        vec2 uv = gl_PointCoord.xy;
        float r = distance(uv, vec2(0.5, 0.5));
        if (r > 0.5) discard;
        
        // Soft edge
        float a = smoothstep(0.5, 0.3, r);
        gl_FragColor = vec4(color, a * 0.7);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(particleGeometry, particlesMaterial);

      // Store original positions and other animation data
      particles.userData = {
        positions: positions.slice(),
        sizes: sizes.slice(),
        time: 0,
        flowSpeed: flowSpeed,
        isHorizontal: isHorizontal
      };

      particleGroup.add(particles);
      return particleGroup;
    }

    /**
     * Get a soft particle texture for water
     */
    getWaterParticleTexture() {
      if (!this._waterParticleTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create a circular gradient
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        this._waterParticleTexture = new THREE.CanvasTexture(canvas);
      }

      return this._waterParticleTexture;
    }

    /**
     * Create water splash/mist particles
     * @param {number} count - Number of particles
     * @param {THREE.Color} color - Water color
     * @param {boolean} isHorizontal - Whether water is horizontal
     * @param {number} width - Width of water area
     * @param {number} height - Height of water area
     * @returns {THREE.Points} Particle system
     */
    createWaterParticles(count, color, isHorizontal, width, height) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        if (isHorizontal) {
          // For horizontal water, particles along the surface
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * width * 0.5;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 1] = 0.05 + Math.random() * 0.05; // Slightly above surface
          positions[i3 + 2] = Math.sin(angle) * radius;
        } else {
          // For vertical water, particles along the fall
          positions[i3] = (Math.random() - 0.5) * width;
          positions[i3 + 1] = Math.random() * height;
          positions[i3 + 2] = 0.05 + Math.random() * 0.03; // Slightly in front
        }
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Create particle material
      const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 0.05,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      // Create particle system
      const particles = new THREE.Points(geometry, particleMaterial);

      // Store original positions for animation
      particles.userData.positions = positions.slice();
      particles.userData.time = 0;

      return particles;
    }

    /**
     * Animate water particles
     * @param {Points} particles - Particle system
     * @param {boolean} isHorizontal - Water orientation
     * @param {number} time - Current animation time
     * @param {number} speed - Animation speed
     */
    animateWaterParticles(particles, isHorizontal, time, speed) {
      if (!particles || !particles.geometry || !particles.geometry.attributes.position) return;

      // Get position data
      const positions = particles.geometry.attributes.position.array;
      const originalPositions = particles.userData.positions;
      if (!originalPositions) return;

      const count = positions.length / 3;

      // Apply different animation patterns based on orientation
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        if (isHorizontal) {
          // Ocean surface particles
          positions[i3] = originalPositions[i3] + Math.sin(time * 2 + i) * 0.03;
          positions[i3 + 1] = originalPositions[i3 + 1] + Math.sin(time * 3 + i * 2) * 0.02;
          positions[i3 + 2] = originalPositions[i3 + 2] + Math.cos(time * 2 + i) * 0.03;

          // Occasionally reset a particle for foam effect
          if (Math.random() < 0.01 * speed) {
            positions[i3 + 1] = originalPositions[i3 + 1] * (0.8 + Math.random() * 0.4);
          }
        } else {
          // Waterfall particles
          positions[i3] = originalPositions[i3] + Math.sin(time * 2 + i) * 0.01;
          positions[i3 + 1] -= 0.02 * speed; // Constant downward flow
          positions[i3 + 2] = originalPositions[i3 + 2] + Math.sin(time * 3 + i) * 0.005;

          // Reset particles at bottom
          if (positions[i3 + 1] < originalPositions[i3 + 1] - 1.0) {
            positions[i3 + 1] = originalPositions[i3 + 1];
          }
        }
      }

      // Update the geometry
      particles.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * Create a fog effect for an area
     * @param {Object3D} object - The object marking the fog area
     * @param {Object} definition - The effect definition
     * @param {string} qualityLevel - Current quality setting
     * @returns {Object} Effect data
     */
    createFogEffect(object, definition, qualityLevel = 'medium') {
      const settings = definition[qualityLevel] || definition.medium;

      // Calculate bounds from object
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());

      // Create particle system for volumetric fog
      const particleCount = settings.particleCount;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);

      // Distribute particles in the volume
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = center.x + (Math.random() - 0.5) * size.x;
        particlePositions[i3 + 1] = center.y + (Math.random() - 0.5) * size.y * 0.5;
        particlePositions[i3 + 2] = center.z + (Math.random() - 0.5) * size.z;
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

      // Create fog material
      const particleMaterial = new THREE.PointsMaterial({
        color: definition.color || 0xcccccc,
        size: 0.5,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);

      // Hide the original object
      object.visible = false;

      // Add particles to scene
      this.scene3D.scene.add(particles);

      return {
        particles,
        originalObject: object,
        animationData: {
          time: 0
        }
      };
    }

    /**
     * Create a fire effect for an object
     * @param {Object3D} object - Object to add effect to
     * @param {Object} definition - Effect definition
     * @param {string} qualityLevel - Quality level
     * @returns {Object} Effect data
     */
    createFireEffect(object, definition, qualityLevel = 'medium') {
      // Create container for effects
      const container = new THREE.Group();
      container.position.copy(object.position);

      // Add to scene
      this.scene3D.scene.add(container);

      // Create light
      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      // Position light slightly above object
      light.position.y += 0.5;
      container.add(light);

      // Create fire particles
      const particles = this.createParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor
      );

      container.add(particles);

      // Return data for tracking
      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed
        }
      };
    }

    /**
   * Create an enhanced fire effect with advanced shaders
   * @param {Object3D} object - Object to add effect to
   * @param {Object} definition - Effect definition
   * @param {string} qualityLevel - Quality level
   * @returns {Object} Effect data
   */
    createEnhancedFireEffect(object, definition, qualityLevel = 'medium') {
      // Create container for effects
      const container = new THREE.Group();
      container.position.copy(object.position);

      // Add to scene
      this.scene3D.scene.add(container);

      // Create light
      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      // Position light slightly above object
      light.position.y += 0.5;
      container.add(light);

      // Create enhanced fire particles with shader
      const particles = this.createEnhancedParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor
      );

      container.add(particles);

      // Return data for tracking
      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed
        }
      };
    }

    /**
     * Create particles with advanced shader effects
     * @param {number} count - Number of particles
     * @param {number} size - Base particle size
     * @param {number} color - Particle color
     * @returns {Points} Enhanced particle system
     */
    createEnhancedParticles(count, size, color) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      // Convert hex color to RGB
      const particleColor = new THREE.Color(color);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Randomize positions in a small area
        const radius = Math.random() * 0.3;
        const angle = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.random() * 0.5; // Height
        positions[i3 + 2] = Math.sin(angle) * radius;

        // Randomize colors slightly
        colors[i3] = particleColor.r * (0.9 + Math.random() * 0.2);
        colors[i3 + 1] = particleColor.g * (0.9 + Math.random() * 0.2);
        colors[i3 + 2] = particleColor.b * (0.9 + Math.random() * 0.2);

        // Randomize sizes
        sizes[i] = size * (0.7 + Math.random() * 0.6);
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('particleColor', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // Advanced shader material
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          baseColor: { value: new THREE.Color(color) }
        },
        vertexShader: `
      attribute float size;
      attribute vec3 particleColor;
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vColor = particleColor;
        
        // Animate position
        vec3 pos = position;
        pos.y += sin(time * 2.0 + position.x * 10.0) * 0.05;
        pos.x += sin(time * 3.0 + position.z * 10.0) * 0.05;
        pos.z += cos(time * 2.5 + position.x * 10.0) * 0.05;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
        fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        // Create circular particle
        float r = distance(gl_PointCoord, vec2(0.5, 0.5));
        if (r > 0.5) discard;
        
        // Smooth edge and fade center for glow effect
        float alpha = 0.9 * (1.0 - r * 1.9);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true,
        vertexColors: true
      });

      // Create particle system
      const particles = new THREE.Points(geometry, material);

      // Store original positions for animation
      particles.userData.positions = positions.slice();
      particles.userData.time = 0;

      return particles;
    }

    /**
     * Create a magic effect for an object
     * @param {Object3D} object - Object to add effect to
     * @param {Object} definition - Effect definition
     * @param {string} qualityLevel - Quality level
     * @returns {Object} Effect data
     */

    // this is actually the Cold Effect
    createMagicEffect(object, definition, qualityLevel = 'medium') {
      // Similar to fire effect but with different animation pattern
      const container = new THREE.Group();
      container.position.copy(object.position);

      this.scene3D.scene.add(container);

      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      light.position.y += 0.3;
      container.add(light);

      const particles = this.createParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor
      );

      container.add(particles);

      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed,
          pattern: 'orbit' // Different animation pattern
        }
      };
    }

 /**
 * Create an enhanced magic effect based on shadertoy code
 * @param {Object3D} object - The object to apply the effect to
 * @param {Object} definition - Effect definition
 * @param {string} qualityLevel - Quality level setting
 * @returns {Object} Effect data
 */
 // 'new' magic effect
createEnhancedMagicEffect(object, definition, qualityLevel = 'medium') {
  // Create container for magic effect

    // Get object size for scaling
    const objectSize = this.getObjectSize(object);
  
    // Get scale from definition or default to 1.0
    const effectScale = definition.scale || 1.0;
    
    // Calculate effective scale based on object size and scale parameter
    const finalScale = objectSize * effectScale;

  const container = new THREE.Group();
  container.position.copy(object.position);
  
  this.scene3D.scene.add(container);
  
  // Add magic light
  const light = new THREE.PointLight(
    definition.color,
    definition.intensity,
    definition.distance || 6,
    definition.decay || 1.5
  );
  
  // Position light slightly above object
  light.position.y += 0.3;
  container.add(light);
  
  // Create magic aura plane
  const magicPlaneSize = 1.0;
  const planeGeometry = new THREE.PlaneGeometry(magicPlaneSize, magicPlaneSize);
  
  // Create the magic shader material based on the shadertoy code
  const magicMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(512, 512) },
      startColor: { value: new THREE.Color(0x00A233) },  // Green
      endColor: { value: new THREE.Color(0x0F59D9) },    // Blue
      colorCycle: { value: definition.colorCycle || 0.0 }, // Parameter for color cycling
      particleCount: { value: qualityLevel === 'high' ? 100 : 
                             qualityLevel === 'medium' ? 60 :
                            qualityLevel === 'low' ? 20 : 10} 
    },
    vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec2 resolution;
      uniform vec3 startColor;
      uniform vec3 endColor;
      uniform float colorCycle;
      uniform int particleCount;
      
      varying vec2 vUv;
      
      // Function to create a color cycling effect
      vec3 cycleColor(vec3 baseColor, float cycle) {
        // Rotate the color in HSV space
        float h = atan(baseColor.g - 0.5, baseColor.r - 0.5) / 6.2831853 + 0.5 + cycle;
        h = fract(h);
        
        // Simple approximation of HSV to RGB conversion
        vec3 rgb;
        float hueSection = h * 6.0;
        float X = 1.0 - abs(mod(hueSection, 2.0) - 1.0);
        
        if(hueSection < 1.0) rgb = vec3(1.0, X, 0.0);
        else if(hueSection < 2.0) rgb = vec3(X, 1.0, 0.0);
        else if(hueSection < 3.0) rgb = vec3(0.0, 1.0, X);
        else if(hueSection < 4.0) rgb = vec3(0.0, X, 1.0);
        else if(hueSection < 5.0) rgb = vec3(X, 0.0, 1.0);
        else rgb = vec3(1.0, 0.0, X);
        
        // Apply original color's saturation and value
        float maxComp = max(max(baseColor.r, baseColor.g), baseColor.b);
        float minComp = min(min(baseColor.r, baseColor.g), baseColor.b);
        float value = maxComp;
        float saturation = (maxComp - minComp) / maxComp;
        
        return rgb * value * saturation + vec3(value - value * saturation);
      }
      
      void main() {
        float t = time + 5.0;
        float z = 6.0;
        
        // Use parameter for particle count
        int n = particleCount;
        
        // Convert uv coordinates to centered coordinates
        vec2 uv = vUv * 2.0 - 1.0;
        
        // Apply color cycling to both start and end colors
        vec3 actualStartColor = colorCycle > 0.01 ? 
          cycleColor(startColor, colorCycle + time * 0.1) : startColor;
        vec3 actualEndColor = colorCycle > 0.01 ? 
          cycleColor(endColor, colorCycle + time * 0.05) : endColor;
        
        float startRadius = 0.84;
        float endRadius = 1.6;
        
        float power = 0.51;
        float duration = 4.0;
        
        vec2 v = uv * 2.0;
        
        vec3 col = vec3(0.0);
        
        vec2 pm = v.yx * 2.8;
        
        float dMax = duration;
        
        float evo = (sin(time * 0.1 + 400.0) * 0.5 + 0.5) * 99.0 + 1.0;
        
        float mb = 0.0;
        float mbRadius = 0.0;
        float sum = 0.0;
        
        // Particle loop - limited to prevent excessive iterations
        for(int i = 0; i < 100; i++) {
          if(i >= n) break; // Respect particle count parameter
          
          float fi = float(i);
          float d = fract(t * power + 48934.4238 * sin(float(i / int(evo)) * 692.7398));
          
          float a = 6.28 * fi / float(n);
          float x = d * cos(a) * duration;
          float y = d * sin(a) * duration;
          
          float distRatio = d / dMax;
          
          mbRadius = mix(startRadius, endRadius, distRatio);
          
          vec2 p = v - vec2(x, y);
          
          mb = mbRadius / dot(p, p);
          
          sum += mb;
          
          col = mix(col, mix(actualStartColor, actualEndColor, distRatio), mb / sum);
        }
        
        sum /= float(n);
        
        col = normalize(col) * sum;
        
        sum = clamp(sum, 0.0, 0.4);
        
        vec3 tex = vec3(1.0);
        
        col *= smoothstep(tex, vec3(0.0), vec3(sum));
        
        // Add fading at edges for a smooth blend
        float edge = 1.0 - smoothstep(0.4, 0.5, length(uv));
        col *= edge;
        
        gl_FragColor = vec4(col, edge * sum * 3.0); // Add transparency for edges
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  
  // Create a quad for the magic effect
  const magicPlane = new THREE.Mesh(planeGeometry, magicMaterial);
  container.add(magicPlane);
  
  // Create a back plane for additional glow
  const backPlane = new THREE.Mesh(
    planeGeometry,
    magicMaterial.clone()
  );
  backPlane.rotation.y = Math.PI;
  container.add(backPlane);
  
  // Add some particle effects for 3D presence
  const particleCount = qualityLevel === 'high' ? 30 : 
                       qualityLevel === 'medium' ? 20 :
                        qualityLevel === 'low' ? 10 : 5;
  const particleGeometry = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  
  // Create particles in a sphere shape
  for (let i = 0; i < particleCount; i++) {
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.3;
    
    particlePositions[i * 3] = Math.sin(angle1) * Math.cos(angle2) * radius;
    particlePositions[i * 3 + 1] = Math.sin(angle1) * Math.sin(angle2) * radius;
    particlePositions[i * 3 + 2] = Math.cos(angle1) * radius;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  
  const particleMaterial = new THREE.PointsMaterial({
    color: definition.color || 0x8800ff,
    size: definition.particleSize || 0.04,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });
  
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  container.add(particles);
  
  // Store original positions for animation
  particles.userData = {
    positions: [...particlePositions],
    time: 0
  };
  
  // Return effect data
  return {
    container: container,
    light: light,
    magicPlane: magicPlane,
    backPlane: backPlane,
    particles: particles,
    originalObject: object,
    definition,
    animationData: {
      time: 0,
      colorCycle: definition.colorCycle || 0.0,
      speed: definition.animationSpeed || 0.7,
      scale: effectScale  // Store scale for updates
    },
    update: function(deltaTime) {
      // Update animation time
      this.animationData.time += deltaTime * this.animationData.speed;
      const time = this.animationData.time;
      
      // Update magic shader time
      magicPlane.material.uniforms.time.value = time;
      backPlane.material.uniforms.time.value = time;
      
      // Pulse the light
      if (light) {
        light.intensity = definition.intensity * (0.7 + Math.sin(time * 2) * 0.3);
      }
      
      // Rotate planes to face camera if possible
      if (window.scene3D && window.scene3D.camera) {
        magicPlane.lookAt(window.scene3D.camera.position);
        backPlane.lookAt(window.scene3D.camera.position);
      }
      
      // Animate particles
      if (particles && particles.geometry && particles.geometry.attributes.position) {
        const positions = particles.geometry.attributes.position.array;
        const originalPositions = particles.userData.positions;
        const count = positions.length / 3;
        
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const angle = time + i * 0.2;
          
          // Simple orbiting animation
          positions[i3] = originalPositions[i3] * Math.cos(angle * 0.5);
          positions[i3 + 1] = originalPositions[i3 + 1] * Math.sin(angle * 0.5);
          positions[i3 + 2] = originalPositions[i3 + 2] * Math.cos(angle * 0.3);
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
      }
    }
  };
}


    /**
     * Create a lava effect
     * @param {Object3D} object - Object to add effect to
     * @param {Object} definition - Effect definition
     * @param {string} qualityLevel - Quality level
     * @returns {Object} Effect data
     */
    createLavaEffect(object, definition, qualityLevel = 'medium') {
      // Similar structure to fire but with different particles and animation
      const container = new THREE.Group();
      container.position.copy(object.position);

      this.scene3D.scene.add(container);

      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      // Lava light positioned lower than fire
      light.position.y += 0.2;
      container.add(light);

      const particles = this.createParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor,
        true // Slower particles for lava
      );

      container.add(particles);

      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed * 0.5 // Slower animation
        }
      };
    }

    /**
     * Create a holy/radiant effect
     * @param {Object3D} object - Object to add effect to
     * @param {Object} definition - Effect definition
     * @param {string} qualityLevel - Quality level
     * @returns {Object} Effect data
     */
    createHolyEffect(object, definition, qualityLevel = 'medium') {
      const container = new THREE.Group();
      container.position.copy(object.position);

      this.scene3D.scene.add(container);

      const particleCount = this.getQualityAdjustedValue(definition.particleCount, qualityLevel);
      const light = new THREE.PointLight(
        definition.color,
        definition.intensity,
        definition.distance,
        definition.decay
      );

      // Position light
      light.position.y += 0.4;
      container.add(light);

      // Holy particles with wider spread
      const particles = this.createParticles(
        particleCount,
        definition.particleSize,
        definition.particleColor,
        false,
        0.8 // Wider spread
      );

      container.add(particles);

      return {
        container,
        light,
        particles,
        originalObject: object,
        definition,
        animationData: {
          time: 0,
          speed: definition.animationSpeed,
          pattern: 'pulse' // Pulse pattern
        }
      };
    }



    /**
 * Create a glow effect for props (like torches, lanterns, magic items)
 * @param {Object3D} prop - The prop object to add effect to
 * @param {Object} options - Configuration options
 * @returns {Object} Effect data for tracking
 */
createPropGlowEffect(prop, options = {}) {
  // Default options
  const defaults = {
    color: options.color || 0xff6600,
    intensity: options.intensity || 0.5,
    particleCount: options.particleCount || 15,
    particleSize: options.particleSize || 0.1,
    position: prop.position.clone(),
    height: options.height || 0.2,
    radius: options.radius || 0.3,
    scale: options.scale || 1.0,  // Add scale parameter
    blending: THREE.AdditiveBlending
  };

  // Get object size for automatic scaling
  const objectSize = this.getObjectSize(prop);
  
  // Calculate effective scale based on object size and scale parameter
  const effectiveScale = objectSize * defaults.scale;

  // Skip if disabled
  if (!this.enabled) return null;

  // Create container for effects
  const container = new THREE.Group();
  container.position.copy(defaults.position);

  // Add to scene
  this.scene3D.scene.add(container);

  // Create glowing particle effect
  const particleCount = this.getQualityAdjustedValue(defaults.particleCount, this.qualityLevel);
  const positions = new Float32Array(particleCount * 3);
  const particleColors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  // Convert color to RGB components
  const colorObj = new THREE.Color(defaults.color);
  const r = colorObj.r;
  const g = colorObj.g;
  const b = colorObj.b;

  // Create random particles around the prop
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Position particles in small sphere around the prop's upper part
    const radius = defaults.radius * effectiveScale;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = defaults.height * effectiveScale + Math.random() * 0.2 * effectiveScale; // Slightly above
    positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

    // Colors - base color with some variation
    particleColors[i3] = r * (0.8 + Math.random() * 0.4); // Red with variation
    particleColors[i3 + 1] = g * (0.8 + Math.random() * 0.4); // Green with variation
    particleColors[i3 + 2] = b * (0.8 + Math.random() * 0.4); // Blue with variation

    // Random sizes, scaled with effect scale
    sizes[i] = defaults.particleSize * (0.5 + Math.random() * 1.0) * effectiveScale;
  }

  // Create geometry and set attributes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('particleColor', new THREE.BufferAttribute(particleColors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Create shader material for better looking particles
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      baseColor: { value: new THREE.Color(defaults.color) }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 particleColor;
      varying vec3 vColor;
      uniform float time;
      
      void main() {
        vColor = particleColor;
        
        // Animate position
        vec3 pos = position;
        pos.y += sin(time * 2.0 + position.x * 10.0) * 0.05;
        pos.x += sin(time * 3.0 + position.z * 10.0) * 0.05;
        pos.z += cos(time * 2.5 + position.x * 10.0) * 0.05;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      
      void main() {
        // Create circular particle
        float r = distance(gl_PointCoord, vec2(0.5, 0.5));
        if (r > 0.5) discard;
        
        // Smooth edge and fade center for glow effect
        float alpha = 0.9 * (1.0 - r * 1.9);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    blending: defaults.blending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true
  });

  // Create particle system
  const particles = new THREE.Points(geometry, material);

  // Add to container
  container.add(particles);

  // Try to modify original prop material if available
  if (prop.material && prop.material.isMeshStandardMaterial) {
    // Store original material properties if they don't exist yet
    if (!prop.userData.originalEmissive) {
      prop.userData.originalEmissive = prop.material.emissive.clone();
      prop.userData.originalEmissiveIntensity = prop.material.emissiveIntensity || 0;
    }

    // Make the prop itself glow
    prop.material.emissive = new THREE.Color(defaults.color);
    prop.material.emissiveIntensity = defaults.intensity;

    // Create reference to emissive mesh
    const emissiveMesh = prop;

    // Return effect data including the emissive mesh
    return {
      container,
      particles,
      emissiveMesh,
      originalObject: prop,
      definition: {
        color: defaults.color,
        emissiveIntensity: defaults.intensity,
        scale: defaults.scale  // Include scale in definition
      },
      animationData: {
        time: 0,
        speed: 1.0,
        pattern: 'glow',
        objectSize: objectSize  // Store object size for updates
      }
    };
  }

  // Return effect data without emissive mesh
  return {
    container,
    particles,
    originalObject: prop,
    definition: {
      color: defaults.color,
      emissiveIntensity: defaults.intensity,
      scale: defaults.scale  // Include scale in definition
    },
    animationData: {
      time: 0,
      speed: 1.0,
      pattern: 'glow',
      objectSize: objectSize  // Store object size for updates
    }
  };
}


    /**
     * Create a portal effect with animated shader and particles
     * @param {Object3D} object - The object to add effect to
     * @param {Object} definition - Effect definition
     * @param {string} qualityLevel - Quality setting
     * @returns {Object} Effect data
     */
    createPortalEffect(object, definition, qualityLevel = 'medium') {
      // Create container for portal effect
      const container = new THREE.Group();
      container.position.copy(object.position);
      this.scene3D.scene.add(container);

      // Get config from definition or use defaults
      const color = definition.color || 0x66ccff;
      const colorObj = new THREE.Color(color);
      const intensity = definition.intensity || 1.2;
      const portalSize = definition.portalSize || 0.7;

      // Create portal light
      const light = new THREE.PointLight(color, intensity, 8, 2);
      light.position.y = 0.5;
      container.add(light);

      // Create the portal ring with shader material
      const portalGeometry = new THREE.TorusGeometry(portalSize, 0.1, 32, 64);

      // Advanced shader material for the portal ring
      const portalMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(color) },
          pulseRate: { value: 0.5 },
          noiseScale: { value: 10.0 },
          ringWidth: { value: 0.3 }
        },
        vertexShader: `
      uniform float time;
      
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        
        // Add subtle pulsation to the ring
        vec3 newPosition = position;
        float pulse = sin(time * 2.0) * 0.03;
        newPosition *= 1.0 + pulse;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
        fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float pulseRate;
      uniform float noiseScale;
      uniform float ringWidth;
      
      varying vec2 vUv;
      
      // Simple noise function
      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      void main() {
        // Create a flowing energy effect
        float t = time * pulseRate;
        
        // Radial coordinate for the ring
        float radius = length(vUv - vec2(0.5, 0.5)) * 2.0;
        
        // Animated noise
        float noiseTime = noise(vUv * noiseScale + vec2(t)) * 0.1;
        
        // Edge glow
        float edge = smoothstep(0.4, 0.5, abs(radius - 0.8 + noiseTime));
        
        // Energy pulses along the ring
        float energy = sin(vUv.x * 20.0 + time * 4.0) * 0.5 + 0.5;
        energy *= sin(vUv.y * 20.0 + time * 3.0) * 0.5 + 0.5;
        
        // Combine effects
        float alpha = (1.0 - edge) * (0.6 + energy * 0.4);
        
        // Add flowing energy patterns
        float flow = sin(vUv.x * 30.0 + vUv.y * 20.0 + time * 5.0) * 0.5 + 0.5;
        vec3 flowColor = mix(color, vec3(1.0), flow * 0.3);
        
        gl_FragColor = vec4(flowColor, alpha);
      }
    `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const portalRing = new THREE.Mesh(portalGeometry, portalMaterial);
      portalRing.rotation.x = Math.PI / 2; // Lay flat
      portalRing.position.y = 0.5;
      container.add(portalRing);

      // Create portal center - the vortex effect
      const vortexGeometry = new THREE.CircleGeometry(portalSize * 0.8, 32);
      const vortexMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(color) },
          depth: { value: 2.0 }
        },
        vertexShader: `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float depth;
      
      varying vec2 vUv;
      
      void main() {
        // Create a vortex effect
        vec2 center = vUv - vec2(0.5);
        float dist = length(center);
        
        // Spiral pattern
        float angle = atan(center.y, center.x);
        float spiral = sin(dist * 20.0 - time * 2.0 + angle * 5.0) * 0.5 + 0.5;
        
        // Outer edge fade
        float edge = smoothstep(0.0, 0.5, 1.0 - dist * 2.0);
        
        // Inner darkness for depth
        float innerDark = smoothstep(0.0, 0.8, dist * 2.0);
        
        // Final color with depth effect
        vec3 finalColor = mix(color * 0.2, color, spiral * innerDark);
        
        // Alpha increases toward center
        float alpha = edge * 0.8;
        
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const vortex = new THREE.Mesh(vortexGeometry, vortexMaterial);
      vortex.rotation.x = Math.PI / 2; // Lay flat
      vortex.position.y = 0.5;
      vortex.position.z = -0.01; // Slightly below ring
      container.add(vortex);

      // Create particles for the portal - use quality levels
      const particleCount = this.getQualityAdjustedValue({
        low: 20,
        medium: 50,
        high: 100
      }[qualityLevel] || 50);

      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const particleSizes = new Float32Array(particleCount);
      const randomVals = new Float32Array(particleCount);

      // Create particles in a ring pattern with some randomness
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = portalSize + (Math.random() * 0.3 - 0.15);

        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5; // Height variation
        positions[i * 3 + 2] = Math.sin(angle) * radius;

        particleSizes[i] = Math.random() * 0.05 + 0.02;
        randomVals[i] = Math.random();
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
      particleGeometry.setAttribute('random', new THREE.BufferAttribute(randomVals, 1));

      // Advanced shader for particles
      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(color) },
          pointTexture: { value: this.getPortalParticleTexture() } // Using the dedicated portal texture
        },
        vertexShader: `
      uniform float time;
      
      attribute float size;
      attribute float random;
      
      varying float vRandom;
      varying vec3 vColor;
      
      void main() {
        vRandom = random;
        
        // Animate position
        vec3 pos = position;
        
        // Vertical oscillation
        pos.y += sin(time * 2.0 + random * 10.0) * 0.1;
        
        // Orbit slightly around center
        float angle = time * (0.1 + random * 0.2);
        float radius = length(pos.xz);
        float origAngle = atan(pos.z, pos.x);
        pos.x = cos(origAngle + angle) * radius;
        pos.z = sin(origAngle + angle) * radius;
        
        // Vary color based on position and time
        vColor = vec3(
          0.8 + sin(time + random * 5.0) * 0.2,
          0.8 + cos(time * 0.7 + random * 5.0) * 0.2,
          0.8 + sin(time * 0.5 + random * 5.0) * 0.2
        );
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
        fragmentShader: `
      uniform vec3 color;
      uniform sampler2D pointTexture;
      
      varying float vRandom;
      varying vec3 vColor;
      
      void main() {
        // Use particle texture with soft edges
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        
        // Create pulsing opacity
        float pulse = sin(vRandom * 10.0) * 0.5 + 0.5;
        
        // Apply color variation
        vec3 finalColor = color * vColor;
        
        gl_FragColor = vec4(finalColor, texColor.a * pulse);
      }
    `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      particles.position.y = 0.5;
      container.add(particles);

      // Store original positions and animation data
      particles.userData = {
        initialPositions: [...positions],
        time: 0
      };

      // Return effect data object for tracking
      return {
        container,
        light,
        portalRing,
        vortex,
        particles,
        originalObject: object,
        animationData: {
          time: 0,
          speed: definition.animationSpeed || 1.0
        },
        update: function (deltaTime) {
          // Increment animation time
          this.animationData.time += deltaTime * this.animationData.speed;
          const time = this.animationData.time;

          // Update shader uniforms
          if (portalRing && portalRing.material && portalRing.material.uniforms) {
            portalRing.material.uniforms.time.value = time;
          }

          if (vortex && vortex.material && vortex.material.uniforms) {
            vortex.material.uniforms.time.value = time;
          }

          if (particles && particles.material && particles.material.uniforms) {
            particles.material.uniforms.time.value = time;
          }

          // Pulse the light
          if (light) {
            light.intensity = intensity * (0.8 + Math.sin(time * 2) * 0.2);
          }

          // Rotate the portal ring slightly
          if (portalRing) {
            portalRing.rotation.z = time * 0.1;
          }
        }
      };
    }

    /**
     * Scan a loaded model for props that might need effects
     * @param {THREE.Group} model - The 3D model to scan
     * @returns {number} Number of effects added
     */
    scanModelForEffects(model) {
      if (!model || !this.enabled) {
        console.log('Model scanning skipped: model not provided or effects disabled');
        return 0;
      }

      console.log('Scanning model for props that might need effects...');
      let effectsAdded = 0;

      // Process all objects in the model
      model.traverse(object => {
        // Skip objects without a mesh or that are not visible
        if (!object.isMesh || !object.visible) return;

        // Check if object name suggests it should have effects
        const name = object.name.toLowerCase();
        const userData = object.userData || {};

        // Skip if object has a "noEffect" flag in userData
        if (userData.noEffect) return;

        let effectType = null;

        // Check against all registered effect keywords
        for (const [type, definition] of this.effectDefinitions) {
          if (definition.keywords && definition.keywords.some(keyword => name.includes(keyword))) {
            effectType = type;
            break;
          }
        }

        // Skip if no matching effect type
        if (!effectType) return;

        // Skip if already has effects
        const effectId = `prop-${object.id}`;
        if (this.effects.has(effectId)) return;

        console.log(`Applying ${effectType} effect to prop: ${object.name}`);

        try {
          // Get effect definition and create effect
          const definition = this.effectDefinitions.get(effectType);
          if (!definition || !definition.create) return;

          const effectData = definition.create(object, definition, this.qualityLevel);
          if (!effectData) return;

          // Store effect
          this.effects.set(effectId, {
            object,
            type: effectType,
            ...effectData
          });

          effectsAdded++;

          if (this.debug) {
            console.log(`Added ${effectType} effect to ${object.name}`);
          }
        } catch (error) {
          console.error(`Error applying ${effectType} effect to ${object.name}:`, error);
        }
      });

      console.log(`Added effects to ${effectsAdded} props in model`);
      return effectsAdded;
    }

    /**
     * Apply appropriate effects to a prop based on its name and properties
     * @param {THREE.Object3D} prop - The prop to add effects to
     * @returns {boolean} Whether an effect was applied
     */
    applyPropEffects(prop) {
      if (!this.enabled || !prop) return false;

      // Check name to determine the appropriate effect
      const name = prop.name || prop.userData?.name || '';
      if (!name) return false;

      // Find matching effect type
      const effectType = this.getEffectTypeForName(name);
      if (!effectType) return false;

      // Create and apply the effect
      const effectId = `prop-${prop.id}`;
      if (this.effects.has(effectId)) {
        return false; // Effect already applied
      }

      try {
        // Get effect definition
        const definition = this.effectDefinitions.get(effectType);
        if (!definition || !definition.create) {
          console.warn(`No definition or creator for effect type: ${effectType}`);
          return false;
        }

        // Create the effect
        const effectData = definition.create(prop, definition, this.qualityLevel);
        if (!effectData) return false;

        // Store the effect
        this.effects.set(effectId, {
          object: prop,
          type: effectType,
          ...effectData
        });

        if (this.debug) {
          console.log(`Applied ${effectType} effect to prop: ${name}`);
        }

        return true;
      } catch (error) {
        console.error(`Error applying ${effectType} effect to prop:`, error);
        return false;
      }
    }

    /**
     * Clean up all effects for a model when unloading
     * @param {THREE.Group} model - The model to clean up effects for
     */
    cleanupModelEffects(model) {
      if (!model) return;

      const effectsToRemove = [];

      // Find all effects belonging to objects in this model
      model.traverse(object => {
        this.effects.forEach((effectData, effectId) => {
          if (effectData.object === object || effectData.originalObject === object) {
            effectsToRemove.push(effectId);
          }
        });
      });

      // Remove all identified effects
      effectsToRemove.forEach(effectId => {
        this.removeEffect(effectId);
      });

      if (this.debug) {
        console.log(`Cleaned up ${effectsToRemove.length} effects for model`);
      }
    }

    /**
     * Auto-detect and apply appropriate effects to props
     * @param {Object3D} prop - The prop to analyze and apply effects to
     * @returns {Object|null} Effect data if applied, null otherwise
     */
    detectAndApplyPropEffects(prop) {
      // Skip if not enabled
      if (!this.enabled) return null;

      // if (prop.userData && prop.userData.isWaterProp === true) {
      //   console.log('Detected water prop, applying water effect');

      //   // CHANGE THIS PART: Use applyEffect instead of calling create directly
      //   return this.applyEffect(prop, 'waterProp');
      // }

      if (prop.userData && prop.userData.isWaterProp === true) {
        console.log('Water prop detected by ShaderEffectsManager:', prop.userData);
        const result = this.applyEffect(prop, 'waterProp');
        console.log('Effect applied result:', result);
        return result;
      }

      // Check object name/type to determine effect
      const name = prop.name || prop.userData?.name || '';
      const lowerName = name.toLowerCase();

      // Check for fire-related props
      if (lowerName.includes('torch') || lowerName.includes('fire') ||
        lowerName.includes('flame') || lowerName.includes('candle') ||
        lowerName.includes('lantern') || lowerName.includes('brazier')) {
        return this.createPropGlowEffect(prop, {
          color: 0xff6600,
          intensity: 0.8
        });
      }

      // Check for magic-related props
      if (lowerName.includes('crystal') || lowerName.includes('magic') ||
        lowerName.includes('arcane') || lowerName.includes('rune') ||
        lowerName.includes('enchant')) {
        return this.createPropGlowEffect(prop, {
          color: 0x66ccff,
          intensity: 0.6,
          particleCount: 12
        });
      }

      // Check for lava/magma
      if (lowerName.includes('lava') || lowerName.includes('magma') ||
        lowerName.includes('ember')) {
        return this.createPropGlowEffect(prop, {
          color: 0xff3300,
          intensity: 1.0,
          particleCount: 18
        });
      }

      // Check for holy/radiant items
      if (lowerName.includes('holy') || lowerName.includes('divine') ||
        lowerName.includes('sacred') || lowerName.includes('blessed') ||
        lowerName.includes('radiant')) {
        return this.createPropGlowEffect(prop, {
          color: 0xffe599,
          intensity: 0.7,
          particleCount: 14
        });
      }

      // No effect applied
      return null;
    }




    /**
   * Create footstep or impact dust effect
   * @param {THREE.Vector3} position - World position
   * @param {string} type - 'footstep' or 'impact'
   * @param {Object} options - Additional options
   */
    createImpactEffect(position, type = 'footstep', options = {}) {
      // Skip effects on low quality
      if (this.qualityLevel === 'low' && !options.force) return null;

      const defaults = {
        count: type === 'footstep' ? 10 : 20,
        color: options.color || (type === 'footstep' ? 0xcccccc : 0xddccbb),
        size: type === 'footstep' ? 0.03 : 0.05,
        lifetime: type === 'footstep' ? 0.5 : 1.0
      };

      // Merge with provided options
      const config = { ...defaults, ...options };

      // Create the dust effect
      return this.createDustEffect(position, config);
    }

    /**
     * Helper to create particles
     * @param {number} count - Number of particles
     * @param {number} size - Particle size
     * @param {number} color - Particle color
     * @param {boolean} slow - Whether particles should move slowly
     * @param {number} spread - Particle spread factor
     * @returns {Points} Particle system
     */
    createParticles(count, size, color, slow = false, spread = 0.3) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      // Convert hex color to RGB
      const particleColor = new THREE.Color(color);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Randomize positions in a small area
        const radius = Math.random() * spread;
        const angle = Math.random() * Math.PI * 2;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.random() * 0.5; // Height
        positions[i3 + 2] = Math.sin(angle) * radius;

        // Randomize colors slightly
        colors[i3] = particleColor.r * (0.9 + Math.random() * 0.2);
        colors[i3 + 1] = particleColor.g * (0.9 + Math.random() * 0.2);
        colors[i3 + 2] = particleColor.b * (0.9 + Math.random() * 0.2);
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // Create particle material
      const material = new THREE.PointsMaterial({
        size: size,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      // Create and return particle system
      const particles = new THREE.Points(geometry, material);

      // Add custom properties for animation
      particles.userData.positions = positions.slice(); // Store original positions
      particles.userData.slow = slow;

      return particles;
    }

    /**
     * Remove effect from an object
     * @param {string} objectId - ID of object to remove effect from
     * @returns {boolean} - Whether removal was successful
     */
    removeEffect(objectId) {
      const effectData = this.effects.get(objectId);
      if (!effectData) return false;

      try {
        // Remove container and all children
        if (effectData.container) {
          this.scene3D.scene.remove(effectData.container);
        }

        // Or remove individual components
        if (effectData.light && !effectData.container) {
          this.scene3D.scene.remove(effectData.light);
        }

        if (effectData.particles && !effectData.container) {
          this.scene3D.scene.remove(effectData.particles);
        }

        // Clean up materials
        if (effectData.material) {
          effectData.material.dispose();

          // Restore original material if available
          if (effectData.originalObject && effectData.originalMaterial) {
            effectData.originalObject.material = effectData.originalMaterial;
          }
        }

        // Remove from tracking
        this.effects.delete(objectId);

        if (this.debug) {
          console.log(`Removed effect from object ${objectId}`);
        }

        return true;
      } catch (error) {
        console.error('Error removing effect:', error);
        return false;
      }
    }

    /**
     * Add a water effect zone (special case for large areas)
     * @param {Object} areaData - Data describing the area
     * @param {number} areaData.x - X position
     * @param {number} areaData.z - Z position
     * @param {number} areaData.width - Width of area
     * @param {number} areaData.depth - Depth of area
     * @param {string} areaData.type - Effect type ('water', 'fog', etc)
     * @returns {string} - ID of the created zone effect
     */
    addWaterZone(areaData) {
      const { x, z, width, depth, type = 'water' } = areaData;
      const zoneId = `zone-${Date.now()}`;

      // Create a plane for the water surface
      const geometry = new THREE.PlaneGeometry(width, depth, 32, 16);

      // Rotate to horizontal position
      geometry.rotateX(-Math.PI / 2);

      // Create initial basic material
      const material = new THREE.MeshBasicMaterial({
        color: 0x0066aa,
        transparent: true,
        opacity: 0.6
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, areaData.y || 0.1, z); // Slight elevation

      // Add to scene
      this.scene3D.scene.add(mesh);

      // Get effect definition
      const definition = this.effectDefinitions.get(type);
      if (!definition) {
        console.warn(`No definition for zone effect type: ${type}`);
        return zoneId;
      }

      // Apply the effect
      const effectData = definition.create(mesh, definition, this.qualityLevel);

      // Store for tracking
      this.zoneEffects.set(zoneId, {
        mesh,
        type,
        ...effectData,
        areaData
      });

      if (this.debug) {
        console.log(`Created ${type} zone effect at (${x}, ${z})`);
      }

      return zoneId;
    }

    /**
     * Create dust particles effect (for landings, footsteps, etc.)
     * @param {Object} position - Position {x, y, z} for the effect
     * @param {Object} options - Optional configuration parameters
     * @returns {Object} Effect data for tracking and updates
     */
    createDustEffect(position, options = {}) {

      if (this.qualityLevel === 'low') {
        return this.createSimpleDustEffect(position, options);
      }
      // console.log("Dust effect requested at:", position, "with options:", options);

      // Skip if disabled or low quality without force override
      if (!this.enabled || (this.qualityLevel === 'low' && !options.force)) {
        return null;
      }

      // NEW: Add NaN check for position values
      if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error("Dust effect failed: position contains NaN values");
        return null;
      }


      // Skip if we already have too many effects
      if (this.temporaryEffects.size >= this.maxTempEffects && !options.force) {
        if (this.debug) console.log('Max temporary effects reached, skipping dust effect');
        return null;
      }

      const count = options.count || 20;
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesMaterial = new THREE.PointsMaterial({
        color: options.color || 0xcccccc,
        size: options.size || 0.05,
        transparent: true,
        opacity: 0.6
      });

      // Create particle positions
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.1 + Math.random() * 0.2;

        // Starting positions in a circle around landing point
        positions[i3] = position.x + Math.cos(angle) * radius;
        positions[i3 + 1] = position.y + 0.05; // Slightly above ground
        positions[i3 + 2] = position.z + Math.sin(angle) * radius;

        // Add random velocities
        velocities.push({
          x: (Math.random() - 0.5) * 0.01,
          y: 0.01 + Math.random() * 0.02,
          z: (Math.random() - 0.5) * 0.01
        });
      }

      particlesGeometry.setAttribute('position',
        new THREE.BufferAttribute(positions, 3)
      );

      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      this.scene3D.scene.add(particles);

      // Create effect ID and set lifetime
      const effectId = `dust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const lifetime = options.lifetime || 3.0; // Default 3 second lifetime

      // Create particle system and animation data
      const particleSystem = {
        id: effectId,
        mesh: particles,
        positions,
        velocities,
        lifetime: lifetime,
        age: 0,
        created: Date.now(),

        update: (deltaTime) => {
          // Update age
          particleSystem.age += deltaTime;

          // Check if expired
          if (particleSystem.age >= particleSystem.lifetime) {
            if (particleSystem.mesh.parent) {
              this.scene3D.scene.remove(particleSystem.mesh);
            }
            particleSystem.mesh.geometry.dispose();
            particleSystem.mesh.material.dispose();
            this.temporaryEffects.delete(effectId);
            return false; // Remove from updates
          }

          // Update particles
          for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Apply velocities
            positions[i3] += velocities[i].x;
            positions[i3 + 1] += velocities[i].y;
            positions[i3 + 2] += velocities[i].z;

            // Slow down with friction and gravity
            velocities[i].x *= 0.98;
            velocities[i].z *= 0.98;
            velocities[i].y -= 0.001;
          }

          // Fade out
          const fadeRatio = 1 - (particleSystem.age / particleSystem.lifetime);
          particlesMaterial.opacity = 0.6 * fadeRatio;

          // Update buffer
          particlesGeometry.attributes.position.needsUpdate = true;

          return true; // Keep updating
        }
      };

      // Add to temporary effects collection
      this.temporaryEffects.set(effectId, particleSystem);

      // Start cleanup interval if not already running
      this.ensureCleanupInterval();

      // console.log(`Created dust effect with ${count} particles, ID: ${effectId}`);

      return particleSystem;
    }

    /**
     * Create a simple dust effect for low-quality mode
     * @param {Object} position {x, y, z} position for the effect
     * @param {Object} options Optional configuration parameters
     * @returns {Object} Effect data for tracking and updates
     */
    createSimpleDustEffect(position, options = {}) {
      // console.log("Creating simple dust effect at:", position);

      // Skip if disabled
      if (!this.enabled) return null;

      // Check for valid position
      if (isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error("Dust effect failed: position contains NaN values");
        return null;
      }

      // Skip if we already have too many effects
      if (this.temporaryEffects && this.temporaryEffects.size >= (this.maxTempEffects || 20)) {
        return null;
      }

      // Set up parameters
      const count = options.count || 10; // Reduced for performance
      const lifetime = options.lifetime || 1.0;
      const size = options.size || 0.05;
      const color = options.color || 0xcccccc;

      // Create geometry and material
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesMaterial = new THREE.PointsMaterial({
        color: color,
        size: size,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
      });

      // Create particle positions
      const positions = new Float32Array(count * 3);
      const velocities = [];

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.1 + Math.random() * 0.2;

        // Starting positions in a circle around the effect point
        positions[i3] = position.x + Math.cos(angle) * radius;
        positions[i3 + 1] = position.y + 0.05; // Slightly above ground
        positions[i3 + 2] = position.z + Math.sin(angle) * radius;

        // Add random velocities
        velocities.push({
          x: (Math.random() - 0.5) * 0.01,
          y: 0.01 + Math.random() * 0.02,
          z: (Math.random() - 0.5) * 0.01
        });
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      this.scene3D.scene.add(particles);

      // Create effect ID and data
      const effectId = `dust-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create particle system and animation data
      const particleSystem = {
        id: effectId,
        mesh: particles,
        positions,
        velocities,
        lifetime: lifetime,
        age: 0,
        created: Date.now(),

        update: (deltaTime) => {
          // Update age
          particleSystem.age += deltaTime;

          // Check if expired
          if (particleSystem.age >= particleSystem.lifetime) {
            if (particleSystem.mesh.parent) {
              this.scene3D.scene.remove(particleSystem.mesh);
            }
            particleSystem.mesh.geometry.dispose();
            particleSystem.mesh.material.dispose();
            if (this.temporaryEffects) {
              this.temporaryEffects.delete(effectId);
            }
            return false; // Remove from updates
          }

          // Update particles
          for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Apply velocities
            positions[i3] += velocities[i].x;
            positions[i3 + 1] += velocities[i].y;
            positions[i3 + 2] += velocities[i].z;

            // Slow down with friction and gravity
            velocities[i].x *= 0.98;
            velocities[i].z *= 0.98;
            velocities[i].y -= 0.001;
          }

          // Fade out
          const fadeRatio = 1 - (particleSystem.age / particleSystem.lifetime);
          particlesMaterial.opacity = 0.6 * fadeRatio;

          // Update buffer
          particlesGeometry.attributes.position.needsUpdate = true;

          return true; // Keep updating
        }
      };

      // Add to temporary effects collection if available
      if (this.temporaryEffects) {
        this.temporaryEffects.set(effectId, particleSystem);
      } else {
        // If temporaryEffects doesn't exist, create it
        this.temporaryEffects = new Map();
        this.temporaryEffects.set(effectId, particleSystem);
      }

      // Track for updates if not using temporaryEffects collection
      if (this.emissiveObjects) {
        this.emissiveObjects.push(particleSystem);
      }

      return particleSystem;
    }

    /**
     * Create a landing dust cloud effect
     * @param {Object} position {x, y, z} position 
     * @param {number} intensity How intense the effect should be (1.0 = normal)
     * @returns {Object} Effect data
     */
    createLandingEffect(position, intensity = 1.0) {
      if (!this.enabled || (this.qualityLevel === 'low' && !intensity > 1.5)) return null;

      // Scale particles based on quality and intensity
      const particleCount = Math.min(
        this.qualityLevel === 'ultra' ? 75 :
          this.qualityLevel === 'high' ? 50 :
            this.qualityLevel === 'medium' ? 40 :
            this.qualityLevel === 'low' ? 20:
            10,
        Math.floor(20 + intensity * 20)
      );

      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleVelocities = [];

      // Fill with random positions in a circle pattern
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        // Random position in circle
        const radius = 0.3 * Math.random() * intensity;
        const angle = Math.random() * Math.PI * 2;

        particlePositions[i3] = position.x + Math.cos(angle) * radius;
        particlePositions[i3 + 1] = position.y + 0.05; // Just above ground
        particlePositions[i3 + 2] = position.z + Math.sin(angle) * radius;

        // Add velocities with intensity factor
        particleVelocities.push({
          x: (Math.random() - 0.5) * 0.01 * intensity,
          y: 0.01 + Math.random() * 0.02 * intensity,
          z: (Math.random() - 0.5) * 0.01 * intensity
        });
      }

      particleGeometry.setAttribute('position',
        new THREE.Float32BufferAttribute(particlePositions, 3)
      );

      // Get or create particle texture
      const particleTexture = this.getParticleTexture();

      // Create material
      const particleMaterial = new THREE.PointsMaterial({
        size: 0.15,
        map: particleTexture,
        transparent: true,
        opacity: 0.7,
        color: 0xddccbb, // Dust color
        depthWrite: false,
        sizeAttenuation: true
      });

      // Create particle system
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      this.scene3D.scene.add(particles);

      if (this.debug) {
        console.log(`Added ${particleCount} landing dust particles at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
      }

      // Create effect data for tracking
      const effectId = `landing-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const lifetime = 1.5 * intensity; // Longer lifetime for bigger impacts

      const effectData = {
        id: effectId,
        type: 'temporary',
        mesh: particles,
        positions: particlePositions,
        velocities: particleVelocities,
        duration: lifetime,
        age: 0,
        created: Date.now(),

        update: (deltaTime) => {
          // Update age
          effectData.age += deltaTime;
          const progress = effectData.age / effectData.duration;

          // Check if done
          if (progress >= 1.0) {
            // Clean up
            if (particles.parent) {
              this.scene3D.scene.remove(particles);
            }
            particleGeometry.dispose();
            particleMaterial.dispose();

            return false; // Signal to remove from tracking
          }

          // Update positions
          for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;

            // Apply velocities
            particlePositions[i3] += particleVelocities[i].x;
            particlePositions[i3 + 1] += particleVelocities[i].y;
            particlePositions[i3 + 2] += particleVelocities[i].z;

            // Apply physics
            particleVelocities[i].x *= 0.98; // Air resistance
            particleVelocities[i].z *= 0.98;
            particleVelocities[i].y -= 0.001; // Gravity
          }

          // Update geometry
          particleGeometry.attributes.position.needsUpdate = true;

          // Fade out
          particleMaterial.opacity = 0.7 * (1 - progress);

          return true; // Keep updating
        }
      };

      // Add to temporary effects for tracking and updates
      this.temporaryEffects.set(effectId, effectData);

      // Ensure cleanup interval is running
      this.ensureCleanupInterval();

      return effectData;
    }

    /**
     * Get or create a cached particle texture
     * @returns {THREE.Texture} Particle texture
     */
    getParticleTexture() {
      if (!this._particleTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // Draw a soft white circle
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.5, 'rgba(240,240,220,0.8)');
        gradient.addColorStop(1, 'rgba(240,240,220,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        this._particleTexture = new THREE.CanvasTexture(canvas);
      }

      return this._particleTexture;
    }

    /**
     * Get a particle texture for the portal effect
     */
    getFourParticleTexture() {
      if (!this._particleTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create a soft circular gradient
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        this._particleTexture = new THREE.CanvasTexture(canvas);
      }

      return this._particleTexture;
    }

    /**
     * Get a specialized particle texture for the portal effect
     * @returns {THREE.Texture} The portal particle texture
     */
    getPortalParticleTexture() {
      if (!this._portalParticleTexture) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Create a soft circular gradient with portal-specific glow
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(220, 220, 255, 0.5)');
        gradient.addColorStop(0.7, 'rgba(180, 180, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        // Add a subtle inner glow
        const innerGlow = ctx.createRadialGradient(32, 32, 5, 32, 32, 15);
        innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = innerGlow;
        ctx.fillRect(0, 0, 64, 64);

        this._portalParticleTexture = new THREE.CanvasTexture(canvas);
      }

      return this._portalParticleTexture;
    }

    /**
     * Update effects quality based on performance
     * @param {string} objectId - ID of object to update
     * @param {Object} effectData - Effect data
     * @param {boolean} isZone - Whether this is a zone effect
     */
    updateEffectQuality(objectId, effectData, isZone = false) {
      // Skip if no definition available
      if (!effectData.type) return;

      const definition = this.effectDefinitions.get(effectData.type);
      if (!definition) return;

      // Different handling for different effect types
      if (effectData.particles) {
        // Update particle count
        const newCount = this.getQualityAdjustedValue(
          definition.particleCount,
          this.qualityLevel
        );

        // Only recreate if significant difference
        if (Math.abs(effectData.particles.geometry.attributes.position.count - newCount) > 3) {
          // Remove old particles
          if (effectData.container) {
            effectData.container.remove(effectData.particles);
          } else {
            this.scene3D.scene.remove(effectData.particles);
          }

          // Create new particles
          const newParticles = this.createParticles(
            newCount,
            definition.particleSize,
            definition.particleColor,
            effectData.particles.userData.slow
          );

          // Add to container
          if (effectData.container) {
            effectData.container.add(newParticles);
          } else {
            this.scene3D.scene.add(newParticles);
          }

          // Update reference
          effectData.particles = newParticles;
        }
      }

      // Update shader parameters if applicable
      if (effectData.material && effectData.material.isShaderMaterial) {
        const settings = definition[this.qualityLevel] || definition.medium;

        // Update uniforms based on effect type
        if (effectData.type === 'water' && effectData.material.uniforms) {
          effectData.material.uniforms.waveHeight.value = settings.waveHeight;
          effectData.material.uniforms.waveSpeed.value = settings.waveSpeed;
        }
        else if (effectData.type === 'waterProp' && effectData.material.uniforms) {
          console.log(`Updating waterProp quality to ${this.qualityLevel}`);
          if (effectData.material.uniforms.maxIterations) {
            effectData.material.uniforms.maxIterations.value = settings.maxIterations || 3;
          }
          // Always ensure visibility
          if (effectData.container) {
            effectData.container.visible = true;
          }
        }
      }
    }

    /**
     * Scale a value based on quality level
     * @param {number} baseValue - Base value at medium quality
     * @param {string} qualityLevel - Current quality level
     * @returns {number} - Adjusted value
     */
    getQualityAdjustedValue(baseValue, qualityLevel) {
      switch (qualityLevel) {
        case 'low':
          return Math.floor(baseValue * 0.5);
        case 'high':
          return Math.ceil(baseValue * 1.5);
        case 'medium':
          return baseValue;
        case 'ultra':
          return Math.ceil(baseValue * 2.0);
        default:
          return baseValue;
      }
    }

    /**
     * Update all effects - call in animation loop
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
      if (!this.enabled) return;

      let waterEffectsCount = 0;


      if (waterEffectsCount > 0) {
        console.log(`Updated ${waterEffectsCount} water prop effects`);
      } else if (this.qualityLevel === 'low') {
        console.log('No water prop effects found, quality is low');
      }

      // Update standard effects
      this.effects.forEach((effectData, objectId) => {
        this.updateEffect(effectData, deltaTime);
      });

      // Update temporary effects
      if (this.temporaryEffects && this.temporaryEffects.size > 0) {
        let updatedCount = 0;
        this.temporaryEffects.forEach((effectData, effectId) => {
          if (effectData.update) {
            const keepUpdating = effectData.update(deltaTime);
            if (!keepUpdating) {
              this.temporaryEffects.delete(effectId);
            } else {
              updatedCount++;
            }
          }
        });

        if (this.debug && updatedCount > 0) {
          console.log(`Updated ${updatedCount} temporary effects`);
        }
      }

      // Legacy support for emissiveObjects (from VisualEffectsManager)
      if (this.emissiveObjects && this.emissiveObjects.length > 0) {
        this.emissiveObjects = this.emissiveObjects.filter(obj => {
          if (obj.update) return obj.update(deltaTime);
          return true;
        });
      }

      // Update zone effects
      this.zoneEffects.forEach((effectData, zoneId) => {
        this.updateZoneEffect(effectData, deltaTime);
      });
    }

    /**
     * Update a specific effect
     * @param {Object} effectData - Effect data
     * @param {number} deltaTime - Time since last frame
     */
    updateEffect(effectData, deltaTime) {
      // Skip if missing required data
      if (!effectData) return;

      // Skip low quality effects based on settings
      if (this.qualityLevel === 'low' &&
        !((effectData.definition && effectData.definition.forceShowOnLow) ||
          effectData.type === 'waterProp')) {
        // Skip complex effects on low quality
        return;
      }

      if (!effectData.animationData) return;

      // Update animation time
      effectData.animationData.time += deltaTime * (effectData.animationData.speed || 1.0);
      const time = effectData.animationData.time;

      // Handle water prop effects
      if (effectData.type === 'waterProp') {
        // Update shader time uniform
        if (effectData.material && effectData.material.uniforms && effectData.material.uniforms.time) {
          effectData.material.uniforms.time.value = time;

          // Force a render update
          if (this.scene3D && this.scene3D.renderer) {
            this.scene3D.needsRender = true;
          }
        }

        // Update particles if present
        if (effectData.container && effectData.container.children.length > 1) {
          const particles = effectData.container.children[1];

          if (particles && particles.isPoints) {
            // Animate particles based on water type
            const isHorizontal = effectData.material.uniforms.isHorizontal.value > 0.5;
            this.animateWaterParticles(particles, isHorizontal, time, effectData.animationData.speed);
          }
        }
      }

      // Animate particles if present
      if (effectData.particles) {
        // Check if using advanced shader material
        if (effectData.particles.material.isShaderMaterial &&
          effectData.particles.material.uniforms &&
          effectData.particles.material.uniforms.time) {

          // Update time uniform for shader animation
          effectData.particles.material.uniforms.time.value = time;

          // No need to update positions manually, shader handles it
        }
        // Standard particle animation (original code)
        else {
          const positions = effectData.particles.geometry.attributes.position.array;
          const originalPositions = effectData.particles.userData.positions;

          if (positions && originalPositions) {
            const count = positions.length / 3;
            const pattern = effectData.animationData.pattern || 'default';

            for (let i = 0; i < count; i++) {
              const i3 = i * 3;

              // Apply different animation patterns
              switch (pattern) {
                case 'orbit':
                  // Orbital pattern around center
                  const angle = time + i * 0.1;
                  const radius = 0.2 + Math.sin(time * 0.5 + i) * 0.1;
                  positions[i3] = Math.cos(angle) * radius;
                  positions[i3 + 1] = originalPositions[i3 + 1] + Math.sin(time * 0.7 + i * 0.3) * 0.1;
                  positions[i3 + 2] = Math.sin(angle) * radius;
                  break;

                case 'pulse':
                  // Pulsing pattern
                  const pulseRadius = (0.2 + Math.sin(time * 0.8) * 0.15) * (1 + i % 3 * 0.1);
                  const pulseAngle = originalPositions[i3 + 2] * 10 + time;
                  positions[i3] = Math.cos(pulseAngle) * pulseRadius;
                  positions[i3 + 1] = originalPositions[i3 + 1] + Math.sin(time + i) * 0.05;
                  positions[i3 + 2] = Math.sin(pulseAngle) * pulseRadius;
                  break;

                default:
                  // Default fire-like movement
                  positions[i3] = originalPositions[i3] + Math.sin(time * 2 + i) * 0.03;
                  positions[i3 + 1] = originalPositions[i3 + 1] + Math.sin(time * 3 + i * 2) * 0.05;
                  positions[i3 + 2] = originalPositions[i3 + 2] + Math.cos(time * 2 + i) * 0.03;
                  break;
              }
            }

            // Update geometry
            effectData.particles.geometry.attributes.position.needsUpdate = true;
          }
        }
      }

      // Animate light flickering if applicable
      if (effectData.light) {
        // Apply subtle flicker to light intensity
        const originalIntensity = effectData.definition ? (effectData.definition.intensity || 1.0) : 1.0;
        const flickerAmount = 0.1; // Amount of intensity variation

        // More complex flicker calculation for realism
        const flicker =
          Math.sin(time * 5) * 0.05 +
          Math.sin(time * 10) * 0.025 +
          Math.sin(time * 20) * 0.0125;

        effectData.light.intensity = originalIntensity * (1.0 - flickerAmount + flicker);

        // Option: also animate light color for more realism
        if (effectData.definition && effectData.definition.animateColor && effectData.light.color) {
          // Shift color slightly toward yellow/red for fire
          const baseColor = new THREE.Color(effectData.definition.color);
          const warmthShift = Math.sin(time * 3) * 0.05; // Small color variation

          effectData.light.color.copy(baseColor);
          effectData.light.color.r += warmthShift;
          effectData.light.color.g += warmthShift * 0.4;
        }
      }

      // Update emissive material effects if present
      if (effectData.emissiveMesh && effectData.emissiveMesh.material) {
        const material = effectData.emissiveMesh.material;
        if (material.emissiveIntensity !== undefined) {
          // Add subtle pulsing to emissive intensity
          const originalIntensity = effectData.definition ?
            (effectData.definition.emissiveIntensity || 1.0) : 1.0;

          material.emissiveIntensity = originalIntensity * (0.8 + Math.sin(time * 2) * 0.2);
        }
      }

      // Update portal effects if this is a portal
      if (effectData.portalRing || effectData.vortex) {
        // Update using the effect's custom update method if available
        if (typeof effectData.update === 'function') {
          effectData.update(deltaTime);
        }
        // Otherwise update standard portal components
        else {
          // Update the ring rotation
          if (effectData.portalRing) {
            effectData.portalRing.rotation.z = time * 0.1;
          }

          // Update the vortex
          if (effectData.vortex && effectData.vortex.material &&
            effectData.vortex.material.uniforms &&
            effectData.vortex.material.uniforms.time) {
            effectData.vortex.material.uniforms.time.value = time;
          }
        }
      }
    }

    /**
     * Update a zone effect
     * @param {Object} effectData - Zone effect data
     * @param {number} deltaTime - Time since last frame
     */
    updateZoneEffect(effectData, deltaTime) {
      // Update water shader uniforms
      if (effectData.type === 'water' && effectData.material && effectData.material.uniforms) {
        effectData.material.uniforms.time.value += deltaTime;
      }

      // Update fog particles
      if (effectData.type === 'fog' && effectData.particles) {
        const positions = effectData.particles.geometry.attributes.position.array;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;

          // Slight drift movement
          positions[i3] += (Math.random() - 0.5) * 0.01;
          positions[i3 + 1] += (Math.random() - 0.5) * 0.005;
          positions[i3 + 2] += (Math.random() - 0.5) * 0.01;

          // Keep within bounds
          const bounds = effectData.areaData;
          const halfWidth = bounds.width * 0.5;
          const halfDepth = bounds.depth * 0.5;

          if (Math.abs(positions[i3] - bounds.x) > halfWidth) {
            positions[i3] = bounds.x + (Math.random() - 0.5) * bounds.width;
          }

          if (Math.abs(positions[i3 + 2] - bounds.z) > halfDepth) {
            positions[i3 + 2] = bounds.z + (Math.random() - 0.5) * bounds.depth;
          }
        }

        effectData.particles.geometry.attributes.position.needsUpdate = true;
      }
    }

    /**
     * Scan the scene for objects that might need effects
     */
    scanScene() {
      if (!this.scene3D || !this.scene3D.scene) return;

      console.log('Scanning scene for potential effect objects...');

      let effectsAdded = 0;

      // Process all scene objects
      this.scene3D.scene.traverse(object => {
        // Only process objects with userData and names
        if (object.userData && object.userData.name) {
          if (this.processObject(object)) {
            effectsAdded++;
          }
        }
      });

      console.log(`Scan complete. Added effects to ${effectsAdded} objects.`);
    }

    /**
     * Ensure cleanup interval is running
     */
    ensureCleanupInterval() {
      if (!this.effectCleanupInterval) {
        console.log('Starting effects cleanup interval');
        this.effectCleanupInterval = setInterval(() => {
          this.cleanupOldEffects();
        }, 5000); // Check every 5 seconds
      }
    }

    /**
     * Clean up old effects
     */
    cleanupOldEffects() {
      if (this.temporaryEffects.size === 0) {
        // Clear interval if no effects to manage
        if (this.effectCleanupInterval) {
          clearInterval(this.effectCleanupInterval);
          this.effectCleanupInterval = null;
        }
        return;
      }

      const now = Date.now();
      const maxAge = 10000; // 10 seconds absolute maximum

      // First, remove any super old effects
      this.temporaryEffects.forEach((effect, id) => {
        if (now - effect.created > maxAge) {
          // Force remove very old effects
          if (effect.mesh && effect.mesh.parent) {
            this.scene3D.scene.remove(effect.mesh);
          }

          // Clean up resources
          if (effect.mesh) {
            if (effect.mesh.geometry) effect.mesh.geometry.dispose();
            if (effect.mesh.material) effect.mesh.material.dispose();
          }

          this.temporaryEffects.delete(id);
          if (this.debug) console.log(`Removed old effect ${id}`);
        }
      });

      // Second, if we're still over limit, remove oldest effects
      if (this.temporaryEffects.size > this.maxTempEffects) {
        // Sort by creation time
        const sortedEffects = Array.from(this.temporaryEffects.entries())
          .sort((a, b) => a[1].created - b[1].created);

        // Remove oldest effects until we're within limits
        const countToRemove = this.temporaryEffects.size - this.maxTempEffects;
        for (let i = 0; i < countToRemove; i++) {
          if (i < sortedEffects.length) {
            const [id, effect] = sortedEffects[i];

            // Cleanup this effect
            if (effect.mesh && effect.mesh.parent) {
              this.scene3D.scene.remove(effect.mesh);
            }

            // Clean up resources
            if (effect.mesh) {
              if (effect.mesh.geometry) effect.mesh.geometry.dispose();
              if (effect.mesh.material) effect.mesh.material.dispose();
            }

            this.temporaryEffects.delete(id);
            if (this.debug) console.log(`Removed excess effect ${id}`);
          }
        }
      }

      if (this.debug) {
        console.log(`Cleanup completed: ${this.temporaryEffects.size} temporary effects remaining`);
      }
    }

    /**
     * Dispose all effects and clean up resources
     */
    dispose() {
      console.log('Disposing ShaderEffectsManager...');

      // Clean up standard effects
      this.effects.forEach((effectData, objectId) => {
        this.removeEffect(objectId);
      });

      // Clean up zone effects
      this.zoneEffects.forEach((effectData, zoneId) => {
        if (effectData.mesh) {
          this.scene3D.scene.remove(effectData.mesh);

          if (effectData.mesh.geometry) {
            effectData.mesh.geometry.dispose();
          }

          if (effectData.mesh.material) {
            effectData.mesh.material.dispose();
          }
        }
      });

      // Clean up temporary effects
      this.temporaryEffects.forEach((effect, id) => {
        if (effect.mesh && effect.mesh.parent) {
          this.scene3D.scene.remove(effect.mesh);
        }
        if (effect.mesh) {
          if (effect.mesh.geometry) effect.mesh.geometry.dispose();
          if (effect.mesh.material) effect.mesh.material.dispose();
        }
      });
      this.temporaryEffects.clear();

      // Clear cleanup interval
      if (this.effectCleanupInterval) {
        clearInterval(this.effectCleanupInterval);
        this.effectCleanupInterval = null;
      }

      // Clear collections
      this.effects.clear();
      this.zoneEffects.clear();

      console.log('ShaderEffectsManager disposed.');
    }
  }

  // Export the class
  window.ShaderEffectsManager = ShaderEffectsManager;
}
