# Escape from Goon Shu

A lightweight 2D browser game where you dodge the chasing enemy, navigate random maze walls, and reach the escape zone before getting caught 3 times.

## Play

1. Open `index.html` in a browser.
2. Move with **WASD** or **Arrow keys**.
3. Press **R** any time to restart from level 1.
4. Reach the green **ESCAPE** zone on the right side.
5. If the enemy catches you, a white splash effect appears and you lose one life.
6. Get caught 3 times and the run ends.

## Progression / phases

- **Level 1**: Basic chase + random maze walls.
- **Level 2+**: Goon Shu unlocks periodic dash bursts.
- **Level 3+**: Goon Shu throws **shoes** as projectiles.

Each escape increases level difficulty and generates a bigger maze pattern.

## Asset note

- Enemy sprite path: `assets/goonshu.svg`.
- This repo includes a default local sprite so the project works out of the box.
- To use a different enemy image, replace `assets/goonshu.svg` with your own SVG file using the same name.
