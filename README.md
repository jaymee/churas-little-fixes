# Chura's Little Fixes

Small quality-of-life fixes for Foundry VTT 13.

## Fixes

Find these options under **Configure Settings → Module Settings → Chura's Little Fixes**.

### Browser Tab

- **Browser Favicon** uses an image of your choice for the browser tab after signing in. Leave it blank to use Foundry's usual icon.
- **Browser Tab Title** sets the tab title after signing in. Leave it blank to use Foundry's usual title.

### Chat Portraits

- **Top-Align Chat Portraits** shows the upper part of tall artwork in Character Chat Selector's sender portraits. Each player can still choose whether to show portraits.
- **Compact Chat Portraits** puts the sender name beside the portrait in Character Chat Selector messages.

### Canvas and Tokens

- **Hide Scene Padding Border** hides the black outlines around the scene and canvas. It is off by default. Saving a change reloads connected clients.
- **Status Icon Height (%)** sizes regular status icons as a percentage of each token's displayed artwork height. Try 4% to start, or use 0% for Foundry's default sizing.
- **Minimum Status Icon Size (px)** keeps proportionally sized icons at or above 16 canvas pixels by default.
- **Canvas Effects** opens from the film icon in the main left toolbar. The GM can play or loop a transparent WebM behind Foundry's interface for everyone viewing the scene. Playback continues when the controls window closes. Use **Stop Video** to end it, or set **Shake Intensity (%)** and click **Shake Canvas** for an earthquake effect. Videos play muted, and the shake follows each player's reduced-motion preference. Inspired by [Canvas FX](https://foundryvtt.com/packages/canvas-fx).

### Screen Overlay

The GM can choose an image, GIF, or muted looping WebM and set its width and position as percentages of the screen. The overlay sits above the interface while clicks pass through it. It hides when each viewer collapses their sidebar. Clear the file to turn it off.

### Map Pins

- **Hide Map Pin Backgrounds** removes the built-in box behind note icons.
- **Always Show Map Pin Labels** displays the normal hover label on pins the viewer can already see.
- **Map Pin Label** settings override the font, size, text color, shadow, and stroke across the world. The defaults use each note's original style.

To use your own pin image, open the note's configuration and choose **Entry Icon → Custom**, then pick an image in **Custom Icon**.

For a **Quest Marker**, link the pin to a short text journal page and enable **Quest Marker** in the note's configuration. A journal entry with exactly one text page works too. One click opens the details on the map for players with Observer access to the page. Quest markers hide their map labels even when regular pin labels are always shown.

For a moving city, use the city artwork as the map note's **Custom Icon**. The GM can open **Map Notes → Map Note Routes**, select a regular note or quest marker, and use **Add Stop** to save each location with a click on the map. **Advance** glides to the next stop, and **Start Loop** repeats the route until you click **Stop**. Anyone who can see the note can watch it move. Quest markers keep their popups.

**Quest Popup Font Family** changes the font in quest popups across the world. Leave it blank for the default font.

Use **Pin Glow** in a note's configuration to add a colored halo with adjustable brightness and size up to 500% of the icon. Choose **Pulse** or **Torch Flicker** and adjust the animation speed. The halo is visible to anyone who can see the pin, follows their reduced-motion preference, and leaves scene lighting alone.

### HP & MP Panel

**Currently requires the Project FU system.**

The panel opens when you select a token you can edit. Drag the token name to move it. HP has damage, healing, defeat, and full heal controls. MP has decrease and increase controls.

Use **Show HP & MP Panel on Token Selection** to control whether it opens in your browser. Inspired by [Always HP](https://foundryvtt.com/packages/always-hp).

## Install

In Foundry Setup, open **Add-on Modules → Install Module** and paste this manifest URL.

```text
https://github.com/jaymee/churas-little-fixes/releases/latest/download/module.json
```
