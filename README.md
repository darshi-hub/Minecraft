# VoxelCraft Ultra

A self-contained original browser voxel sandbox prototype built with HTML/CSS/JavaScript + Three.js CDN.

## Included systems
- First-person voxel world with seeded procedural terrain
- Plains, forest, desert, snow, swamp, jungle and mountain biomes
- Caves with actual geometry occlusion, shadowed interiors and local torch lights
- Procedural high-detail block atlas (original textures, not Minecraft assets)
- Dynamic day/night sun, moon, fog and cinematic color grading
- Water blocks, swimming and drowning/air timer
- Grass, flowers and trees
- Non-instant block mining with hardness-based timing
- Mining particles and item drops
- Item pickup, inventory quantities and hotbar selection
- Place blocks and Q-to-drop items into the world
- Inventory + crafting recipes
- Passive and hostile mobs: pig, cow, zombie, skeleton, piglin
- Large flying Ender-Dragon-style boss creature
- Nether-style and End-style portal structures
- Health, food and oxygen systems
- Desktop and basic mobile controls
- Shadow mapping and physically based materials

## Run
Use any static web server because ES modules are loaded from a CDN. For example:

`python -m http.server 8000`

Then open `http://localhost:8000` and enter the `voxelcraft_ultra` folder.

The project intentionally uses original procedural textures and geometry rather than copying Minecraft's proprietary assets.
