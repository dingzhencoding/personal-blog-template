# StarlightVideo performance profile

- Route: `/`, starry theme only.
- Asset: `/media/starlight-orbit-original.mp4` is the untouched original `素材/星际轨道/1.mp4` (1596×1162, 60fps, ~10.3 Mbps, ~35.6 MB, moov already at the head of the file). No re-encode or compression.
- Poster `/media/starlight-orbit-poster-v3.webp` is frame 0 of the source, so the poster-to-video handoff shows no visible change.
- Trade-off accepted for the preview: slow connections wait for the download before playback starts; the `verify-background-video` throttling check therefore runs at broadband speed.
- Autoplay is muted and inline. Playback pauses when the starry theme is hidden or the document is backgrounded.
- The particle galaxy renders at up to 30fps, uses capped device pixel ratio, and pauses outside the viewport.

