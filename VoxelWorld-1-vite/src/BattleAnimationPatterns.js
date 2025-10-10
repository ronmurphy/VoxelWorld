/**
 * BattleAnimationPatterns.js
 *
 * Collection of battle animation patterns for arena combat
 * Each pattern controls how combatants move during idle/attack/return phases
 */

import * as THREE from 'three';

/**
 * Base class for all battle animation patterns
 */
class BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.0) {
        this.arenaCenter = arenaCenter;
        this.arenaRadius = arenaRadius;
        this.time = 0;
    }

    /**
     * Update pattern (called every frame during idle phase)
     * @param {number} deltaTime - Time since last frame
     * @param {CombatantSprite} companionSprite
     * @param {CombatantSprite} enemySprite
     */
    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;
        // Override in subclasses
    }

    /**
     * Get initial positions for combatants
     */
    getInitialPositions() {
        return {
            companion: { x: this.arenaCenter.x - this.arenaRadius, y: this.arenaCenter.y, z: this.arenaCenter.z },
            enemy: { x: this.arenaCenter.x + this.arenaRadius, y: this.arenaCenter.y, z: this.arenaCenter.z }
        };
    }

    /**
     * Reset pattern state (called when battle starts or pattern changes)
     */
    reset() {
        this.time = 0;
    }
}

/**
 * 1. Semi-Orbit with Facing
 * Combatants stay on opposite sides with slight side-to-side movement
 */
export class SemiOrbitPattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.0) {
        super(arenaCenter, arenaRadius);
        this.swaySpeed = 1.5; // Speed of side-to-side movement
        this.swayAmount = 0.3; // How far they sway
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Companion on left, enemy on right
        // Add sinusoidal sway for dynamic feel
        const companionSway = Math.sin(this.time * this.swaySpeed) * this.swayAmount;
        const enemySway = Math.sin(this.time * this.swaySpeed + Math.PI) * this.swayAmount; // Opposite phase

        const companionPos = {
            x: this.arenaCenter.x - this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + companionSway
        };

        const enemyPos = {
            x: this.arenaCenter.x + this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + enemySway
        };

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }
}

/**
 * 2. Radial Burst Arena
 * Combatants dash toward center during attacks, retreat to edges
 */
export class RadialBurstPattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.5) {
        super(arenaCenter, arenaRadius); // Slightly larger radius for burst effect
        this.pulseSpeed = 0.8;
        this.pulseAmount = 0.2;
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Slight pulsing while idle
        const pulse = Math.sin(this.time * this.pulseSpeed) * this.pulseAmount;
        const currentRadius = this.arenaRadius + pulse;

        const companionPos = {
            x: this.arenaCenter.x - currentRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z
        };

        const enemyPos = {
            x: this.arenaCenter.x + currentRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z
        };

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }

    /**
     * Burst toward center for attack
     */
    onAttack(attackerSprite) {
        const burstPos = {
            x: this.arenaCenter.x,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z
        };
        attackerSprite.moveTo(burstPos.x, burstPos.y, burstPos.z);
    }
}

/**
 * 3. Circle Strafe (Opposite Directions)
 * Combatants orbit in opposite directions, stalking each other
 */
export class CircleStrafePattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.0) {
        super(arenaCenter, arenaRadius);
        this.rotationSpeed = 0.5; // Radians per second
        this.companionAngle = 0;
        this.enemyAngle = Math.PI; // Start opposite
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Rotate in opposite directions
        this.companionAngle += this.rotationSpeed * deltaTime;
        this.enemyAngle -= this.rotationSpeed * deltaTime; // Opposite direction

        // Keep angles in 0-2π range
        if (this.companionAngle > Math.PI * 2) this.companionAngle -= Math.PI * 2;
        if (this.enemyAngle < 0) this.enemyAngle += Math.PI * 2;

        const companionPos = {
            x: this.arenaCenter.x + Math.cos(this.companionAngle) * this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(this.companionAngle) * this.arenaRadius
        };

        const enemyPos = {
            x: this.arenaCenter.x + Math.cos(this.enemyAngle) * this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(this.enemyAngle) * this.arenaRadius
        };

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }

    reset() {
        super.reset();
        this.companionAngle = 0;
        this.enemyAngle = Math.PI;
    }
}

/**
 * 4. Figure-8 Pattern
 * Both combatants trace figure-8 paths around two focal points
 */
export class Figure8Pattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.0) {
        super(arenaCenter, arenaRadius);
        this.loopSpeed = 0.4; // Speed of figure-8 trace
        this.companionPhase = 0;
        this.enemyPhase = Math.PI; // Start opposite on the loop
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Update phases
        this.companionPhase += this.loopSpeed * deltaTime;
        this.enemyPhase += this.loopSpeed * deltaTime;

        // Parametric figure-8 (lemniscate)
        const companionPos = this.getFigure8Position(this.companionPhase);
        const enemyPos = this.getFigure8Position(this.enemyPhase);

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }

    getFigure8Position(phase) {
        // Lemniscate formula: x = cos(t) / (1 + sin²(t)), y = sin(t)cos(t) / (1 + sin²(t))
        const scale = this.arenaRadius * 1.2;
        const denominator = 1 + Math.pow(Math.sin(phase), 2);

        return {
            x: this.arenaCenter.x + (Math.cos(phase) / denominator) * scale,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + (Math.sin(phase) * Math.cos(phase) / denominator) * scale
        };
    }

    reset() {
        super.reset();
        this.companionPhase = 0;
        this.enemyPhase = Math.PI;
    }
}

/**
 * 5. Pendulum Swing
 * Combatants swing back and forth like pendulums on opposite sides
 */
export class PendulumPattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.0) {
        super(arenaCenter, arenaRadius);
        this.swingSpeed = 1.2;
        this.swingArc = 0.8; // Radians of swing arc
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Pendulum motion (sinusoidal)
        const companionSwing = Math.sin(this.time * this.swingSpeed) * this.swingArc;
        const enemySwing = Math.sin(this.time * this.swingSpeed + Math.PI) * this.swingArc; // Opposite phase

        // Companion swings on left side, enemy on right
        const companionPos = {
            x: this.arenaCenter.x - this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(companionSwing) * this.arenaRadius
        };

        const enemyPos = {
            x: this.arenaCenter.x + this.arenaRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(enemySwing) * this.arenaRadius
        };

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }
}

/**
 * 6. Spiral In/Out
 * Combatants spiral toward center, then back out in a cycle
 */
export class SpiralPattern extends BattlePattern {
    constructor(arenaCenter, arenaRadius = 2.5) {
        super(arenaCenter, arenaRadius);
        this.spiralSpeed = 0.6;
        this.spiralCycle = 6.0; // Seconds for full in/out cycle
    }

    update(deltaTime, companionSprite, enemySprite) {
        this.time += deltaTime;

        // Calculate spiral radius (oscillates between max and min)
        const cycleFraction = (this.time % this.spiralCycle) / this.spiralCycle;
        const radiusMod = Math.sin(cycleFraction * Math.PI) * 0.7; // 0.7 = how close to center
        const currentRadius = this.arenaRadius * (1 - radiusMod);

        // Rotate while spiraling
        const companionAngle = this.time * this.spiralSpeed;
        const enemyAngle = companionAngle + Math.PI; // Opposite side

        const companionPos = {
            x: this.arenaCenter.x + Math.cos(companionAngle) * currentRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(companionAngle) * currentRadius
        };

        const enemyPos = {
            x: this.arenaCenter.x + Math.cos(enemyAngle) * currentRadius,
            y: this.arenaCenter.y,
            z: this.arenaCenter.z + Math.sin(enemyAngle) * currentRadius
        };

        companionSprite.moveTo(companionPos.x, companionPos.y, companionPos.z);
        enemySprite.moveTo(enemyPos.x, enemyPos.y, enemyPos.z);
    }
}

/**
 * Pattern factory - randomly select a pattern
 */
export function getRandomBattlePattern(arenaCenter, arenaRadius = 2.0) {
    const patterns = [
        SemiOrbitPattern,
        RadialBurstPattern,
        CircleStrafePattern,
        Figure8Pattern,
        PendulumPattern,
        SpiralPattern
    ];

    const PatternClass = patterns[Math.floor(Math.random() * patterns.length)];
    const pattern = new PatternClass(arenaCenter, arenaRadius);

    console.log(`🎭 Selected battle pattern: ${PatternClass.name}`);
    return pattern;
}

/**
 * Get pattern by name (for debugging/testing)
 */
export function getBattlePatternByName(name, arenaCenter, arenaRadius = 2.0) {
    const patternMap = {
        'semiorbit': SemiOrbitPattern,
        'radialburst': RadialBurstPattern,
        'circlestrafe': CircleStrafePattern,
        'figure8': Figure8Pattern,
        'pendulum': PendulumPattern,
        'spiral': SpiralPattern
    };

    const PatternClass = patternMap[name.toLowerCase()] || SemiOrbitPattern;
    return new PatternClass(arenaCenter, arenaRadius);
}
