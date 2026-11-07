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

### HP & MP Panel

**Currently requires the Project FU system.**

The panel opens when you select a token you can edit. Drag the token name to move it. HP has damage, healing, defeat, and full heal controls. MP has decrease and increase controls.

Use **Show HP & MP Panel on Token Selection** to control whether it opens in your browser. Inspired by [Always HP](https://foundryvtt.com/packages/always-hp).

## Install

In Foundry Setup, open **Add-on Modules → Install Module** and paste this manifest URL.

```text
https://github.com/jaymee/churas-little-fixes/releases/latest/download/module.json
```
