/**
 * DataLoader - Load game content from JSON files
 */

export class DataLoader {
    static async loadRecipes() {
        const response = await fetch('/data/recipes.json');
        return await response.json();
    }

    static async loadBlueprints() {
        const response = await fetch('/data/blueprints.json');
        return await response.json();
    }

    static async loadPlans() {
        const response = await fetch('/data/plans.json');
        return await response.json();
    }

    /**
     * Load all game data at once
     */
    static async loadAll() {
        const [recipes, blueprints, plans] = await Promise.all([
            this.loadRecipes(),
            this.loadBlueprints(),
            this.loadPlans()
        ]);

        return { recipes, blueprints, plans };
    }
}
