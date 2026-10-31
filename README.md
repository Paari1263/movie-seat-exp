# Movie Seat Experience

A 3D cinema where you can sit in any seat before booking it and see the screen from there.

## Why I built this

Picking a seat on a flat cinema map never tells you what the view will actually be like until you sit down. This project lets you walk into a 3D model of the theatre, click a seat, and look at the screen from that exact spot. The sound is positioned too, so surround effects follow your seat.

## Preview

- Local: http://localhost:5173 (after running `npm run dev`, see [docs/app-startup.md](docs/app-startup.md))
- Hosted link: _not published yet_

Open it in Chrome or Safari.

## What you can do

- Orbit around the theatre and click any seat to sit in it.
- Drag to look around, use arrow keys to move between seats, press `C` to compare with the previous seat, `Esc` to exit.
- See a view score for each seat; the best seats are marked light green and prime recliners gold.
- Toggle a heat-map of view quality.
- Watch a trailer on a curved screen with positional surround sound (unmute first).

## Stack

React, TypeScript, Vite, three.js with React Three Fiber, zustand.
