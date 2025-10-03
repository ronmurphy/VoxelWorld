class ShapeForgeParser {
    /**
     * Create a new ShapeForgeParser
     * @param {THREE.Scene} scene - The THREE.js scene to add models to
     * @param {Object} resourceManager - Reference to the resource manager
     * @param {Object} shaderEffects - Reference to the shader effects manager (optional)
     */
    constructor(scene, resourceManager, shaderEffects = null) {
        this.scene = scene;
        this.resourceManager = resourceManager;
        this.objects = [];
        this.selectedObject = null;

        // Try to get shader effects manager
        this.shaderEffects = shaderEffects;
        if (!this.shaderEffects) {
            if (window.shaderEffectsManager) {
                this.shaderEffects = window.shaderEffectsManager;
            } else if (window.scene3D && window.scene3D.shaderEffects) {
                this.shaderEffects = window.scene3D.shaderEffects;
            }
        }

        // Log initialization state
        console.log('ShapeForgeParser initialized with:', {
            hasScene: !!scene,
            hasResourceManager: !!resourceManager,
            hasShaderEffects: !!this.shaderEffects
        });

        // if (window.shapeForgeParser) {
        //     console.log('Returning existing ShapeForgeParser instance');
        //     return window.shapeForgeParser;
        //   }
    }

    /**
     * Check if THREE.js is available
     * @returns {boolean} Whether THREE.js is available
     */
    checkDependencies() {
        if (!window.THREE) {
            console.error("THREE.js not available! ShapeForgeParser requires THREE.js to function.");
            return false;
        }
        return true;
    }

    /**
     * Clear current project
     */
    newProject() {
        this.cleanupAllShaderEffects();

        // Clear all objects
        this.objects.forEach(obj => {
            if (obj.mesh && obj.mesh.parent) {
                obj.mesh.parent.remove(obj.mesh);
            }
        });

        this.objects = [];
        this.selectedObject = null;

        console.log('Created new project');
    }

    /**
     * Load a ShapeForge model from raw JSON data
     * @param {Object|string} jsonData - JSON data or string to parse
     * @returns {Array} - Array of created objects
     */
    loadModelFromJson(jsonData) {
        // Parse string if needed
        if (typeof jsonData === 'string') {
            try {
                jsonData = JSON.parse(jsonData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                throw error;
            }
        }

        // Load the project
        this.loadProjectFromJson(jsonData);

        // Return objects for placement
        return this.objects;
    }

    /**
     * Load a ShapeForge project from JSON
     * @param {Object} jsonData - Project data
     * @returns {boolean} Success
     */
    loadProjectFromJson(jsonData) {
        // Validate project data
        if (!jsonData || !jsonData.objects || !Array.isArray(jsonData.objects)) {
            throw new Error('Invalid project data');
        }

        console.log("Loading project using loadProjectFromJson");

        this.cleanupAllShaderEffects();
        this.newProject();

        // Keep track of created objects that need textures
        const objectsNeedingTextures = [];

        // Load objects
        console.log(`Loading ${jsonData.objects.length} objects from JSON`);
        jsonData.objects.forEach(objData => {
            // Create the object
            const createdObject = this.createObjectFromData(objData);

            // If object has texture data, queue it for texture loading
            if (objData.material && objData.material.texture && objData.material.texture.data) {
                objectsNeedingTextures.push({
                    object: createdObject,
                    textureData: objData.material.texture
                });
            }
        });

        this.objects.forEach(objData => {
            // Make sure scale is applied to the mesh directly
            if (objData.mesh && objData.scale) {
                objData.mesh.scale.set(
                    objData.scale.x || 1,
                    objData.scale.y || 1,
                    objData.scale.z || 1
                );
                console.log(`Applied scale ${JSON.stringify(objData.scale)} to ${objData.name}`);
            }
        });

        // Load textures for objects that need them
        console.log(`Applying textures to ${objectsNeedingTextures.length} objects`);
        objectsNeedingTextures.forEach(item => {
            this.loadAndApplyTextureToObject(item.object, item.textureData);
        });

        console.log(`Project loaded with ${this.objects.length} objects and ${objectsNeedingTextures.length} textures`);

        // Apply pending effects after a short delay to ensure all objects are loaded
        setTimeout(() => {
            this.applyPendingEffects();
        }, 500);

        return true;
    }

    /**
     * Load a ShapeForge model from IndexedDB
     * @param {string} modelId - ID of the model to load
     * @returns {Promise<Object>} - Promise resolving to the loaded objects
     */
    async loadModelFromIndexedDB(modelId) {
        if (!this.resourceManager) {
            throw new Error("ResourceManager not available");
        }

        try {
            // Get the model data from resourceManager
            let model;

            // Check if the model exists in memory first
            if (this.resourceManager.resources.shapeforge) {
                model = this.resourceManager.resources.shapeforge.get(modelId);
            }

            // If not in memory, try loading from IndexedDB
            if (!model && typeof this.resourceManager.loadModelFromIndexedDB === 'function') {
                model = await this.resourceManager.loadModelFromIndexedDB(modelId);
            }

            if (!model) {
                throw new Error(`Model with ID ${modelId} not found`);
            }

            console.log('Loading model:', model.name);

            // Parse the model data
            let jsonData;
            if (typeof model.data === 'object' && model.data !== null) {
                jsonData = model.data;
            } else if (typeof model.data === 'string') {
                jsonData = JSON.parse(model.data);
            } else {
                throw new Error('Invalid model data format');
            }

            // Load the project data
            this.loadProjectFromJson(jsonData);

            // Return the loaded objects for further processing
            return this.objects;
        } catch (error) {
            console.error('Error loading model from IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Create an object from JSON data
     * @param {Object} objData - Object data
     * @returns {Object} Created object
     */
    createObjectFromData(objData) {
        console.log("Creating object from data:", objData.name, objData.type);

        // Create geometry based on type
        let geometry;

        // Special handling for merged objects with geometryData
        if (objData.type === 'merged' && objData.geometryData) {
            console.log("Creating merged geometry from geometryData");

            // Create a BufferGeometry from the saved vertex data
            geometry = new THREE.BufferGeometry();

            // Add attributes from geometryData
            if (objData.geometryData.vertices && objData.geometryData.vertices.length > 0) {
                const vertices = new Float32Array(objData.geometryData.vertices);
                geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            }

            if (objData.geometryData.normals && objData.geometryData.normals.length > 0) {
                const normals = new Float32Array(objData.geometryData.normals);
                geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
            }

            if (objData.geometryData.uvs && objData.geometryData.uvs.length > 0) {
                const uvs = new Float32Array(objData.geometryData.uvs);
                geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
            }

            if (objData.geometryData.indices && objData.geometryData.indices.length > 0) {
                geometry.setIndex(objData.geometryData.indices);
            }
        } else {
            switch (objData.type) {
                case 'cube':
                    geometry = new THREE.BoxGeometry(
                        objData.parameters.width,
                        objData.parameters.height,
                        objData.parameters.depth,
                        objData.parameters.widthSegments,
                        objData.parameters.heightSegments,
                        objData.parameters.depthSegments
                    );
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(
                        objData.parameters.radius,
                        objData.parameters.widthSegments,
                        objData.parameters.heightSegments
                    );
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        objData.parameters.radiusTop,
                        objData.parameters.radiusBottom,
                        objData.parameters.height,
                        objData.parameters.radialSegments
                    );
                    break;
                case 'cone':
                    geometry = new THREE.ConeGeometry(
                        objData.parameters.radius,
                        objData.parameters.height,
                        objData.parameters.radialSegments
                    );
                    break;
                case 'torus':
                    geometry = new THREE.TorusGeometry(
                        objData.parameters.radius,
                        objData.parameters.tube,
                        objData.parameters.radialSegments,
                        objData.parameters.tubularSegments
                    );
                    break;
                case 'plane':
                    geometry = new THREE.PlaneGeometry(
                        objData.parameters.width,
                        objData.parameters.height,
                        objData.parameters.widthSegments,
                        objData.parameters.heightSegments
                    );
                    break;
                case 'tetrahedron':
                    geometry = new THREE.TetrahedronGeometry(
                        objData.parameters.radius,
                        objData.parameters.detail
                    );
                    break;
                case 'octahedron':
                    geometry = new THREE.OctahedronGeometry(
                        objData.parameters.radius,
                        objData.parameters.detail
                    );
                    break;
                case 'dodecahedron':
                    geometry = new THREE.DodecahedronGeometry(
                        objData.parameters.radius,
                        objData.parameters.detail
                    );
                    break;
                case 'icosahedron':
                    geometry = new THREE.IcosahedronGeometry(
                        objData.parameters.radius,
                        objData.parameters.detail
                    );
                    break;
                case 'd10':
                    // Since THREE.js doesn't have a built-in D10 shape, recreate it as in createD10
                    const sides = objData.parameters.sides || 10;
                    const d10Radius = objData.parameters.radius || 0.5;

                    // Define vertices
                    const vertices = [
                        [0, 0, 1],   // Top vertex
                        [0, 0, -1],  // Bottom vertex
                    ];

                    // Add vertices around the "equator"
                    for (let i = 0; i < sides; ++i) {
                        const b = (i * Math.PI * 2) / sides;
                        vertices.push([-Math.cos(b), -Math.sin(b), 0.105 * (i % 2 ? 1 : -1)]);
                    }

                    // Define faces
                    const faces = [
                        [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 6], [0, 6, 7],
                        [0, 7, 8], [0, 8, 9], [0, 9, 10], [0, 10, 11], [0, 11, 2],
                        [1, 3, 2], [1, 4, 3], [1, 5, 4], [1, 6, 5], [1, 7, 6],
                        [1, 8, 7], [1, 9, 8], [1, 10, 9], [1, 11, 10], [1, 2, 11]
                    ];

                    // Flatten arrays
                    const flatVertices = [];
                    vertices.forEach(v => {
                        if (Array.isArray(v)) {
                            flatVertices.push(v[0], v[1], v[2]);
                        } else {
                            flatVertices.push(v);
                        }
                    });

                    const flatFaces = [];
                    faces.forEach(f => flatFaces.push(...f));

                    // Create geometry
                    geometry = new THREE.PolyhedronGeometry(
                        flatVertices,
                        flatFaces,
                        d10Radius,
                        0
                    );
                    break;

                // New shapes
                case 'torusKnot':
                    geometry = new THREE.TorusKnotGeometry(
                        objData.parameters.radius || 0.4,
                        objData.parameters.tube || 0.1,
                        objData.parameters.tubularSegments || 64,
                        objData.parameters.radialSegments || 8,
                        objData.parameters.p || 2,
                        objData.parameters.q || 3
                    );
                    break;

                case 'pyramid':
                    geometry = new THREE.ConeGeometry(
                        objData.parameters.radius || 0.5,
                        objData.parameters.height || 1,
                        objData.parameters.radialSegments || 3,
                        objData.parameters.heightSegments || 1
                    );
                    break;

                case 'capsule':
                    geometry = new THREE.CapsuleGeometry(
                        objData.parameters.radius || 0.3,
                        objData.parameters.length || 0.6,
                        objData.parameters.capSegments || 4,
                        objData.parameters.radialSegments || 8
                    );
                    break;

                case 'hemisphere':
                    geometry = new THREE.SphereGeometry(
                        objData.parameters.radius || 0.5,
                        objData.parameters.widthSegments || 32,
                        objData.parameters.heightSegments || 16,
                        objData.parameters.phiStart || 0,
                        objData.parameters.phiLength || Math.PI * 2,
                        objData.parameters.thetaStart || 0,
                        objData.parameters.thetaLength || Math.PI / 2
                    );
                    break;



                case 'tube':
                    // Create a curved path for the tube to follow
                    let curve;

                    if (objData.parameters.path === 'circle') {
                        // Use the radius parameter to scale the curve points
                        const radius = objData.parameters.radius || 0.5;
                        curve = new THREE.CatmullRomCurve3([
                            new THREE.Vector3(-radius, 0, 0),
                            new THREE.Vector3(0, radius, radius),
                            new THREE.Vector3(radius, 0, 0),
                            new THREE.Vector3(0, -radius, -radius)
                        ]);
                        curve.closed = true;
                    } else {
                        // Create a default curve if path type not recognized
                        const radius = objData.parameters.radius || 0.5;
                        curve = new THREE.CatmullRomCurve3([
                            new THREE.Vector3(-radius, 0, 0),
                            new THREE.Vector3(0, radius, 0),
                            new THREE.Vector3(radius, 0, 0)
                        ]);
                    }

                    geometry = new THREE.TubeGeometry(
                        curve,
                        objData.parameters.tubularSegments || 32,
                        objData.parameters.tube || 0.1,
                        objData.parameters.radialSegments || 8,
                        true
                    );
                    break;

                case 'star':
                    // Get parameters
                    const points = objData.parameters.points || 5;
                    const outerRadius = objData.parameters.outerRadius || 0.5;
                    const innerRadius = objData.parameters.innerRadius || 0.2;
                    const depth = objData.parameters.depth || 0.2;
                    const bevelThickness = objData.parameters.bevelThickness || 0.05;
                    const bevelSize = objData.parameters.bevelSize || 0.05;

                    // Create a star shape
                    const shape = new THREE.Shape();

                    for (let i = 0; i < points * 2; i++) {
                        // Alternate between outer and inner radius
                        const radius = i % 2 === 0 ? outerRadius : innerRadius;
                        const angle = (Math.PI / points) * i;

                        const x = Math.sin(angle) * radius;
                        const y = Math.cos(angle) * radius;

                        if (i === 0) {
                            shape.moveTo(x, y);
                        } else {
                            shape.lineTo(x, y);
                        }
                    }

                    shape.closePath();

                    // Extrude the shape to create a 3D star
                    const extrudeSettings = {
                        depth: depth,
                        bevelEnabled: true,
                        bevelThickness: bevelThickness,
                        bevelSize: bevelSize,
                        bevelSegments: 3
                    };

                    geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    break;

                default:
                    console.warn(`Unknown geometry type: ${objData.type}`);
                    return null;
            }
        }

        let material;
        if (objData.material) {
            console.log("Creating material of type:", objData.material.type);

            const materialParams = {
                color: objData.material.color !== undefined ? objData.material.color : 0x3388ff,
                wireframe: objData.material.wireframe || false
            };

            if (objData.material.transparent) {
                materialParams.transparent = true;
                materialParams.opacity = objData.material.opacity !== undefined ? objData.material.opacity : 1;
            }

            switch (objData.material.type) {
                case 'MeshBasicMaterial':
                    material = new THREE.MeshBasicMaterial(materialParams);
                    break;
                case 'MeshStandardMaterial':
                    materialParams.roughness = objData.material.roughness !== undefined ? objData.material.roughness : 0.5;
                    materialParams.metalness = objData.material.metalness !== undefined ? objData.material.metalness : 0;
                    material = new THREE.MeshStandardMaterial(materialParams);
                    break;
                case 'MeshPhongMaterial':
                    material = new THREE.MeshPhongMaterial(materialParams);
                    break;
                case 'MeshLambertMaterial':
                    material = new THREE.MeshLambertMaterial(materialParams);
                    break;
                default:
                    material = new THREE.MeshStandardMaterial(materialParams);
            }

            //  Store the original color information
            if (objData.material.color !== undefined) {
                if (!material.userData) material.userData = {};
                material.userData.specifiedColor = new THREE.Color(objData.material.color);
            }
        } else {
            console.log("No material data, creating default material");
            material = this.createDefaultMaterial();
        }

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Create object data
        const objectData = {
            type: objData.type,
            name: objData.name || `${objData.type} ${this.objects.length + 1}`,
            geometry: geometry,
            material: material,
            mesh: mesh,
            parameters: objData.parameters,
            position: objData.position || { x: 0, y: 0, z: 0 },
            rotation: objData.rotation || { x: 0, y: 0, z: 0 },
            scale: objData.scale || { x: 1, y: 1, z: 1 }
        };

        // Add physics properties to this object:
if (objData.physics) {
    objectData.physics = {
      isRegularWall: objData.physics.isRegularWall || false,
      isRaisedBlock: objData.physics.isRaisedBlock || false,
      blockHeight: objData.physics.blockHeight !== undefined ? objData.physics.blockHeight : 1.0
    };
    
    // Also add these to mesh.userData for easy access by the game engine
    mesh.userData.isRegularWall = objData.physics.isRegularWall || false;
    mesh.userData.isRaisedBlock = objData.physics.isRaisedBlock || false;
    mesh.userData.blockHeight = objData.physics.blockHeight !== undefined ? objData.physics.blockHeight : 1.0;
    
    console.log(`Applied physics properties to ${objectData.name}: `, objectData.physics);
  }

        // Add to scene
        this.scene.add(mesh);

        // Apply transforms
        mesh.position.set(
            objectData.position.x,
            objectData.position.y,
            objectData.position.z
        );

        mesh.rotation.set(
            objectData.rotation.x,
            objectData.rotation.y,
            objectData.rotation.z
        );

        mesh.scale.set(
            objectData.scale.x,
            objectData.scale.y,
            objectData.scale.z
        );

        // Add to objects array
        this.objects.push(objectData);

        // Store effect data for later application
        if (objData.effect) {
            objectData.pendingEffect = objData.effect;
        }

        return objectData;
    }


    /**
     * Load and apply a texture to an object
     * @param {Object} objectData - The object data to apply the texture to
     * @param {Object} textureData - The texture data
     */

    loadAndApplyTextureToObject(objectData, textureData) {
        if (!objectData || !textureData || !textureData.data) {
            console.warn("Cannot apply texture: Invalid data");
            return;
        }

        console.log("Applying texture to", objectData.name);

        // Create a texture loader
        const loader = new THREE.TextureLoader();

        // Load the texture from the data URL
        loader.load(
            textureData.data,
            (texture) => {
                console.log("Texture loaded successfully for", objectData.name);

                // Configure texture parameters
                if (textureData.repeat && textureData.repeat.length === 2) {
                    texture.repeat.set(textureData.repeat[0], textureData.repeat[1]);
                }

                if (textureData.offset && textureData.offset.length === 2) {
                    texture.offset.set(textureData.offset[0], textureData.offset[1]);
                }

                if (textureData.rotation !== undefined) {
                    texture.rotation = textureData.rotation;
                }

                // Set wrapping modes
                texture.wrapS = textureData.wrapS || THREE.RepeatWrapping;
                texture.wrapT = textureData.wrapT || THREE.RepeatWrapping;

                // Apply the texture to the object's material
                if (objectData.material) {
                    // Simply apply the texture without changing color
                    objectData.material.map = texture;

                    // Store information that this material has a texture
                    objectData.material.userData = objectData.material.userData || {};
                    objectData.material.userData.hasTexture = true;

                    // If no effect is currently applied, reset to white for proper texture display
                    const hasEffect = objectData.effect && objectData.effect.data;
                    if (!hasEffect) {
                        objectData.material.color.set(0xffffff);
                    }

                    objectData.material.needsUpdate = true;
                    console.log("Applied texture to", objectData.name);
                }
            },
            undefined,
            (error) => {
                console.error("Error loading texture for", objectData.name, error);
            }
        );
    }

    /**
     * Create a default material for new objects
     * @returns {THREE.Material} The created material
     */
    createDefaultMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x3388ff,
            roughness: 0.5,
            metalness: 0.0
        });
    }

    /**
     * Apply pending effects to objects
     */
    applyPendingEffects() {
        console.log(`Applying effects to ${this.objects.length} objects`);

        this.objects.forEach((obj, index) => {
            // if (obj.pendingEffect) {
            //     console.log(`Applying ${typeof obj.pendingEffect === 'string' ?
            //         obj.pendingEffect : obj.pendingEffect.type} effect to ${obj.name}`);

            //     // Select the object first
            //     this.selectObject(index);

            //     // Handle both string-only and object format
            //     const effectType = typeof obj.pendingEffect === 'string' ?
            //         obj.pendingEffect : obj.pendingEffect.type;

            //     // Apply the effect
            //     this.applyShaderEffect(effectType);

            if (obj.pendingEffect) {
                console.log(`Applying ${typeof obj.pendingEffect === 'string' ?
                    obj.pendingEffect : obj.pendingEffect.type} effect to ${obj.name}`);
            
                // Select the object first
                this.selectObject(index);
            
                // Handle both string-only and object format
                const effectType = typeof obj.pendingEffect === 'string' ?
                    obj.pendingEffect : obj.pendingEffect.type;
                
                // Create parameters object including scale
                const effectParams = typeof obj.pendingEffect === 'object' ? 
                    obj.pendingEffect.parameters || {} : {};
                    
                // Ensure scale parameter exists
                if (effectParams.scale === undefined) {
                    effectParams.scale = 1.0;
                }
            
                // Apply the effect with parameters including scale
                this.applyShaderEffect(effectType, effectParams);


                // // Apply any specific effect parameters if available
                // if (typeof obj.pendingEffect === 'object' && obj.pendingEffect.parameters) {
                //     this.applyEffectParameters(obj, obj.pendingEffect.parameters);
                // }

                // Clear pending effect
                delete obj.pendingEffect;
            }
        });
    }

    /**
     * Apply effect parameters to an object's effect
     * @param {Object} obj - The object with the effect
     * @param {Object} parameters - Effect parameters to apply
     */
    applyEffectParameters(obj, parameters) {
        if (!obj.effect || !obj.effect.data) return;

        // Apply common parameters
        if (parameters.intensity !== undefined && obj.effect.data.light) {
            obj.effect.data.light.intensity = parameters.intensity;
        }

        if (parameters.color !== undefined) {
            // Apply to light if available
            if (obj.effect.data.light) {
                obj.effect.data.light.color.setHex(parameters.color);
            }

            // Apply to emissive material if available
            if (obj.mesh.material && obj.mesh.material.emissive) {
                obj.mesh.material.emissive.setHex(parameters.color);
            }

            // Apply to particle colors if available
            if (obj.effect.data.particles &&
                obj.effect.data.particles.material &&
                obj.effect.data.particles.material.color) {
                obj.effect.data.particles.material.color.setHex(parameters.color);
            }
        }

        // Handle scale parameter
if (parameters.scale !== undefined) {
    // Store scale value in effect data
    if (obj.effect.data) {
        obj.effect.data.scale = parameters.scale;
    }
    
    // If the effect has light and particles, try to scale them
    if (obj.effect.data.light) {
        const objectSize = this.getObjectSize(obj.mesh);
        const effectRadius = objectSize * parameters.scale;
        
        // Adjust light range
        if (typeof obj.effect.data.light.distance === 'number') {
            obj.effect.data.light.distance = effectRadius * 2;
        }
    }
    
    // Scale particle size if available
    if (obj.effect.data.particles && 
        obj.effect.data.particles.material &&
        typeof obj.effect.data.particles.material.size === 'number') {
        const baseSize = 0.05;  // Default base size
        obj.effect.data.particles.material.size = baseSize * parameters.scale;
    }
    
    // For large scale changes, might be better to recreate the entire effect
    // But we'll skip that complexity for now
}

        // Apply effect-specific parameters
        switch (obj.effect.type) {
            case 'fire':
            case 'lava':
                // Apply fire-specific parameters
                break;

            case 'glow':
            case 'holy':
                // Apply glow-specific parameters
                break;

            case 'magic':
                break;
            case 'coldMagic':
                // Apply magic-specific parameters
                break;
        }
    }

    /**
     * Select an object by index
     * @param {number} index - Index of object to select
     * @returns {Object} Selected object
     */
    selectObject(index) {
        if (index < 0 || index >= this.objects.length) return;
        this.selectedObject = index;
        return this.objects[index];
    }

    /**
 * Get the approximate size of an object for scaling effects
 * @param {Object} object - The object to measure
 * @returns {number} Approximate size of the object
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
                    size.x *= object.scale.x;
                    size.y *= object.scale.y;
                    size.z *= object.scale.z;
                }
                
                // Return average dimension as an approximation of size
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
    } catch (error) {
        console.warn("Error determining object size:", error);
    }
    
    // Default fallback
    return defaultSize;
}

    /**
     * Apply shader effect to the selected object
     * @param {string} effectType - Type of effect to apply
     */
//     applyShaderEffect(effectType) {
//         if (this.selectedObject === null) {
//             console.warn('No object selected, cannot apply shader effect');
//             return;
//         }

//         // Handle 'none' case - remove current effect
//         if (effectType === 'none') {
//             const object = this.objects[this.selectedObject];
//             if (object.effect) {
//                 console.log('Removing shader effect from object');
//                 // Remove existing effect if any
//                 if (object.effect.data.container && object.effect.data.container.parent) {
//                     this.scene.remove(object.effect.data.container);
//                 }

//                 if (object.effect.data.light && object.effect.data.light.parent) {
//                     this.scene.remove(object.effect.data.light);
//                 }

//                 if (object.effect.data.particles && object.effect.data.particles.parent) {
//                     this.scene.remove(object.effect.data.particles);
//                 }

//                 // Reset emissive if it was changed
//                 if (object.mesh.material && object.mesh.material.emissive !== undefined &&
//                     object.mesh.userData.originalEmissive) {
//                     object.mesh.material.emissive.copy(object.mesh.userData.originalEmissive);
//                     if (object.mesh.userData.originalEmissiveIntensity !== undefined) {
//                         object.mesh.material.emissiveIntensity = object.mesh.userData.originalEmissiveIntensity;
//                     }
//                 }

//                 // Clear effect data
//                 delete object.effect;
//             }
//             return;
//         }

//         const object = this.objects[this.selectedObject];

//         try {
//             // Remove existing effect if any
//             if (object.effect) {
//                 // Remove from scene first
//                 if (object.effect.data.container && object.effect.data.container.parent) {
//                     this.scene.remove(object.effect.data.container);
//                 }

//                 if (object.effect.data.light && object.effect.data.light.parent) {
//                     this.scene.remove(object.effect.data.light);
//                 }

//                 if (object.effect.data.particles && object.effect.data.particles.parent) {
//                     this.scene.remove(object.effect.data.particles);
//                 }

//                 // Reset emissive if it was changed
//                 if (object.mesh.material && object.mesh.material.emissive !== undefined &&
//                     object.mesh.userData.originalEmissive) {
//                     object.mesh.material.emissive.copy(object.mesh.userData.originalEmissive);
//                     if (object.mesh.userData.originalEmissiveIntensity !== undefined) {
//                         object.mesh.material.emissiveIntensity = object.mesh.userData.originalEmissiveIntensity;
//                     }
//                 }

//                 delete object.effect;
//             }

//             let effectData;

//             // Before applying effect, ensure texture is preserved by setting material color to white
//             if (object.mesh.material && object.mesh.material.map) {
//                 // Store original color if not already stored
//                 if (!object.mesh.userData.originalColor) {
//                     object.mesh.userData.originalColor = object.mesh.material.color.clone();
//                 }
//                 // Set to white to prevent texture tinting
//                 object.mesh.material.color.set(0xffffff);
//             }

//             // let effectOptions = {
//             //     color: parameters?.color || 0x66ccff,
//             //     intensity: parameters?.intensity || 1.0,
//             //     scale: parameters?.scale || 1.0  // Add default scale
//             // };
            
//             // // Make sure this gets passed to the shader effect manager's create method
//             // if (this.shaderEffects && this.shaderEffects.effectDefinitions) {
//             //     const effectDefinition = this.shaderEffects.effectDefinitions.get(effectType);
//             //     if (effectDefinition && typeof effectDefinition.create === 'function') {
//             //         // Create comprehensive parameters object including scale
//             //         const params = {
//             //             ...effectDefinition,
//             //             color: effectOptions.color,
//             //             intensity: effectOptions.intensity,
//             //             scale: effectOptions.scale  // Make sure scale is included
//             //         };
                    
//             //         effectData = effectDefinition.create(object.mesh, params, this.shaderEffects.qualityLevel || 'medium');
//             //     }
//             // }

//             // // Try to get the effect from ShaderEffectsManager
//             // if (this.shaderEffects && this.shaderEffects.effectDefinitions) {
//             //     const effectDefinition = this.shaderEffects.effectDefinitions.get(effectType);

//             //     if (effectDefinition && typeof effectDefinition.create === 'function') {
//             //         console.log(`Using ShaderEffectsManager to create ${effectType} effect`);

//             //         // Use ShaderEffectsManager's create method
//             //         effectData = effectDefinition.create(object.mesh, effectDefinition, this.shaderEffects.qualityLevel || 'medium');
//             //     } else {
//             //         console.log(`Effect type ${effectType} not found in ShaderEffectsManager or has no create method`);
//             //     }
//             // } else {
//             //     console.log(`ShaderEffectsManager not available for effect: ${effectType}`);
//             // }

//             // integrated version:

// // Initialize effect options with parameters including scale
// let effectOptions = {
//     color: 0x66ccff,
//     intensity: 1.0,
//     scale: 1.0
// };

// // Then apply parameters if they exist:
// if (effectParams) { // Use whatever variable name your method actually has
//     if (effectParams.color !== undefined) effectOptions.color = effectParams.color;
//     if (effectParams.intensity !== undefined) effectOptions.intensity = effectParams.intensity;
//     if (effectParams.scale !== undefined) effectOptions.scale = effectParams.scale;
// }

// // Try to get the effect from ShaderEffectsManager
// if (this.shaderEffects && this.shaderEffects.effectDefinitions) {
//     const effectDefinition = this.shaderEffects.effectDefinitions.get(effectType);
    
//     if (effectDefinition && typeof effectDefinition.create === 'function') {
//         console.log(`Using ShaderEffectsManager to create ${effectType} effect`);
        
//         // Create comprehensive parameters object including scale
//         const params = {
//             ...effectDefinition,
//             color: effectOptions.color,
//             intensity: effectOptions.intensity,
//             scale: effectOptions.scale  // Make sure scale is included
//         };
        
//         // Use ShaderEffectsManager's create method with our parameters
//         effectData = effectDefinition.create(object.mesh, params, this.shaderEffects.qualityLevel || 'medium');
//     } else {
//         console.log(`Effect type ${effectType} not found in ShaderEffectsManager or has no create method`);
//     }
// } else {
//     console.log(`ShaderEffectsManager not available for effect: ${effectType}`);
// }



//             // If no effect data yet, use fallbacks
//             if (!effectData) {
//                 console.log(`Using fallback for effect type: ${effectType}`);
//                 // Use appropriate fallback based on effect type
//                 switch (effectType) {
//                     // case 'glow':
//                     //     effectData = this.createPropGlowEffect(object.mesh, { color: 0x66ccff, intensity: 0.5 });
//                     //     break;
//                     // case 'fire':
//                     //     effectData = this.createSimpleFireEffect(object.mesh, { color: 0xff6600, intensity: 1.2 });
//                     //     break;
//                     // case 'burning':
//                     //     // Non-colorizing version
//                     //     effectData = this.createSimpleBurningEffect(object.mesh, { color: 0xff6600, intensity: 1.2 });
//                     //     break;
//                     // case 'magic':
//                     //     effectData = this.createSimpleMagicEffect(object.mesh, { color: 0x8800ff, intensity: 0.8 });
//                     //     break;
//                     // case 'lava':
//                     //     effectData = this.createSimpleFireEffect(object.mesh, { color: 0xff3300, intensity: 1.3 });
//                     //     break;
//                     // case 'holy':
//                     //     effectData = this.createPropGlowEffect(object.mesh, { color: 0xffe599, intensity: 1.0 });
//                     //     break;
//                     // case 'coldMagic':
//                     //     effectData = this.createSimpleMagicEffect(object.mesh, { color: 0x88ccff, intensity: 0.6 });
//                     //     break;
//                     // case 'portalEffect':
//                     //     effectData = this.createSimplePortalEffect(object.mesh, { color: 0x66ccff, intensity: 1.2 });
//                     //     break;
//                     case 'glow':
//     effectData = this.createPropGlowEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'fire':
//     effectData = this.createSimpleFireEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'burning':
//     // Non-colorizing version
//     effectData = this.createSimpleBurningEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'magic':
//     effectData = this.createSimpleMagicEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'lava':
//     effectData = this.createSimpleFireEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'holy':
//     effectData = this.createPropGlowEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'coldMagic':
//     effectData = this.createSimpleMagicEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
// case 'portalEffect':
//     effectData = this.createSimplePortalEffect(object.mesh, {
//         color: effectOptions.color, 
//         intensity: effectOptions.intensity,
//         scale: effectOptions.scale  // Add scale parameter
//     });
//     break;
//                     default:
//                         // Default fallback for unknown types
//                         console.log(`Using fallback glow effect for unknown type: ${effectType}`);
//                         effectData = this.createPropGlowEffect(object.mesh, { color: 0x66ccff, intensity: 0.5 });
//                 }
//             }

//             // Check if object has a texture - if so, we need special handling
//             if (object.mesh.material && object.mesh.material.userData && object.mesh.material.userData.hasTexture) {
//                 // Store the texture reference
//                 const textureMap = object.mesh.material.map;

//                 // If we're about to apply an effect that manipulates the material,
//                 // create a special note for the update method
//                 object.mesh.material.userData.preserveTexture = true;

//                 // If we're creating a new material for the effect, make sure 
//                 // we transfer the texture to it
//                 if (effectData && effectData.transferTexture) {
//                     effectData.transferTexture(textureMap);
//                 }
//             }

//             if (effectData && effectData.container) {
//                 // Remove container from scene if it was added there
//                 if (effectData.container.parent === this.scene) {
//                     this.scene.remove(effectData.container);
//                 }

//                 // Reset container position to origin relative to parent
//                 effectData.container.position.set(0, 0, 0);

//                 // Copy rotation from the object to the effect container
//                 effectData.container.rotation.copy(object.mesh.rotation);

//                 // Add container as a child of the object mesh
//                 object.mesh.add(effectData.container);

//                 console.log(`Attached effect container to object ${object.name}`);
//             }

//             // Store effect data with object
//             if (effectData) {
//                 object.effect = {
//                     type: effectType,
//                     data: effectData
//                 };

//                 console.log(`Applied ${effectType} effect to ${object.name}`);
//             }
//         } catch (error) {
//             console.error(`Error applying ${effectType} effect:`, error);
//         }

// new store for archive resons...
// if (effectData) {
//     object.effect = {
//         type: effectType,
//         parameters: {
//             color: effectOptions.color,
//             intensity: effectOptions.intensity,
//             scale: effectOptions.scale,
//             // Include any other parameters that were passed
//             ...(effectParams || {})
//         },
//         data: effectData
//     };

//     console.log(`Applied ${effectType} effect to ${object.name}`);
// }
//     }

/**
 * Apply shader effect to the selected object
 * @param {string} effectType - Type of effect to apply
 * @param {Object} effectParams - Optional effect parameters
 */
applyShaderEffect(effectType, effectParams) {
    if (this.selectedObject === null) {
        console.warn('No object selected, cannot apply shader effect');
        return;
    }

    // Handle 'none' case - remove current effect
    if (effectType === 'none') {
        const object = this.objects[this.selectedObject];
        if (object.effect) {
            console.log('Removing shader effect from object');
            // Remove existing effect if any
            if (object.effect.data.container && object.effect.data.container.parent) {
                this.scene.remove(object.effect.data.container);
            }

            if (object.effect.data.light && object.effect.data.light.parent) {
                this.scene.remove(object.effect.data.light);
            }

            if (object.effect.data.particles && object.effect.data.particles.parent) {
                this.scene.remove(object.effect.data.particles);
            }

            // Reset emissive if it was changed
            if (object.mesh.material && object.mesh.material.emissive !== undefined &&
                object.mesh.userData.originalEmissive) {
                object.mesh.material.emissive.copy(object.mesh.userData.originalEmissive);
                if (object.mesh.userData.originalEmissiveIntensity !== undefined) {
                    object.mesh.material.emissiveIntensity = object.mesh.userData.originalEmissiveIntensity;
                }
            }

            // Clear effect data
            delete object.effect;
        }
        return;
    }

    const object = this.objects[this.selectedObject];

    try {
        // Remove existing effect if any
        if (object.effect) {
            // Remove from scene first
            if (object.effect.data.container && object.effect.data.container.parent) {
                this.scene.remove(object.effect.data.container);
            }

            if (object.effect.data.light && object.effect.data.light.parent) {
                this.scene.remove(object.effect.data.light);
            }

            if (object.effect.data.particles && object.effect.data.particles.parent) {
                this.scene.remove(object.effect.data.particles);
            }

            // Reset emissive if it was changed
            if (object.mesh.material && object.mesh.material.emissive !== undefined &&
                object.mesh.userData.originalEmissive) {
                object.mesh.material.emissive.copy(object.mesh.userData.originalEmissive);
                if (object.mesh.userData.originalEmissiveIntensity !== undefined) {
                    object.mesh.material.emissiveIntensity = object.mesh.userData.originalEmissiveIntensity;
                }
            }

            delete object.effect;
        }

        let effectData;

        // Before applying effect, ensure texture is preserved by setting material color to white
        if (object.mesh.material && object.mesh.material.map) {
            // Store original color if not already stored
            if (!object.mesh.userData.originalColor) {
                object.mesh.userData.originalColor = object.mesh.material.color.clone();
            }
            // Set to white to prevent texture tinting
            object.mesh.material.color.set(0xffffff);
        }

        // Initialize default effect options
        let effectOptions = {
            color: 0x66ccff,
            intensity: 1.0,
            scale: 1.0  // Default scale
        };

        // Apply any provided parameters
        if (effectParams) {
            if (effectParams.color !== undefined) effectOptions.color = effectParams.color;
            if (effectParams.intensity !== undefined) effectOptions.intensity = effectParams.intensity;
            if (effectParams.scale !== undefined) effectOptions.scale = effectParams.scale;
        }

        // Try to get the effect from ShaderEffectsManager
        if (this.shaderEffects && this.shaderEffects.effectDefinitions) {
            const effectDefinition = this.shaderEffects.effectDefinitions.get(effectType);
            
            if (effectDefinition && typeof effectDefinition.create === 'function') {
                console.log(`Using ShaderEffectsManager to create ${effectType} effect`);
                
                // Create comprehensive parameters object including scale
                const params = {
                    ...effectDefinition,
                    color: effectOptions.color,
                    intensity: effectOptions.intensity,
                    scale: effectOptions.scale  // Make sure scale is included
                };
                
                // Use ShaderEffectsManager's create method with our parameters
                effectData = effectDefinition.create(object.mesh, params, this.shaderEffects.qualityLevel || 'medium');
            } else {
                console.log(`Effect type ${effectType} not found in ShaderEffectsManager or has no create method`);
            }
        } else {
            console.log(`ShaderEffectsManager not available for effect: ${effectType}`);
        }

        // If no effect data yet, use fallbacks
        if (!effectData) {
            console.log(`Using fallback for effect type: ${effectType}`);
            // Use appropriate fallback based on effect type
            switch (effectType) {
                case 'glow':
                    effectData = this.createPropGlowEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'fire':
                    effectData = this.createSimpleFireEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'burning':
                    // Non-colorizing version
                    effectData = this.createSimpleBurningEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'magic':
                    effectData = this.createSimpleMagicEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'lava':
                    effectData = this.createSimpleFireEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'holy':
                    effectData = this.createPropGlowEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'coldMagic':
                    effectData = this.createSimpleMagicEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                case 'portalEffect':
                    effectData = this.createSimplePortalEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
                    break;
                default:
                    // Default fallback for unknown types
                    console.log(`Using fallback glow effect for unknown type: ${effectType}`);
                    effectData = this.createPropGlowEffect(object.mesh, {
                        color: effectOptions.color,
                        intensity: effectOptions.intensity,
                        scale: effectOptions.scale
                    });
            }
        }

        // Check if object has a texture - if so, we need special handling
        if (object.mesh.material && object.mesh.material.userData && object.mesh.material.userData.hasTexture) {
            // Store the texture reference
            const textureMap = object.mesh.material.map;

            // If we're about to apply an effect that manipulates the material,
            // create a special note for the update method
            object.mesh.material.userData.preserveTexture = true;

            // If we're creating a new material for the effect, make sure 
            // we transfer the texture to it
            if (effectData && effectData.transferTexture) {
                effectData.transferTexture(textureMap);
            }
        }

        if (effectData && effectData.container) {
            // Remove container from scene if it was added there
            if (effectData.container.parent === this.scene) {
                this.scene.remove(effectData.container);
            }

            // Reset container position to origin relative to parent
            effectData.container.position.set(0, 0, 0);

            // Copy rotation from the object to the effect container
            effectData.container.rotation.copy(object.mesh.rotation);

            // Add container as a child of the object mesh
            object.mesh.add(effectData.container);

            console.log(`Attached effect container to object ${object.name}`);
        }

        // Store effect data with object
        if (effectData) {
            object.effect = {
                type: effectType,
                parameters: {
                    color: effectOptions.color,
                    intensity: effectOptions.intensity,
                    scale: effectOptions.scale,
                    // Include any other parameters that were passed
                    ...(effectParams || {})
                },
                data: effectData
            };

            console.log(`Applied ${effectType} effect to ${object.name}`);
        }
    } catch (error) {
        console.error(`Error applying ${effectType} effect:`, error);
    }
}



    /**
     * Simple fallback portal effect implementation if ShaderEffectsManager isn't available
     */
    createSimplePortalEffect(prop, options) {
        const defaults = {
            color: options.color || 0x66ccff,
            intensity: options.intensity || 1.2
        };

        // Create container for portal effect
        const container = new THREE.Group();
        container.position.copy(prop.position);
        // this.scene.add(container);

        // Add portal light
        const light = new THREE.PointLight(defaults.color, defaults.intensity, 4);
        light.position.y = 0.1; // Slightly above center
        container.add(light);

        // Create simple portal ring effect
        const portalGeometry = new THREE.TorusGeometry(0.7, 0.1, 16, 32);
        const portalMaterial = new THREE.MeshStandardMaterial({
            color: defaults.color,
            emissive: defaults.color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.8
        });

        const portalRing = new THREE.Mesh(portalGeometry, portalMaterial);
        portalRing.rotation.x = Math.PI / 2; // Lay flat
        container.add(portalRing);

        // Create center disk
        const centerGeometry = new THREE.CircleGeometry(0.6, 32);
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: defaults.color,
            transparent: true,
            opacity: 0.5
        });

        const centerDisk = new THREE.Mesh(centerGeometry, centerMaterial);
        centerDisk.rotation.x = Math.PI / 2; // Lay flat
        centerDisk.position.y = 0.01; // Slightly above ring
        container.add(centerDisk);

        return {
            container,
            light,
            originalObject: prop,
            portalRing,
            animationData: {
                time: 0,
                speed: 1.0
            },
            update: function (deltaTime) {
                this.animationData.time += deltaTime;
                const time = this.animationData.time;

                // Pulse the light
                if (light) {
                    light.intensity = defaults.intensity * (0.8 + Math.sin(time * 2) * 0.2);
                }

                // Rotate the portal ring slowly
                if (portalRing) {
                    portalRing.rotation.z = time * 0.2;
                }
            }
        };
    }



    createPropGlowEffect(prop, options) {
    const defaults = {
        color: options.color || 0x66ccff,
        intensity: options.intensity || 0.5,
        scale: options.scale || 1.0  // Add scale parameter with default
    };

    // Get object size and calculate effect scale
    const objectSize = this.getObjectSize(prop);
    const effectScale = objectSize * defaults.scale;

    // Create container for glow effect
    const container = new THREE.Group();
    container.position.copy(prop.position);
    this.scene.add(container);

    // Create a point light with range based on effect scale
    const light = new THREE.PointLight(defaults.color, defaults.intensity, effectScale * 2);
    container.add(light);

    // Store original material properties
    if (prop.material && prop.material.emissive !== undefined && !prop.userData.originalEmissive) {
        prop.userData.originalEmissive = prop.material.emissive.clone();
        prop.userData.originalEmissiveIntensity = prop.material.emissiveIntensity || 1.0;

        // IMPORTANT: We no longer modify the emissive property here
    }

    return {
        container: container,
        light: light,
        particles: null,
        originalObject: prop,
        scale: defaults.scale,  // Store scale for reference
        objectSize: objectSize  // Store original object size
    };
}

// Update the createSimpleFireEffect method to use scale:
createSimpleFireEffect(prop, options) {
    const defaults = {
        color: options.color || 0xff6600,
        intensity: options.intensity || 1.2,
        scale: options.scale || 1.0  // Add scale parameter with default
    };

    // Get object size and calculate effect scale
    const objectSize = this.getObjectSize(prop);
    const effectScale = objectSize * defaults.scale;

    // Create container for fire effect
    const container = new THREE.Group();
    container.position.copy(prop.position);
    this.scene.add(container);

    // Add fire light with range based on effect scale
    const light = new THREE.PointLight(defaults.color, defaults.intensity, effectScale * 3);
    light.position.y += 0.5 * effectScale; // Position above object, scaled appropriately
    container.add(light);

    // Create simple particle system for fire with count based on scale
    const particleCount = Math.max(15, Math.floor(30 * defaults.scale));
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    // Fire color
    const fireColor = new THREE.Color(defaults.color);

    // Create random particles in cone shape scaled to effect size
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.3 * effectScale;
        const height = Math.random() * 0.8 * effectScale;

        particlePositions[i3] = Math.cos(angle) * radius * (1 - height/(0.8 * effectScale));
        particlePositions[i3 + 1] = height;
        particlePositions[i3 + 2] = Math.sin(angle) * radius * (1 - height/(0.8 * effectScale));

        // Colors: start yellow-orange, fade to red
        const mixFactor = Math.random();
        particleColors[i3] = fireColor.r;
        particleColors[i3 + 1] = fireColor.g * mixFactor;
        particleColors[i3 + 2] = 0;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1 * defaults.scale,  // Scale particle size with effect scale
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    container.add(particles);

    // Store original positions for animation
    particles.userData = {
        positions: [...particlePositions],
        time: 0
    };

    return {
        container: container,
        light: light,
        particles: particles,
        originalObject: prop,
        scale: defaults.scale,  // Store scale for reference
        objectSize: objectSize, // Store original object size
        animationData: {
            time: 0,
            speed: 1.0
        },
        update: function (deltaTime) {
            // Animate particles
            this.animationData.time += deltaTime;
            const time = this.animationData.time;

            // Get position data
            const positions = particles.geometry.attributes.position.array;

            // Animate each particle with movement scaled to effect size
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;

                // Move up with varying speed, scaled appropriately
                positions[i3 + 1] += (0.01 + Math.random() * 0.01) * effectScale;

                // Reset if too high, scale height with effect size
                if (positions[i3 + 1] > 0.8 * effectScale) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = Math.random() * 0.3 * effectScale;

                    positions[i3] = Math.cos(angle) * radius;
                    positions[i3 + 1] = 0;
                    positions[i3 + 2] = Math.sin(angle) * radius;
                }

                // Add some "flickering" scaled to effect size
                positions[i3] += (Math.random() - 0.5) * 0.02 * effectScale;
                positions[i3 + 2] += (Math.random() - 0.5) * 0.02 * effectScale;
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;

            // Flicker the light
            light.intensity = defaults.intensity * (0.8 + Math.sin(time * 10) * 0.1 + Math.random() * 0.1);
        }
    };
}

// Update the createSimpleMagicEffect method to use scale:
createSimpleMagicEffect(prop, options) {
    const defaults = {
        color: options.color || 0x8800ff,
        intensity: options.intensity || 0.8,
        scale: options.scale || 1.0  // Add scale parameter with default
    };

    // Get object size and calculate effect scale
    const objectSize = this.getObjectSize(prop);
    const effectScale = objectSize * defaults.scale;

    // Create container for magic effect
    const container = new THREE.Group();
    container.position.copy(prop.position);
    this.scene.add(container);

    // Add magic light with range based on effect scale
    const light = new THREE.PointLight(defaults.color, defaults.intensity, effectScale * 3);
    light.position.y += 0.3 * effectScale;  // Scale position offset
    container.add(light);

    // Create particle system with count based on effect scale
    const particleCount = Math.max(20, Math.floor(40 * defaults.scale));
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    // Magic color
    const magicColor = new THREE.Color(defaults.color);

    // Create random particles in sphere shape scaled to effect size
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius = (Math.random() * 0.3 + 0.1) * effectScale;

        particlePositions[i3] = Math.cos(angle1) * Math.sin(angle2) * radius;
        particlePositions[i3 + 1] = Math.sin(angle1) * Math.sin(angle2) * radius;
        particlePositions[i3 + 2] = Math.cos(angle2) * radius;

        // Colors
        particleColors[i3] = magicColor.r;
        particleColors[i3 + 1] = magicColor.g;
        particleColors[i3 + 2] = magicColor.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05 * defaults.scale,  // Scale particle size with effect scale
        vertexColors: true,
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

    return {
        container: container,
        light: light,
        particles: particles,
        originalObject: prop,
        scale: defaults.scale,  // Store scale for reference
        objectSize: objectSize, // Store original object size
        animationData: {
            time: 0,
            speed: 0.7
        },
        update: function (deltaTime) {
            // Animate particles
            this.animationData.time += deltaTime;
            const time = this.animationData.time;

            // Get position data
            const positions = particles.geometry.attributes.position.array;
            const origPositions = particles.userData.positions;

            // Animate each particle in orbital pattern
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const angle = time + i * 0.2;

                positions[i3] = origPositions[i3] * Math.cos(angle * 0.5);
                positions[i3 + 1] = origPositions[i3 + 1] * Math.sin(angle * 0.5);
                positions[i3 + 2] = origPositions[i3 + 2] * Math.cos(angle * 0.3);
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;

            // Pulse the light
            light.intensity = defaults.intensity * (0.7 + Math.sin(time * 2) * 0.3);
        }
    };
}

    /**
     * Update all effects in the scene
     * @param {number} deltaTime - Time since last frame in seconds
     */
    updateEffects(deltaTime) {
        if (!deltaTime) return; // Skip if no deltaTime provided

        // Update object effects with a single loop
        this.objects.forEach(object => {
            if (object.effect && object.effect.data) {
                // Ensure container stays attached to parent
                if (object.effect.data.container && object.mesh &&
                    !object.mesh.children.includes(object.effect.data.container)) {
                    console.log(`Re-attaching effect container to ${object.name}`);
                    object.mesh.add(object.effect.data.container);
                }

                // If the effect has its own update method, call it
                if (typeof object.effect.data.update === 'function') {
                    try {
                        object.effect.data.update(deltaTime);
                    } catch (error) {
                        console.warn(`Error updating effect for ${object.name}:`, error);
                    }
                }
                // Otherwise, provide basic updates for different effect types
                else if (object.effect.type) {

                    switch (object.effect.type) {
                        case 'glow':
                            this.updateGlowEffect(object, deltaTime);
                            break;
                        case 'fire':
                        case 'burning':
                        case 'lava':
                            this.updateFireEffect(object, deltaTime);
                            break;
                        case 'magic':
                            this.updateEnhancedMagicEffect(object, deltaTime);
                            break;
                        case 'coldMagic':
                            this.updateMagicEffect(object, deltaTime);
                            break;
                        case 'holy':
                            this.updateHolyEffect(object, deltaTime);
                            break;
                        case 'waterProp':
                        case 'water':
                            this.updateWaterEffect(object, deltaTime);
                            break;
                        case 'portalEffect':
                            // Portal effects should have their own update method
                            // they're typically handled by the effect's update method
                            break;
                    }
                }
            }
        });
    }

    /**
     * Update glow effect animation
     * @param {Object} object - Object with the effect
     * @param {number} deltaTime - Time since last frame
     */
    updateGlowEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data || !object.effect.data.light) return;

        const light = object.effect.data.light;
        const time = Date.now() * 0.001; // Current time in seconds

        // Simple pulsing animation
        light.intensity = 0.5 + Math.sin(time * 2) * 0.2;
    }

    /**
 * Update holy effect animation
 * @param {Object} object - Object with the effect
 * @param {number} deltaTime - Time since last frame
 */
    updateHolyEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data) return;

        const data = object.effect.data;
        const light = data.light;
        const particles = data.particles;

        if (!light) return;

        const time = Date.now() * 0.001; // Current time in seconds

        // Gentle pulsing light
        light.intensity = 1.0 * (0.9 + Math.sin(time * 1.5) * 0.1);

        // Animate particles if available
        if (particles && particles.geometry && particles.geometry.attributes && particles.geometry.attributes.position) {
            const positions = particles.geometry.attributes.position.array;
            const count = positions.length / 3;
            const originalPositions = particles.userData && particles.userData.positions
                ? particles.userData.positions
                : [...positions];

            // Store original positions
            if (!particles.userData) particles.userData = {};
            if (!particles.userData.positions) particles.userData.positions = originalPositions;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;

                // Gentle rising motion with spiral
                const phase = time + i * 0.05;
                positions[i3] = originalPositions[i3] + Math.sin(phase * 2) * 0.02;
                positions[i3 + 1] = originalPositions[i3 + 1] + Math.sin(phase) * 0.01;
                positions[i3 + 2] = originalPositions[i3 + 2] + Math.cos(phase * 2) * 0.02;
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Update water effect animation
     * @param {Object} object - Object with the effect
     * @param {number} deltaTime - Time since last frame
     */
    updateWaterEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data) return;

        const data = object.effect.data;
        const mesh = data.mesh;
        const particles = data.particles;

        const time = Date.now() * 0.001; // Current time in seconds

        // Update water shader if available
        if (mesh && mesh.material && mesh.material.uniforms && mesh.material.uniforms.time) {
            mesh.material.uniforms.time.value = time;
        }

        // Animate particles if available
        if (particles && particles.geometry && particles.geometry.attributes && particles.geometry.attributes.position) {
            const positions = particles.geometry.attributes.position.array;
            const count = positions.length / 3;
            const originalPositions = particles.userData && particles.userData.positions
                ? particles.userData.positions
                : [...positions];

            // Store original positions
            if (!particles.userData) particles.userData = {};
            if (!particles.userData.positions) particles.userData.positions = originalPositions;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;

                // Flowing water motion
                positions[i3] = originalPositions[i3] + Math.sin(time * 2 + i) * 0.03;
                positions[i3 + 1] = originalPositions[i3 + 1] + Math.cos(time + i * 0.3) * 0.02;
                positions[i3 + 2] = originalPositions[i3 + 2] + Math.sin(time * 1.5 + i) * 0.03;

                // Reset if too far from original position
                const distance = Math.sqrt(
                    Math.pow(positions[i3] - originalPositions[i3], 2) +
                    Math.pow(positions[i3 + 1] - originalPositions[i3 + 1], 2) +
                    Math.pow(positions[i3 + 2] - originalPositions[i3 + 2], 2)
                );

                if (distance > 0.2) {
                    positions[i3] = originalPositions[i3];
                    positions[i3 + 1] = originalPositions[i3 + 1];
                    positions[i3 + 2] = originalPositions[i3 + 2];
                }
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Update fire effect animation
     * @param {Object} object - Object with the effect
     * @param {number} deltaTime - Time since last frame
     */
    updateFireEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data) return;

        const data = object.effect.data;
        const light = data.light;
        const particles = data.particles;

        if (!light || !particles) return;

        const time = Date.now() * 0.001; // Current time in seconds

        // Flicker the light
        light.intensity = 1.2 * (0.8 + Math.sin(time * 10) * 0.1 + Math.random() * 0.1);

        // Animate particles if they have position attribute
        if (particles.geometry && particles.geometry.attributes && particles.geometry.attributes.position) {
            const positions = particles.geometry.attributes.position.array;
            const count = positions.length / 3;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;

                // Move up slowly
                positions[i3 + 1] += 0.01;

                // Reset if too high
                if (positions[i3 + 1] > 0.8) {
                    positions[i3 + 1] = 0.2;
                }

                // Add some "flickering"
                positions[i3] += (Math.random() - 0.5) * 0.01;
                positions[i3 + 2] += (Math.random() - 0.5) * 0.01;
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Update cold effect animation
     * @param {Object} object - Object with the effect
     * @param {number} deltaTime - Time since last frame
     */
    updateMagicEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data) return;

        const data = object.effect.data;
        const light = data.light;
        const particles = data.particles;

        if (!light || !particles) return;

        const time = Date.now() * 0.001; // Current time in seconds

        // Pulse the light
        light.intensity = 0.8 * (0.7 + Math.sin(time * 2) * 0.3);

        // Animate particles if they have position attribute
        if (particles.geometry && particles.geometry.attributes && particles.geometry.attributes.position) {
            const positions = particles.geometry.attributes.position.array;
            const count = positions.length / 3;
            const originalPositions = particles.userData && particles.userData.positions
                ? particles.userData.positions
                : [...positions]; // Backup original positions

            // Store original positions if not already stored
            if (!particles.userData) particles.userData = {};
            if (!particles.userData.positions) particles.userData.positions = originalPositions;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const angle = time + i * 0.2;
                const radius = 0.05;

                // Orbital pattern for magic particles
                positions[i3] = originalPositions[i3] * Math.cos(angle * 0.5);
                positions[i3 + 1] = originalPositions[i3 + 1] * Math.sin(angle * 0.5);
                positions[i3 + 2] = originalPositions[i3 + 2] * Math.cos(angle * 0.3);
            }

            // Update geometry
            particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Update enhanced magic effect - the pulsating magic effect
     */
    updateEnhancedMagicEffect(object, deltaTime) {
        if (!object.effect || !object.effect.data) return;

        const data = object.effect.data;

        // If the effect has proper magicPlane properties, update them
        if (data.magicPlane && data.magicPlane.material) {
            // Update time
            data.magicPlane.material.uniforms.time.value += deltaTime;

            if (data.backPlane && data.backPlane.material) {
                data.backPlane.material.uniforms.time.value += deltaTime;
            }

            // Make planes face the camera if possible
            if (window.scene3D && window.scene3D.camera) {
                data.magicPlane.lookAt(window.scene3D.camera.position);
                if (data.backPlane) data.backPlane.lookAt(window.scene3D.camera.position);
            }
        }

        // Update light pulsing
        if (data.light) {
            const time = Date.now() * 0.001;
            data.light.intensity = 1.0 * (0.7 + Math.sin(time * 2) * 0.3);
        }

        // Update particles
        if (data.particles && data.particles.geometry &&
            data.particles.geometry.attributes &&
            data.particles.geometry.attributes.position) {

            const positions = data.particles.geometry.attributes.position.array;
            const count = positions.length / 3;
            const time = Date.now() * 0.001;

            // Get original positions if available
            const originalPositions = data.particles.userData && data.particles.userData.positions
                ? data.particles.userData.positions
                : [...positions];

            // Store original positions if needed
            if (!data.particles.userData) data.particles.userData = {};
            if (!data.particles.userData.positions) data.particles.userData.positions = originalPositions;

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const angle = time + i * 0.2;

                // Animate particles
                positions[i3] = originalPositions[i3] * Math.cos(angle * 0.5);
                positions[i3 + 1] = originalPositions[i3 + 1] * Math.sin(angle * 0.5);
                positions[i3 + 2] = originalPositions[i3 + 2] * Math.cos(angle * 0.3);
            }

            // Update geometry
            data.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    /**
     * Clean up all shader effects
     */
    cleanupAllShaderEffects() {
        if (!this.scene) return;

        // 1. Clean up known effects associated with objects
        this.objects.forEach(obj => {
            if (obj.effect && obj.effect.data) {
                if (obj.effect.data.container && obj.effect.data.container.parent) {
                    this.scene.remove(obj.effect.data.container);
                }

                // Remove lights and particles if they're not part of container
                if (obj.effect.data.light &&
                    (!obj.effect.data.container || obj.effect.data.light.parent !== obj.effect.data.container)) {
                    this.scene.remove(obj.effect.data.light);
                }

                if (obj.effect.data.particles &&
                    (!obj.effect.data.container || obj.effect.data.particles.parent !== obj.effect.data.container)) {
                    this.scene.remove(obj.effect.data.particles);
                }
            }
        });

        // 2. Clean up "orphaned" effects by checking scene children
        const itemsToRemove = [];

        this.scene.traverse(object => {
            // Look for typical effect objects
            if (object.type === 'PointLight' ||
                object.type === 'Points' ||
                (object.type === 'Group' && object.name === '') || // Container groups are usually unnamed
                (object.userData && object.userData.isShaderEffect)) {

                // Check if this is an "orphaned" effect (not a child of a mesh in objects array)
                let isOrphaned = true;
                this.objects.forEach(obj => {
                    if (obj.mesh === object ||
                        (obj.effect &&
                            (obj.effect.data.light === object ||
                                obj.effect.data.particles === object ||
                                obj.effect.data.container === object))) {
                        isOrphaned = false;
                    }
                });

                if (isOrphaned) {
                    itemsToRemove.push(object);
                }
            }
        });

        // Remove all orphaned effects
        itemsToRemove.forEach(item => {
            this.scene.remove(item);

            // Dispose of any materials and geometries
            if (item.material) item.material.dispose();
            if (item.geometry) item.geometry.dispose();
        });

        if (itemsToRemove.length > 0) {
            console.log(`Cleaned up ${itemsToRemove.length} orphaned shader effects`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up resources
        this.cleanupAllShaderEffects();

        // Dispose geometries and materials
        this.objects.forEach(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            if (obj.mesh && obj.mesh.parent) {
                obj.mesh.parent.remove(obj.mesh);
            }
        });

        // Clear references
        this.objects = [];
        this.scene = null;
        this.resourceManager = null;
        this.shaderEffects = null;

        console.log("ShapeForgeParser resources disposed");
    }
}

// Make parser globally available
// At the end of ShapeForgeParser.js
window.ShapeForgeParser = ShapeForgeParser;
console.log('ShapeForgeParser attached to window object', window.ShapeForgeParser ? 'SUCCESS' : 'FAILED');