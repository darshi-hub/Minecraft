# HYPERCRAFT

A browser-based original voxel sandbox prototype designed around the requested “Minecraft-like but hyperrealistic” direction.

## Included systems

- Procedural voxel world + deterministic seed
- Plains, desert, mountains, swamp, snow-style terrain
- Caves with actual enclosed geometry and shadowed interiors
- Directional sun + soft shadows + ACES tone mapping + fog
- Procedural high-frequency block materials generated locally in JavaScript
- Grass/flowers/trees
- Water blocks and swimming/buoyancy behavior
- Air meter + drowning
- Survival health + hunger
- Creative flight toggle
- Mining with non-instant break times and a progress bar
- Block drops with physical pickup motion
- Place and remove blocks
- Hotbar quantities and block names update dynamically
- Inventory UI
- Crafting recipes
- Dropping held blocks with Q
- Pig, zombie, piglin-style and ender-style mobs
- Hostile mob pursuit/damage
- Nether and End test dimensions
- Portal-frame generation and dimension switching foundation
- Respawn/death loop
- New random seed generation

## Run

The easiest route is a local static server because browser module imports are restricted by some file:// configurations.

Examples:

```bash
python -m http.server 8000
```

Then open:

http://localhost:8000/

No build step is required.

## Important scope note

This is an original implementation, not a copy of Minecraft's proprietary code, models, textures, sounds or UI. The visual target is a cinematic, realistic voxel sandbox: physically motivated lighting, richer material detail, dense vegetation, cave darkness and reflective water.

The procedural textures are generated in-browser, so the project has no external texture pack dependency.

## Controls

WASD — move
Mouse — look
Space — jump / swim up
Shift — descend while flying
LMB — mine / attack target
RMB — place block
1–9 — hotbar
Mouse wheel — select
E — inventory/crafting
Q — drop selected item
F — creative flight toggle
N — generate a new seed
P — create a test portal frame
