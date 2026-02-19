# Beat Canvas cohesive upgrade plan

## Goals
1. **Instant “try it” experience** (Demo Mode)  
2. **Better musical intelligence + consistent beat reactivity** (centralized beat/kick + later BPM/beat markers)  
3. **Power-user editor feel** (shortcuts, undo/redo, toasts, save/load)  
4. **Faster template/palette workflow** (filtering, favorites/recents, custom palettes, transitions)  
5. **Works well on mobile + accessibility** (responsive layout, reduced motion, touch targets)

---

## Phase 0 — Setup & UI feedback (fast foundation)

### 0.1 Toast notifications
- Add `sonner`, CRT-styled Toaster, include in Providers.
- Use to confirm actions: export started/finished, save/load, demo loaded, errors.

**Verify:** toasts appear consistently and don’t cover the preview.

---

## Phase 1 — Core power-user spine (everything else builds on this)

### 1.1 Undo/Redo (with sensible history)
- Add `zundo` to Zustand store with `temporal()`.
- Track only user-editable fields (template, params, palette, intensity, overlay, clip), exclude big buffers/frames.
- Debounce slider history so you don’t create 200 undo steps while dragging.
- Wire `Cmd+Z` / `Cmd+Shift+Z` + add header buttons.

### 1.2 Keyboard shortcuts + help modal
- Expand editor keyboard bindings (seek, jump, template quick select, export, help “?”, etc.).
- Add `ShortcutsModal` and (optionally) a central shortcuts registry so bindings stay consistent.

### 1.3 Project Save/Load (creator QoL)
- Add snapshot serialization (versioned), autosave, restore prompt, and import/export `.beatcanvas`.
- Store audio filename hint; require re-upload for audio buffer.

**Verify (Phase 1):**
- Undo/redo works for template/palette/intensity/overlay/trim.
- Shortcuts work without interfering with text inputs.
- Autosave restores state after refresh; file import/export works.

---

## Phase 2 — “Try it now” + browsing speed (conversion + usability)

### 2.1 Demo Mode (no-upload entry)
- Add `/public/demo/demo-beat.mp3` + loader helper.
- Landing page: “Try Demo” button loads demo audio into store and routes to editor.
- Editor header shows “DEMO” badge + “Upload your own” CTA.

### 2.2 Template filtering (category pills)
- Add categories map in template registry and pill UI in TemplateBrowser.
- Filter the grid by vibe (intense/ambient/geometric/etc.).

### 2.3 Template favorites & recents (optional but high ROI)
- LocalStorage preferences for favorites + recents (cap ~6).
- TemplateBrowser shows Favorites/Recent sections above All.

**Verify (Phase 2):**
- Demo loads reliably and is clearly labeled.
- Categories filter correctly.
- Favorites persist after refresh.

---

## Phase 3 — Beat intelligence v1 (make all templates consistently reactive)

### 3.1 Centralized beat / kick detection in audio pipeline
- Extend `ReactiveFrame` with `kick`, `onset`, `kickIntensity`.
- Add constants + detection pass in `ReactiveFeatureBuilder`.
- Replace per-template duplicated “bassAccel > threshold” logic with `input.frame.kickIntensity`.
- Update default/fallback frames in editor + export service.

**Verify:** reactiveFrames include new fields; templates respond consistently; no regressions in export.

---

## Phase 4 — Audio intelligence v2 (BPM + beat-synced UX)

### 4.1 BPM detection + beat markers
- Onset detection + autocorrelation BPM estimation (60–200 BPM).
- Run in a Web Worker.
- Store `bpm` and `beatMarkers` in project state.
- Show BPM badge in transport; draw beat markers on waveform.
- Extend template input with `beatPhase` and `isBeat` (backward compatible).

### 4.2 Beat-snap trimming
- Trim handles snap to nearest beat marker (within ~150ms threshold) with a small visual cue.

**Verify:** BPM appears for rhythmic tracks; beat markers align; trimming snaps predictably.

---

## Phase 5 — Creator customization (palettes + export ergonomics)

### 5.1 Custom palette editor
- Persistent custom palettes store (localStorage) + inline editor with `<input type="color">`.
- Palette selector supports built-in + custom with add/edit/delete.
- Rendering merges custom palette colors cleanly.

### 5.2 Export preset profiles (+ later batch export)
- Presets grid for TikTok/Reels/Shorts/etc., “Custom” reveals manual controls.
- Then batch export queue (sequential) as an add-on.

**Verify:** custom palettes persist across refresh; export presets apply correct settings; batch export doesn’t crash memory.

---

## Phase 6 — Polish that changes perceived quality (visual + mobile + accessibility)

### 6.1 Template transitions (crossfade)
- TemplateManager supports dual rendering to targets and blends with a simple shader for ~0.5s.
- Keep a persistent TemplateManager instance; switching templates triggers transition instead of rebuild.

### 6.2 Mobile responsive editor + landing
- Responsive layout:
  - Desktop: current 3-column
  - Tablet/mobile: single column + bottom tab bar (keep canvas mounted; use CSS visibility)
- Touch-friendly transport controls (44px+ targets), template browser horizontal scroll, preview max height on mobile.
- Landing page and drop zone become fluid-width.

### 6.3 Reduced motion support + thumbnail skeletons
- Respect `prefers-reduced-motion` in CSS and MotionConfig.
- Add skeleton shimmer for template thumbnails to reduce perceived latency.

**Verify:** mobile layout works in device emulation; reduced-motion disables animations; transitions are smooth; thumbnails don’t pop awkwardly.

---

## Single verification checklist (run every phase)
1. App boots: `pnpm dev` / `npm run build`
2. Upload audio → editor loads → preview plays
3. Export works reliably
4. Phase-specific checks (above), plus regression checks:
   - No template breaks
   - Store state remains sane (undo history capped, no giant objects in history)
   - Memory doesn’t balloon during transitions/exports/batch operations

---

## One-sprint cut (if needed)
Phase **1 + 2 + 3** delivers the highest impact quickly: **power-user feel + demo + real beat reactivity**, without taking on the biggest engineering items (transitions, full BPM worker, full mobile redesign).
