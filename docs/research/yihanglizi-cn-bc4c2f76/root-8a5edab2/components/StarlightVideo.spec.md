# StarlightVideo performance profile

- Route: `/`, starry theme only.
- Original source: `素材/星际轨道/1.mp4`, 1596×1162, 60fps, with unused audio.
- HD profile: `/media/starlight-orbit-v7.mp4`, H.264 High, 1596×1162, 30fps, ~2.6 Mbps, no audio track, fast-start MP4.
- Lite profile: `/media/starlight-orbit-v7-lite.mp4`, H.264 High, 854×622, 30fps, ~0.6 Mbps.
- Source selection: `navigator.connection` saveData / 2G / 3G / downlink under 2.5 Mbps, or viewport ≤720px, chooses the lite profile.
- Poster `/media/starlight-orbit-poster-v3.webp` is frame 0 of the source, so the poster-to-video handoff shows no visible change.
- Autoplay is muted and inline. Playback pauses when the starry theme is hidden or the document is backgrounded.
- The particle galaxy renders at up to 30fps, uses capped device pixel ratio, and pauses outside the viewport.

