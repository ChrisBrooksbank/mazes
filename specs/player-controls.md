# Player & Controls

## Overview

Player entity with grid-based position, wall collision, and keyboard/touch input handling.

## User Stories

- As a user, I want to navigate the maze using keyboard controls so that I can try to solve it manually
- As a user, I want to navigate on mobile using touch controls so that I can play on my phone
- As a user, I want walls to block my movement so that the maze is a real challenge

## Requirements

- [ ] `Player` class with grid position `{row, col}` and world position (for 3D interpolation)
- [ ] Player orientation/facing direction
- [ ] Movement validation against `cell.walls` before allowing movement
- [ ] Keyboard input handler: Arrow keys and WASD for movement
- [ ] 2D movement: instant cell-to-cell transition
- [ ] 3D movement: lerp over ~200ms for smooth transitions
- [ ] `TouchControls`: translucent on-screen D-pad overlay for mobile
    - Only visible on touch devices
    - Semi-transparent, positioned in bottom-left or bottom-right
    - Responds to touch start/end events
- [ ] App state management (`state.ts`): current grid, player, view mode, solver state, event emitter

## Acceptance Criteria

- [ ] Player cannot move through walls in any view
- [ ] WASD and arrow keys both work for movement
- [ ] Touch D-pad appears on mobile/touch devices and functions correctly
- [ ] Player position syncs correctly between all view modes
- [ ] Reaching the end cell triggers a completion state

## Out of Scope

- Multiplayer
- Player customization/skins
- Undo/redo movement
