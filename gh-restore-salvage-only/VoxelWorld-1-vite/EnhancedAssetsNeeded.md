✅ Issues Fixed:

  1. Hotbar Redraw HTML Encoding Issue

  - Fixed in InventorySystem.js - Updated both instances (lines 352 and 424) to check for both <span and <img tags
  - Root Cause: InventorySystem was only checking for <span tags when deciding to use innerHTML vs textContent
  - Now: Machete and other tool icons will stay as images even after inventory updates

  2. Complete List of Blocks Needing Enhanced Art Assets

  📋 Blocks Needing Enhanced Art Assets

  ✅ Already Have Assets (5 blocks):

  - bedrock.jpeg
  - dirt.jpeg
  - sand.jpeg
  - snow.jpeg
  - stone.jpeg

  🎨 Need New Assets (18 blocks):

  Basic Blocks (8 blocks):

  - grass.jpeg - Forest green with grass pattern
  - coal.jpeg - Dark gray/black coal texture
  - wood.jpeg - Legacy wood grain (saddle brown)
  - glass.jpeg - Sky blue, translucent
  - brick.jpeg - Fire brick with mortar lines
  - glowstone.jpeg - Gold with glowing effect
  - iron.jpeg - Slate gray with metallic shine
  - flowers.jpeg - Hot pink with flower pattern

  Wood Types (4 blocks):

  - oak_wood.jpeg - Classic brown oak
  - pine_wood.jpeg - Darker brown pine
  - palm_wood.jpeg - Light tan palm
  - birch_wood.jpeg - Pale birch

  Leaf Types (5 blocks):

  - forest_leaves.jpeg - Bright green
  - mountain_leaves.jpeg - Dark green needles
  - desert_leaves.jpeg - Yellow-green fronds
  - plains_leaves.jpeg - Light green
  - tundra_leaves.jpeg - Gray-green hardy

  Special Blocks (1 block):

  - workbench.jpeg - Tan brown workbench

  📁 File Structure Needed:

  /assets/art/blocks/
  ├── grass.jpeg
  ├── coal.jpeg
  ├── wood.jpeg
  ├── glass.jpeg
  ├── brick.jpeg
  ├── glowstone.jpeg
  ├── iron.jpeg
  ├── flowers.jpeg
  ├── oak_wood.jpeg
  ├── pine_wood.jpeg
  ├── palm_wood.jpeg
  ├── birch_wood.jpeg
  ├── forest_leaves.jpeg
  ├── mountain_leaves.jpeg
  ├── desert_leaves.jpeg
  ├── plains_leaves.jpeg
  ├── tundra_leaves.jpeg
  └── workbench.jpeg

  Note: shrub and backpack blocks are handled as billboards/special items, not regular block textures.

  Both issues should now be resolved! 🎉