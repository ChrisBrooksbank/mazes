# PWA & Mobile Polish

## Overview

Make the app installable, offline-capable, and polished on mobile devices.

## User Stories

- As a user, I want to install the app on my device so that I can access it like a native app
- As a user, I want the app to work offline so that I can play without an internet connection
- As a user, I want a responsive UI that works well on small screens

## Requirements

- [ ] `vite-plugin-pwa` configuration in `vite.config.ts`:
    - `registerType: 'autoUpdate'`
    - Web app manifest: name, icons, theme_color, standalone display
    - Workbox pre-caches all assets (`**/*.{js,css,html,png,svg}`)
- [ ] App icons: icon-192.png, icon-512.png, favicon.svg in `public/icons/`
- [ ] `Toolbar` component:
    - Algorithm picker dropdowns (generator, solver)
    - Generate and Solve buttons
    - View mode toggle buttons
    - Size controls (rows/cols)
    - Responsive: collapses to hamburger menu on screens < 640px
- [ ] `HUD` component:
    - Timer (time since generation or solve start)
    - Step counter
    - Minimap overlay in 3D views (small top-down canvas in corner)
- [ ] Keyboard shortcut hints (discoverable but not intrusive)
- [ ] Responsive CSS using custom properties and `@media` queries

## Acceptance Criteria

- [ ] App is installable (Chrome shows install prompt)
- [ ] App works fully offline after first load
- [ ] Service worker caches all assets
- [ ] Toolbar collapses on mobile without losing functionality
- [ ] Minimap shows in 3D views and updates with player position
- [ ] Timer and step counter display correctly

## Out of Scope

- Push notifications
- Cloud save/sync
- Leaderboards
