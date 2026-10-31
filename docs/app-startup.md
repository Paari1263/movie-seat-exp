# App startup

## Requirements

- Node.js 18 or newer
- A desktop browser with H.264 support (Chrome, Safari, Edge)

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Other commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |

## Trailer

The screen plays `public/Dolby_Surround.mp4`. Replace that file to change the trailer. Until the video loads (or if the browser can't play it) the screen shows an animated placeholder with a status message.

For faster start-up when hosted, move the file index to the front of the video:

```bash
ffmpeg -i Dolby_Surround.mp4 -c copy -movflags +faststart out.mp4
```

## Sound

Sound starts muted because browsers block audio until you interact with the page. Click the sound button to unmute. Use headphones for the full surround effect. A stereo track is needed for the surround speakers to be audible; a mono track only plays through the front speakers.

## Troubleshooting

- **Black or placeholder screen:** the browser can't decode the video, or `public/Dolby_Surround.mp4` is missing or empty.
- **No sound:** check the sound button is unmuted.
- **Blank page:** check the browser supports WebGL 2.
