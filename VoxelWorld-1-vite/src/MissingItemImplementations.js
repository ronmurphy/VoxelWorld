/**
 * MissingItemImplementations.js
 * 
 * Quick implementations for items that exist in JSON but aren't hooked up yet.
 * These are simple "good enough" implementations to make items functional.
 */

export class MissingItemImplementations {
    constructor(voxelWorld) {
        this.voxelWorld = voxelWorld;
    }

    /**
     * Speed Boots - Apply speed and stamina bonuses
     */
    implementSpeedBoots() {
        // Check if player has speed boots equipped
        const hasBoots = this.voxelWorld.hasEquippedTool('speed_boots') || 
                        this.voxelWorld.hasEquippedTool('crafted_speed_boots');

        if (hasBoots && this.voxelWorld.staminaSystem) {
            // Apply bonuses if not already applied
            if (!this.voxelWorld.staminaSystem.bootsActive) {
                this.voxelWorld.staminaSystem.bootsActive = true;
                this.voxelWorld.staminaSystem.maxStamina *= this.voxelWorld.staminaSystem.bootsStaminaMultiplier;
                this.voxelWorld.updateStatus('👢 Speed Boots equipped! 2x speed & stamina!');
                console.log('👢 Speed Boots activated: 2x speed, 2x stamina');
            }
        } else if (this.voxelWorld.staminaSystem?.bootsActive) {
            // Remove bonuses
            this.voxelWorld.staminaSystem.bootsActive = false;
            this.voxelWorld.staminaSystem.maxStamina /= this.voxelWorld.staminaSystem.bootsStaminaMultiplier;
            console.log('👢 Speed Boots deactivated');
        }
    }

    /**
     * Machete - Better than stone axe for chopping
     */
    implementMachete() {
        // In VoxelWorld harvesting logic, check for machete
        const hasMachete = this.voxelWorld.hasEquippedTool('machete') || 
                          this.voxelWorld.hasEquippedTool('crafted_machete');

        if (hasMachete) {
            return {
                speedMultiplier: 2.0,  // 2x faster than stone axe
                durability: 200        // Lasts 2x longer
            };
        }
        return null;
    }

    /**
     * Iron Tools - Better versions of stone tools
     */
    implementIronTools() {
        const tools = {
            'iron_pickaxe': { speedMultiplier: 2.0, durability: 200 },
            'iron_axe': { speedMultiplier: 2.0, durability: 200 },
            'iron_sword': { damage: 20, durability: 300 }
        };

        // Return tool stats if equipped
        for (const [tool, stats] of Object.entries(tools)) {
            if (this.voxelWorld.hasEquippedTool(tool) || 
                this.voxelWorld.hasEquippedTool(`crafted_${tool}`)) {
                return { tool, ...stats };
            }
        }
        return null;
    }

    /**
     * Food Buffs - Implement temporary speed/stamina buffs from food
     */
    implementFoodBuffs(foodId) {
        const buffs = {
            'grilled_fish': {
                stamina: 75,
                speedBoost: 1.2,
                duration: 60000  // 60 seconds in ms
            },
            'carrot_stew': {
                stamina: 60,
                speedBoost: 1.15,
                duration: 120000  // 2 minutes
            },
            'berry_bread': {
                stamina: 50,
                speedBoost: 1.1,
                duration: 60000
            },
            'roasted_wheat': {
                stamina: 30,
                duration: 60000
            }
        };

        const buff = buffs[foodId] || buffs[foodId.replace('crafted_', '')];
        if (!buff) return false;

        // Apply stamina
        if (buff.stamina && this.voxelWorld.staminaSystem) {
            this.voxelWorld.staminaSystem.currentStamina = Math.min(
                this.voxelWorld.staminaSystem.maxStamina,
                this.voxelWorld.staminaSystem.currentStamina + buff.stamina
            );
            this.voxelWorld.staminaSystem.updateStaminaDisplay();
        }

        // Apply speed buff (if not already active)
        if (buff.speedBoost && !this.activeSpeedBuff) {
            this.activeSpeedBuff = {
                multiplier: buff.speedBoost,
                endTime: Date.now() + buff.duration,
                originalSpeed: this.voxelWorld.player.baseSpeed || 3
            };

            // Apply speed boost
            this.voxelWorld.player.baseSpeed = this.activeSpeedBuff.originalSpeed * buff.speedBoost;

            // Show notification
            const emoji = this.getEmoji(foodId);
            this.voxelWorld.updateStatus(
                `${emoji} +${buff.stamina} stamina! ${buff.speedBoost ? `+${Math.round((buff.speedBoost-1)*100)}% speed!` : ''}`,
                'success'
            );

            // Set timer to remove buff
            setTimeout(() => {
                if (this.activeSpeedBuff && Date.now() >= this.activeSpeedBuff.endTime) {
                    this.voxelWorld.player.baseSpeed = this.activeSpeedBuff.originalSpeed;
                    this.activeSpeedBuff = null;
                    this.voxelWorld.updateStatus('⏱️ Speed buff expired');
                }
            }, buff.duration);

            console.log(`🍽️ Food buff applied: +${buff.stamina} stamina, ${buff.speedBoost}x speed for ${buff.duration/1000}s`);
        }

        return true;
    }

    /**
     * Armor System - Simple damage reduction
     */
    implementArmor() {
        const armorItems = ['leather_armor', 'iron_armor', 'steel_armor'];
        let totalArmor = 0;

        // Check what armor player has
        for (const item of armorItems) {
            if (this.voxelWorld.hasItem(item) || this.voxelWorld.hasItem(`crafted_${item}`)) {
                totalArmor += this.getArmorValue(item);
            }
        }

        // Store for damage calculations
        this.voxelWorld.playerArmor = totalArmor;
        
        return totalArmor;
    }

    /**
     * Get armor value for item
     */
    getArmorValue(armorType) {
        const values = {
            'leather_armor': 2,
            'iron_armor': 4,
            'steel_armor': 6
        };
        return values[armorType] || 0;
    }

    /**
     * Apply damage reduction from armor
     */
    reduceDamage(damage) {
        const armor = this.voxelWorld.playerArmor || 0;
        const reduction = armor * 0.1; // 10% per armor point
        const reducedDamage = Math.max(1, damage * (1 - reduction));
        
        if (armor > 0) {
            console.log(`🛡️ Armor reduced damage: ${damage} → ${reducedDamage} (${armor} armor)`);
        }
        
        return reducedDamage;
    }

    /**
     * Fishing Rod - Simple fishing mechanic
     */
    implementFishing(waterBlockPos) {
        const hasFishingRod = this.voxelWorld.hasEquippedTool('fishing_rod') || 
                             this.voxelWorld.hasEquippedTool('crafted_fishing_rod');

        if (!hasFishingRod) return false;

        // 30% chance to catch fish
        if (Math.random() < 0.3) {
            this.voxelWorld.giveItem('fish', 1);
            this.voxelWorld.updateStatus('🎣 Caught a fish!', 'success');
            console.log('🎣 Fishing success!');
            return true;
        } else {
            this.voxelWorld.updateStatus('🎣 Nothing biting...', 'warning');
            return false;
        }
    }

    /**
     * Helper: Get emoji for item
     */
    getEmoji(itemId) {
        const emojis = {
            'grilled_fish': '🐟',
            'carrot_stew': '🍲',
            'berry_bread': '🍞',
            'roasted_wheat': '🍞',
            'speed_boots': '👢',
            'machete': '🔪',
            'fishing_rod': '🎣'
        };
        return emojis[itemId] || emojis[itemId.replace('crafted_', '')] || '📦';
    }

    /**
     * Install all implementations
     * Call this in VoxelWorld initialization
     */
    static installAll(voxelWorld) {
        const impl = new MissingItemImplementations(voxelWorld);

        // Hook into game loop for boots check
        const originalUpdate = voxelWorld.update.bind(voxelWorld);
        voxelWorld.update = function(...args) {
            impl.implementSpeedBoots();
            originalUpdate(...args);
        };

        // Hook into food consumption
        voxelWorld.consumeFood = function(foodId) {
            impl.implementFoodBuffs(foodId);
        };

        // Hook into damage system (if exists)
        if (voxelWorld.takeDamage) {
            const originalTakeDamage = voxelWorld.takeDamage.bind(voxelWorld);
            voxelWorld.takeDamage = function(damage) {
                const reducedDamage = impl.reduceDamage(damage);
                originalTakeDamage(reducedDamage);
            };
        }

        console.log('🔧 Missing item implementations installed');
        return impl;
    }
}

// Console helper for testing
window.testMissingItems = function() {
    console.log('🧪 Testing missing item implementations...');
    
    console.log('\n👢 Speed Boots:');
    giveItem('crafted_speed_boots', 1);
    console.log('Equip and watch stamina/speed increase!');
    
    console.log('\n🔪 Machete:');
    giveItem('crafted_machete', 1);
    console.log('Try chopping a tree - should be faster!');
    
    console.log('\n🍽️ Food Buffs:');
    giveItem('grilled_fish', 5);
    console.log('Eat fish for +75 stamina & +20% speed buff!');
    
    console.log('\n🎣 Fishing:');
    giveItem('crafted_fishing_rod', 1);
    console.log('Right-click water with rod equipped!');
};
