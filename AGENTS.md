<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Notebook

## Working Rules
- Keep the public portfolio map and the dev map editor as separate concerns. User-facing travel, hotspot behavior, and overlays should not share editor-only interaction state.
- Prefer explicit mode models over stacked booleans. `view` / `capture` / `move` is easier to reason about than multiple flags like `captureClicks`, `dragging`, `showHandles`, etc.
- Use map-space coordinates everywhere for editor data. Convert pointer events into map coordinates once, then keep draft geometry in the original image coordinate system.
- For this repo, favor small server shells with client-only islands for the heavy interaction layers.

## Map Editor Learnings
- Polygon zones need first-class IDs and a zone list. A free-text region input technically supports multiple zones, but it is poor UX and easy to misuse.
- Overlay rendering should be contextual to the selected mode. Showing every debug layer at once makes the map unreadable and obscures the art.
- Editing overlays must stay translucent. Heavy debug fills quickly hide the underlying sprite map and make point placement inaccurate.
- Draft handles should be draggable. Re-clicking to rebuild a shape from scratch is too expensive once polygons get long.
- Escape and backdrop-click should close every modal editor or guide panel. Treat all overlays consistently.

## Mistakes To Avoid
- Do not keep stale fallback systems around after moving to SVG overlays. The earlier rectangle-based walk zones and hotspot assumptions kept leaking into the new editor behavior.
- Do not hide critical dev controls in floating corners without a persistent entry point. Put the editor behind an obvious top-level button.
- Do not call `setState` directly inside effects when the value can be loaded in the state initializer instead.
- Do not include functions returned by `useEffectEvent` in effect dependency arrays.
- Do not let editor modes accidentally trigger normal gameplay/map behavior underneath.

## Refactor Guidelines
- Shared editor helpers should live near the top of the file or move into the editor module once they stop being map-route specific.
- Prefer helper predicates like `isPolygonMode()` over repeating string unions inline throughout the component.
- Derive contextual visibility from the selected editor mode instead of mutating many unrelated visibility flags.
- When a mutation affects selection state, update the active selection deliberately in the same user action instead of relying on downstream effects.

## Verification Checklist
- Run `npm run lint`.
- Run `npm run build`.
- Check the map editor in all three interaction modes: `view`, `capture`, and `move`.
- Confirm `Esc` and backdrop click close the editor.
- Confirm polygon mode can create, switch, and delete multiple zones.
