# Starlight backdrop profile

- Route: `/`, starry theme only.
- The original site's orbit video (1024 × 746) has been replaced by a live canvas sky in `src/lib/star-backdrop.ts`: concentric dotted rings, spiral dust, a glowing nucleus and twinkling sky stars.
- The canvas renders at the device pixel ratio (capped for very large screens), so it stays crisp at any viewport; the first frame is painted by the inline homepage bootstrap before hydration, with no media download.
- `prefers-reduced-motion` visitors get the same sky as a still frame. Switching to the cyber theme stops drawing and switching back resumes instantly. Hidden tabs stop drawing via `requestAnimationFrame` throttling.
- The old poster (`/media/starlight-orbit-poster-v2.webp`) still serves as the no-JS fallback and fades out once the canvas is live.
- The particle galaxy renders at up to 30fps, uses capped device pixel ratio, and pauses outside the viewport.
