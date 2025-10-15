// Description: This class is responsible for handling the physics of the player in the 3D scene.
class PhysicsController {
    constructor(scene3D) {
        this.scene3D = scene3D;
        this.playerHeight = 1.7;
        this.currentGroundHeight = 0;
        this.stepHeight = 0.5;
        this.halfBlockSize = 0.5;
        this.debug = false; // Set to true to enable debug logs
        this.fallSpeed = 0.05; // Speed of falling
        this.isFalling = false;
        this.insideRoomWall = false;
        this.onTopOfWall = false;        // Flag for walking on top of a wall
        this.wallTopHeight = 0;

        this.isJumping = false;
        this.jumpHeight = 1.7; // Maximum jump height - slightly higher than 1 block
        this.jumpSpeed = 0.09; // Initial upward velocity - increased for higher jumps
        this.jumpVelocity = 0;
        this.gravity = 0.004; // Gravity pulling player down
        this.fallVelocity = 0;
        this.jumpStartHeight = 0; // Track where jump started from
        this.lastJumpCheck = 0; // Track last time we checked for landing surfaces
        this.jumpCheckInterval = 5; // Check every 5 frames
        this.jumpFrameCount = 0; // Frame counter for jump checks
        this.justLanded = false;        // Flag for when landing occurs
        this.landingPosition = null;    // Where landing occurred
        this.landingVelocity = 0;       // How fast the landing was
        this.fallStartHeight = 0;       // Height where falling began
        this.fallDistance = 0;          // Total distance of the fall
        this.debug = false // Set to true to enable debug logs
    }


    checkCollision(direction, speed) {
        const collision = this.checkForwardCollision(direction, speed);

        if (collision.canMove) {
            // If jumping or falling, allow horizontal movement without height changes
            if (this.isJumping || this.isFalling) {
                return true;
            }

            // Normal ground movement with step detection
            return this.updatePlayerHeight(direction, speed);
        }

        // When jumping, allow moving slightly closer to walls
        if (this.isJumping || this.isFalling) {
            // Adjust collision distance during jumps to allow getting closer to edges
            const distanceToWall = collision.distance || 0;
            if (distanceToWall > 0.2) {
                return true;
            }
        }

        // Check if we hit a half block we can step onto (only when not jumping/falling)
        if (!this.isJumping && !this.isFalling) {
            const hitObject = collision.hitObject;
            if (hitObject?.userData?.isWall && hitObject?.userData?.blockHeight > 0) {
                const blockHeight = hitObject.userData.blockHeight;
                const heightDiff = blockHeight - this.currentGroundHeight;

                // Can only step up one half-block at a time
                if (heightDiff === this.stepHeight) {
                    this.currentGroundHeight = blockHeight;
                    return true;
                }
            }
        }

        return false;
    }

    checkForwardCollision(direction, speed) {
        const playerPos = this.scene3D.camera.position;

        // Use horizontal direction only to prevent camera pitch issues
        const horizontalDirection = new THREE.Vector3(direction.x, 0, direction.z).normalize();

        // Add a buffer to prevent walking into walls
        const bufferDistance = 0.3;
        const effectiveDistance = speed + bufferDistance;

        // Calculate the next position
        const nextPos = new THREE.Vector3(
            playerPos.x + horizontalDirection.x * speed,
            playerPos.y,
            playerPos.z + horizontalDirection.z * speed
        );


        // For inside-to-outside detection, we need to check if we cross a wall
        if (this.insideRoomWall) {
            const wallsToCheck = this.scene3D.scene.children.filter(obj =>
                obj.userData?.isWall && !obj.userData.isRaisedBlock
            );

            // Check at multiple heights to prevent camera angle issues
            const checkHeights = [0.1, 0.8, 1.5]; // Feet, waist, head

            for (const height of checkHeights) {
                const rayStart = new THREE.Vector3(
                    playerPos.x,
                    this.currentGroundHeight + height,
                    playerPos.z
                );

                const raycaster = new THREE.Raycaster(
                    rayStart,
                    horizontalDirection,
                    0,
                    effectiveDistance
                );

                const hits = raycaster.intersectObjects(wallsToCheck);

                if (hits.length > 0) {
                    // Check if near a door
                    let nearDoor = false;

                    for (const door of this.scene3D.doors) {
                        const doorPos = door.position;
                        const distToDoor = Math.sqrt(
                            Math.pow(playerPos.x - doorPos.x, 2) +
                            Math.pow(playerPos.z - doorPos.z, 2)
                        );

                        if (distToDoor < 1.5) { // Near door
                            nearDoor = true;
                            break;
                        }
                    }

                    // If not near a door, block movement
                    if (!nearDoor) {
                        return {
                            canMove: false,
                            hitObject: hits[0].object,
                            distance: hits[0].distance
                        };
                    }
                }
            }
        }

        // Standard collision detection for outside-to-inside
        // Cast rays at multiple heights
        const rayHeights = [0.1, 0.8, 1.5]; // Feet, waist, head

        for (const height of rayHeights) {
            const rayStart = new THREE.Vector3(
                playerPos.x,
                this.currentGroundHeight + height,
                playerPos.z
            );

            const raycaster = new THREE.Raycaster(
                rayStart,
                horizontalDirection,
                0,
                effectiveDistance
            );

            // Skip walls we're already inside
            const wallsToCheck = this.scene3D.scene.children.filter(obj => {
                if (this.insideRoomWall && obj.userData?.insideOf) {
                    return false;
                }
                return obj.userData?.isWall;
            });

            const hits = raycaster.intersectObjects(wallsToCheck);

            if (hits.length > 0) {
                const hitObject = hits[0].object;

                // For raised blocks, check if we can step up
                if (hitObject.userData.isRaisedBlock && hitObject.userData.blockHeight > 0) {
                    const heightDiff = hitObject.userData.blockHeight - this.currentGroundHeight;
                    if (heightDiff <= this.stepHeight) {
                        continue; // Can step on this
                    }
                }

                // Regular wall collision
                return {
                    canMove: false,
                    hitObject: hitObject,
                    distance: hits[0].distance
                };
            }
        }

        // No collision detected
        return {
            canMove: true,
            hitObject: null
        };
    }


    checkWalkingSurface() {
        const playerPos = this.scene3D.camera.position;

        // Calculate player's feet position
        const playerFeetY = playerPos.y - this.playerHeight;

        // Cast ray downward to see what we're standing on
        const downRay = new THREE.Raycaster(
            playerPos,
            new THREE.Vector3(0, -1, 0),
            0,
            this.playerHeight + 0.2  // Check slightly beyond feet
        );

        const wallHits = downRay.intersectObjects(
            this.scene3D.scene.children.filter(obj => obj.userData?.isWall)
        );

        if (wallHits.length > 0) {
            const hit = wallHits[0];
            const hitObject = hit.object;
            const hitY = hit.point.y;
            const wallHeight = this.scene3D.boxHeight || 4;

            // Check if we're standing on top of a wall
            if (Math.abs(playerFeetY - wallHeight) < 0.3) {
                this.onTopOfWall = true;
                this.wallTopHeight = wallHeight;
                this.currentGroundHeight = wallHeight;

                // Track which wall we're on top of
                this.currentWallTop = hitObject;
                return;
            }

            // Check if we're inside a wall room
            if (hitObject.userData?.isWall) {
                // If our head is below wall top, we're inside
                if (playerPos.y < wallHeight - 0.2) {
                    this.insideRoomWall = true;
                    this.onTopOfWall = false;

                    // Track which wall we're inside
                    hitObject.userData.insideOf = true;
                    this.currentInsideWall = hitObject;
                    return;
                }
            }
        }

        // If we got here, reset flags
        this.onTopOfWall = false;
        this.insideRoomWall = false;
        this.currentWallTop = null;
        this.currentInsideWall = null;

        // Clear any "insideOf" flags from walls
        this.scene3D.scene.children.forEach(obj => {
            if (obj.userData?.insideOf) {
                delete obj.userData.insideOf;
            }
        });
    }


    updateGroundHeightAtPosition(x, z) {
        // Create ray starting above the destination position
        const rayStart = new THREE.Vector3(
            x,
            this.currentGroundHeight + 2, // Start ray above current ground level
            z
        );

        const downRay = new THREE.Raycaster(
            rayStart,
            new THREE.Vector3(0, -1, 0), // cast straight down
            0,
            4 // reasonable search distance
        );

        // Filter objects we can stand on
        const intersects = downRay.intersectObjects(
            this.scene3D.scene.children.filter(obj =>
                obj.userData?.isWall ||
                obj.userData?.isRegularWall ||
                obj.userData?.blockHeight !== undefined
            )
        );

        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            const wallHeight = this.scene3D.boxHeight || 4;

            // Important change: Check if we're currently on top of a wall
            if (this.onTopOfWall) {
                // If we're already on top of a wall, check if the next position is also on top
                const hitPoint = intersects[0].point.y;
                const wallTopTolerance = 0.3;

                // If hit point is close to wall top, stay on wall top
                if (Math.abs(hitPoint - wallHeight) < wallTopTolerance) {
                    this.currentGroundHeight = wallHeight;
                    return;
                }

                // If we're moving to a half block that's close enough in height, transition to it
                if (hitObject.userData?.isRaisedBlock) {
                    const blockHeight = hitObject.userData.blockHeight || 0;
                    const heightDiff = Math.abs(blockHeight - wallHeight);

                    if (heightDiff <= this.stepHeight) {
                        this.currentGroundHeight = blockHeight;
                        return;
                    }
                }

                // Otherwise, we're stepping off - start falling
                this.isFalling = true;
                return;
            }

            // Handle different types of surfaces (similar to before)
            if (hitObject.userData?.isRaisedBlock) {
                this.currentGroundHeight = hitObject.userData.blockHeight || 0;
            }
            else if (hitObject.userData?.isRegularWall) {
                const rayHitY = intersects[0].point.y;

                // If we hit the top surface of the wall (within tolerance)
                if (Math.abs(rayHitY - wallHeight) < 0.3) {
                    this.currentGroundHeight = wallHeight;
                } else {
                    // Not on top of the wall, so we're at ground level
                    this.currentGroundHeight = 0;
                }
            }
            else {
                // Default ground level
                this.currentGroundHeight = 0;
            }
        } else {
            // No surface found below, default to ground level
            this.currentGroundHeight = 0;
        }

        // Reset jumping and falling state
        this.isJumping = false;
        this.isFalling = false;
    }


    updatePlayerHeight(direction, speed) {
        const nextPosition = new THREE.Vector3(
            this.scene3D.camera.position.x + direction.x * speed,
            0,
            this.scene3D.camera.position.z + direction.z * speed
        );

        // Special case for wall tops - allow player to walk off of walls
        if (this.onTopOfWall) {
            // Check if we're still on top of a wall at the next position
            const topRay = new THREE.Raycaster(
                new THREE.Vector3(nextPosition.x, this.wallTopHeight + 0.1, nextPosition.z),
                new THREE.Vector3(0, -1, 0),
                0,
                0.5
            );

            const topHits = topRay.intersectObjects(
                this.scene3D.scene.children.filter(obj => obj.userData?.isWall)
            );

            // If no wall beneath, start falling but ALLOW movement 
            if (topHits.length === 0) {
                this.isFalling = true;
            }

            // Always return true to allow movement regardless
            return true;
        }

        // Check for ground/blocks below
        const downRay = new THREE.Raycaster(
            new THREE.Vector3(nextPosition.x, this.currentGroundHeight + 2, nextPosition.z),
            new THREE.Vector3(0, -1, 0),
            0,
            4
        );

        const intersectsDown = downRay.intersectObjects(
            this.scene3D.scene.children.filter(obj =>
                obj.userData?.isWall ||
                obj.userData?.isRegularWall ||
                obj.userData?.blockHeight !== undefined
            )
        );

        if (intersectsDown.length === 0) {
            this.isFalling = true;
            this.currentGroundHeight = Math.max(0, this.currentGroundHeight - this.fallSpeed);
            return true;
        }

        const hitObject = intersectsDown[0].object;
        let groundHeight;

        // Handle different surface types
        if (hitObject.userData?.isRegularWall) {
            // Handle regular walls - allow walking on top
            const wallHeight = this.scene3D.boxHeight || 4;

            // If we're at or near wall height, snap to it
            if (Math.abs(this.currentGroundHeight - wallHeight) < 0.3) {
                groundHeight = wallHeight;
            } else {
                groundHeight = 0; // Default case - not on top of wall
            }
        }
        // If we're at wall height and hit a wall, maintain wall height
        else if (this.currentGroundHeight >= 4.0 &&
            hitObject.userData?.isWall &&
            hitObject.userData?.blockHeight === 0) {
            groundHeight = 4.0; // Keep height at wall level
        } else {
            groundHeight = hitObject.userData?.blockHeight ?? 0;
        }

        const heightDiff = groundHeight - this.currentGroundHeight;

        if (this.debug) {
            console.log("Ground check:", {
                groundHeight,
                currentHeight: this.currentGroundHeight,
                diff: heightDiff,
                isFalling: this.isFalling,
                nextValidHeight: this.currentGroundHeight + this.stepHeight,
                objectData: hitObject.userData
            });
        }

        // Handle falling
        if (this.isFalling) {
            if (this.currentGroundHeight > groundHeight) {
                this.currentGroundHeight = Math.max(
                    groundHeight,
                    this.currentGroundHeight - this.fallSpeed
                );
                return true;
            } else {
                this.isFalling = false;
                this.currentGroundHeight = groundHeight;
            }
        }

        // Stepping logic
        if (heightDiff < 0) {
            // Allow stepping down
            this.isFalling = true;
            return true;
        } else if (heightDiff <= this.stepHeight) {
            // Allow stepping up to next sequential height
            this.currentGroundHeight = groundHeight;
            return true;
        } else if (heightDiff === 0) {
            // Allow moving on same level
            return true;
        }

        return false;
    }


    startJump() {
        // Only allow jumping when on the ground (not already jumping or falling)
        if (!this.isJumping && !this.isFalling) {
            this.isJumping = true;
            this.jumpVelocity = this.jumpSpeed;
            this.jumpStartHeight = this.currentGroundHeight;
            this.jumpFrameCount = 0;

            if (this.debug) {
                console.log(`Jump started from height: ${this.jumpStartHeight.toFixed(2)}`);
            }
            return true;
        }
        return false;
    }


    checkForLandingSurfaces() {
        const playerPos = this.scene3D.camera.position;
        const rayStart = new THREE.Vector3(
            playerPos.x,
            this.currentGroundHeight + 0.1,
            playerPos.z
        );

        // Cast rays at different angles to check for landing spots
        const rayDirections = [
            new THREE.Vector3(0, -1, 0), // Straight down
            new THREE.Vector3(0.1, -0.9, 0).normalize(), // Slightly forward
            new THREE.Vector3(-0.1, -0.9, 0).normalize(), // Slightly backward
            new THREE.Vector3(0, -0.9, 0.1).normalize(), // Slightly left
            new THREE.Vector3(0, -0.9, -0.1).normalize(), // Slightly right
        ];

        let closestHit = null;
        let closestDistance = Infinity;

        // Check each direction for potential landing surfaces
        for (const direction of rayDirections) {
            const downRay = new THREE.Raycaster(
                rayStart,
                direction,
                0,
                2 // Reasonable range to focus on closer surfaces
            );

            // Filter objects that can be landed on
            const intersects = downRay.intersectObjects(
                this.scene3D.scene.children.filter(obj => {
                    // Include raised blocks
                    if (obj.userData?.isRaisedBlock && obj.userData.blockHeight > 0) {
                        return true;
                    }

                    // Include regular walls (using new flag)
                    if (obj.userData?.isRegularWall) {
                        return true;
                    }

                    // Fallback to old method for compatibility
                    if (obj.userData?.isWall &&
                        !obj.userData.isRaisedBlock &&
                        obj.userData.blockHeight === 0) {
                        return true;
                    }

                    return false;
                })
            );

            if (intersects.length > 0) {
                const hit = intersects[0];

                // Determine if this is a valid landing surface
                let isValidLandingSurface = true;
                let surfaceHeight = hit.point.y;

                // For regular walls, check if we're hitting the top face
                if (hit.object.userData?.isRegularWall ||
                    (hit.object.userData?.isWall &&
                        !hit.object.userData.isRaisedBlock &&
                        hit.object.userData.blockHeight === 0)) {

                    // Get standard wall height
                    const wallHeight = this.scene3D.boxHeight || 4;

                    // Check if we're hitting close to the top surface
                    isValidLandingSurface = Math.abs(surfaceHeight - wallHeight) < 0.3;

                    if (isValidLandingSurface && this.debug) {
                        console.log(`Hit top of regular wall at height ${surfaceHeight.toFixed(2)}`);
                    }
                }

                if (isValidLandingSurface) {
                    const distance = Math.abs(this.currentGroundHeight - surfaceHeight);

                    // Keep track of closest landing surface
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestHit = hit;

                        if (this.debug) {
                            console.log(`Potential landing surface found: ${surfaceHeight.toFixed(2)}, type: ${hit.object.userData.isRaisedBlock ? 'raised block' :
                                hit.object.userData.isRegularWall ? 'regular wall' :
                                    hit.object.userData.isWall ? 'wall' : 'unknown'
                                }, distance: ${distance.toFixed(2)}`);
                        }
                    }
                }
            }
        }

        return closestHit;
    }

    update(deltaTime = 0.016) {
        this.jumpFrameCount++;

        // Check what surface we're on
        this.checkWalkingSurface();

        // Special handling for wall tops to ensure stable movement
        if (this.onTopOfWall && !this.isJumping && !this.isFalling) {
            // Force player to stay exactly at wall height + player height
            return this.wallTopHeight + this.playerHeight;
        }

        // Handle jumping physics
        if (this.isJumping) {
            // Apply jump velocity and gravity with deltaTime, but cap to prevent overshooting
            const maxDelta = 1 / 30; // Cap at 30fps equivalent to prevent tunneling
            const cappedDelta = Math.min(deltaTime, maxDelta);

            this.jumpVelocity -= this.gravity * cappedDelta * 60;

            // Calculate next position but don't apply yet
            const nextHeight = this.currentGroundHeight + (this.jumpVelocity * cappedDelta * 60);

            // Enhanced landing detection during jump
            if (this.jumpFrameCount % this.jumpCheckInterval === 0) {
                const landingSurfaceA = this.checkForLandingSurfaces();
                if (landingSurfaceA) {
                    const hitPoint = landingSurfaceA.point.y;
                    const heightDiff = hitPoint - this.currentGroundHeight;

                    // If we're close to a landing surface above us, snap to it
                    if (heightDiff > 0 && heightDiff < 0.2 && this.jumpVelocity > 0) {
                        this.currentGroundHeight = hitPoint;
                        this.isJumping = false;

                        if (this.debug) {
                            console.log(`Landed on surface during ascent at height: ${hitPoint.toFixed(2)}`);
                        }
                        return this.currentGroundHeight + this.playerHeight;
                    }
                }
            }

            // Continuous collision detection - check if we'll pass through a surface
            // Cast a ray from current position to next position
            const rayStart = new THREE.Vector3(
                this.scene3D.camera.position.x,
                this.currentGroundHeight + 0.1, // Slightly above current position
                this.scene3D.camera.position.z
            );

            const rayEnd = new THREE.Vector3(
                this.scene3D.camera.position.x,
                nextHeight + 0.1, // Same offset
                this.scene3D.camera.position.z
            );

            const rayDirection = new THREE.Vector3().subVectors(rayEnd, rayStart).normalize();
            const rayLength = rayEnd.distanceTo(rayStart);

            const raycaster = new THREE.Raycaster(rayStart, rayDirection, 0, rayLength);
            const surfaces = this.findAllSteppableObjects(this.scene3D.scene);
            const hits = raycaster.intersectObjects(surfaces);

            if (hits.length > 0) {
                // We would hit a surface - land on it instead of passing through
                const hitPoint = hits[0].point.y;
                // Only accept the hit if it's actually in our path (between current and next)
                if ((this.jumpVelocity > 0 && hitPoint > this.currentGroundHeight && hitPoint <= nextHeight) ||
                    (this.jumpVelocity < 0 && hitPoint < this.currentGroundHeight && hitPoint >= nextHeight)) {
                    this.currentGroundHeight = hitPoint;

                    // If we were going up and hit something, start falling
                    if (this.jumpVelocity > 0) {
                        this.jumpVelocity = 0; // Stop upward motion
                    } else {
                        // We were going down and hit something - land
                        this.isJumping = false;
                        this.isFalling = false;
                        this.fallVelocity = 0;

                        // Set the landed flag for effects
                        this.justLanded = true;
                        this.landingPosition = new THREE.Vector3(
                            this.scene3D.camera.position.x,
                            hitPoint,
                            this.scene3D.camera.position.z
                        );
                        this.landingVelocity = Math.abs(this.jumpVelocity);

                        if (this.debug) {
                            console.log(`Continuous collision: landed at height ${hitPoint.toFixed(2)}`);
                        }
                    }
                } else {
                    // Not in our path, proceed normally
                    this.currentGroundHeight = nextHeight;
                }
            } else {
                // No obstacles, proceed with movement
                this.currentGroundHeight = nextHeight;
            }

            // Check if reached apex and starting to fall
            if (this.jumpVelocity <= 0) {
                // Transition from jumping to falling
                if (this.debug) {
                    console.log(`Jump apex reached at height: ${(this.currentGroundHeight - this.jumpStartHeight).toFixed(2)}`);
                }
                this.isJumping = false;
                this.isFalling = true;

                // Record the height where falling begins
                this.fallStartHeight = this.currentGroundHeight;

                // Initialize fall velocity when transitioning from jump to fall
                this.fallVelocity = Math.abs(this.jumpVelocity);
            }
        }
        // Handle falling (either from jump or walking off edge)
        else if (this.isFalling) {
            if (this.fallStartHeight === 0) {
                this.fallStartHeight = this.currentGroundHeight;
            }
            // Initialize fallVelocity if not already set
            if (this.fallVelocity === undefined) {
                this.fallVelocity = this.fallSpeed;
            }

            // Cap deltaTime to prevent tunneling through thin objects
            const maxDelta = 1 / 30; // Cap at 30fps equivalent 
            const cappedDelta = Math.min(deltaTime, maxDelta);

            // Increase fall velocity (accelerate due to gravity)
            this.fallVelocity += this.gravity * cappedDelta * 60;

            // Apply terminal velocity limit
            const terminalVelocity = 1.5; // Slightly reduced to prevent tunneling
            this.fallVelocity = Math.min(this.fallVelocity, terminalVelocity);

            // Calculate next position (don't apply yet)
            const fallDistance = this.fallVelocity * cappedDelta * 60;
            const nextHeight = this.currentGroundHeight - fallDistance;

            // Continuous collision detection during fall
            const rayStart = new THREE.Vector3(
                this.scene3D.camera.position.x,
                this.currentGroundHeight,
                this.scene3D.camera.position.z
            );

            const rayEnd = new THREE.Vector3(
                this.scene3D.camera.position.x,
                nextHeight,
                this.scene3D.camera.position.z
            );

            const rayDirection = new THREE.Vector3(0, -1, 0);
            const rayLength = this.currentGroundHeight - nextHeight;

            const raycaster = new THREE.Raycaster(rayStart, rayDirection, 0, rayLength + 0.1);
            const surfaces = this.findAllSteppableObjects(this.scene3D.scene);
            const hits = raycaster.intersectObjects(surfaces);

            if (hits.length > 0) {
                // Hit a surface during fall - land on it
                const hitPoint = hits[0].point.y;

                // Only accept hit points between current and next position
                if (hitPoint <= this.currentGroundHeight && hitPoint >= nextHeight) {
                    // Land on the surface
                    this.currentGroundHeight = hitPoint;
                    this.isFalling = false;

                    // Set landed flag for effects
                    this.justLanded = true;
                    this.landingPosition = new THREE.Vector3(
                        this.scene3D.camera.position.x,
                        hitPoint,
                        this.scene3D.camera.position.z
                    );
                    this.landingVelocity = this.fallVelocity;
                    this.fallDistance = this.fallStartHeight - hitPoint;
                    this.fallStartHeight = 0; // Reset for next fall

                    // Reset fall velocity
                    this.fallVelocity = 0;

                    if (this.debug) {
                        console.log(`Continuous collision: landed at height ${hitPoint.toFixed(2)}`);
                    }
                } else {
                    // Continue falling
                    this.currentGroundHeight = nextHeight;
                }
            } else {
                // No obstacles, continue falling
                this.currentGroundHeight = nextHeight;

                // Periodic landing checks still needed for complex geometry
                if (this.jumpFrameCount % 3 === 0) {
                    const landingSurfaceB = this.checkForLandingSurfaces();
                    if (landingSurfaceB) {
                        const hitPoint = landingSurfaceB.point.y;

                        const landingSurfaceC = this.checkForLandingSurfaces();
                        if (landingSurfaceC) {
                            const hitPoint = landingSurfaceC.point.y;
                            // Define distanceToGround properly
                            const distanceToGround = this.currentGroundHeight - hitPoint;

                            // Then use it within this same scope
                            if (Math.abs(distanceToGround) <= 0.15) {
                                // Only set justLanded if we were actually falling
                                if (this.isFalling) {
                                    this.justLanded = true;
                                    this.landingPosition = new THREE.Vector3(
                                        this.scene3D.camera.position.x,
                                        hitPoint,
                                        this.scene3D.camera.position.z
                                    );
                                    this.landingVelocity = this.fallVelocity;
                                    this.fallDistance = this.fallStartHeight - hitPoint;
                                }
                            }

                            // Always update state
                            this.isFalling = false;
                            this.currentGroundHeight = hitPoint;
                            this.fallStartHeight = 0;
                            this.fallVelocity = 0;
                        }
                    }
                }
            }


            if (this.currentGroundHeight < 0) {
                // Only set landing flags if we were actually falling
                if (this.isFalling) {
                    this.justLanded = true;
                    this.landingPosition = new THREE.Vector3(
                        this.scene3D.camera.position.x,
                        0,
                        this.scene3D.camera.position.z
                    );
                    this.landingVelocity = this.fallVelocity;
                    this.fallDistance = this.fallStartHeight;
                }

                // Always update state
                this.currentGroundHeight = 0;
                this.isFalling = false;
                this.fallStartHeight = 0;
                this.fallVelocity = 0;
            }

        }

        // Return the camera Y position
        return this.currentGroundHeight + this.playerHeight;
    }

    // Helper to find all objects that can be stood on, including in groups
    findAllSteppableObjects(scene) {
        const objects = [];
        scene.traverse((obj) => {
            if (obj.userData?.isWall || obj.userData?.isRaisedBlock) {
                objects.push(obj);
            }
        });
        return objects;
    }




}