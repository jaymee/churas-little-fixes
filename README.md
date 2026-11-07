# Chura's Little Fixes

Small quality-of-life fixes for Foundry VTT 13.

## Fixes

- **Hide Scene Padding Border** hides the black outlines around the scene and canvas. The GM can enable it under **Configure Settings → Module Settings → Chura's Little Fixes**. It is off by default. Saving a change reloads connected clients.
- **Status Icon Height (%)** sizes regular status icons as a percentage of each token's displayed artwork height. Set it under the same module settings. Try 4% to start, or use 0% for Foundry's default sizing.
- **Browser Favicon** uses an image of your choice for the browser tab after signing in. Choose an image in the module settings, or leave the field blank for Foundry's usual icon.
- **Browser Tab Title** sets the tab title after signing in. Leave it blank to use Foundry's usual title.
- **Top-Align Chat Portraits** shows the upper part of tall artwork in Character Chat Selector's sender portraits. Enable it in the module settings. Each player can still choose whether to show portraits.
- **Compact Chat Portraits** puts the sender name beside the portrait in Character Chat Selector messages.
- **HP & MP Panel** opens automatically when you select a Project FU token you can edit and closes when you clear the selection. HP has damage, healing, defeat, and full heal controls. MP has decrease and increase controls. Toggle **Show HP & MP Panel on Token Selection** in the module settings. Inspired by [Always HP](https://foundryvtt.com/packages/always-hp).

## Install

In Foundry Setup, open **Add-on Modules → Install Module** and paste this manifest URL.

```text
https://github.com/jaymee/churas-little-fixes/releases/latest/download/module.json
```
