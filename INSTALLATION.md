# Installation

[Version française](INSTALLATION.fr.md)

## Before you start

You need:
- Foundry VTT (v13 minimum, tested on v14);
- the `demonlord` game system ("Shadow of the Demon Lord") installed;
- GM access to enable the module.

## Install

### Option A — Manifest URL (recommended)

1. On the Foundry setup screen, **Add-on Modules** tab, click **Install Module**.
2. Paste this URL in the **Manifest URL** field at the bottom of the window:
   ```
   https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
   ```
3. Click **Install**.

With this method, Foundry offers updates automatically.

### Option B — Manual install

Find your `Data` folder:
- **Windows**: `C:\Users\[YourName]\AppData\Local\FoundryVTT\Data`
- **macOS**: `~/Library/Application Support/FoundryVTT/Data`
- **Linux**: `~/.foundryvtt/Data`

Create a `sodl-trade` folder in `Data/modules/` and copy all the module files into it (`module.json` must be at the root of that folder).

## Enable in the world

1. Launch a world that uses the `demonlord` system.
2. **Game Settings → Manage Modules**.
3. Check **"L'Ombre du Seigneur Démon - Échanges"**, then save.

> The module only shows up in this list if the world uses a compatible version of the `demonlord` system (see `module.json` → `relationships.systems`).

Once the world reloads, the left toolbar holds the **double-arrow** icon that opens the Trades window, for the GM and for players.

## Before the first session

- **Assign each player their character** (*User Configuration → Character*), or give them the **Owner** permission on it. Only those characters show up in trades, splits and purchases.
- **Prepare the shops** in the **Shop** tab (**Edit shops** button): create categories and fill them from item folders. A shop stays closed until you open it with the padlock in its header.
- **Choose who gets the chat messages** (trades, rewards, shop) in the module settings.
- **Check the unit of unitless prices** in the settings: the `demonlord` system stores its prices in gold crowns.

## Settings

In **Game Settings → Configure Settings → L'Ombre du Seigneur Démon - Échanges**:

| Setting | Default | Who |
|---|---|---|
| Trade messages | People involved | GM |
| Reward messages | Everyone | GM |
| Shop messages | People involved | GM |
| Purchases must be approved by the GM | on | GM |
| Unit of unitless prices | GC | GM |

The module's language follows Foundry's (**Core Settings → Language**): English or French.

## Update

**Installed from the manifest URL** — **Add-on Modules** tab, **Update** button next to the module.

**Installed manually** — Delete `Data/modules/sodl-trade/`, copy the new version, then reload the world (Ctrl+Shift+R to clear the script cache).

Data is kept in the world across updates: ongoing trades, rewards and shops.

## Uninstall

1. **Manage Modules**: uncheck the module and save.
2. Delete the `sodl-trade` folder.

## Troubleshooting

**The module does not show up in "Manage Modules"**
- Is the folder in `Data/modules/`, with `module.json` at its root?
- Does the world use the `demonlord` system (the ID matters, not the displayed name), at a recent enough version?

**The double-arrow icon is missing from the left toolbar**
- Refresh (F5, or Ctrl+Shift+R).
- Open the console (F12) to spot a loading error.

**"A GM must be connected to handle trades"**
- The transfers are made by the GM's client: a user with the **Gamemaster** role must be logged in.

**A character is missing from the list, or an unexpected one shows up**
- A character counts when it is assigned to a player or when a player has the **Owner** permission on it by name. A permission given to everyone by default does not count.

**A player sees the Rewards or Shop tab greyed out, with a padlock**
- Rewards: they are closed, or kept for other characters (**Access** row).
- Shop: no shop is open, or the open shops are empty.

**A shop price looks wrong**
- If the item's price is a plain number ("5", "0.5"), check the **Unit of unitless prices** setting. Prices are read at import: after changing the setting, remove the items and import them again, or fix the price by hand in **Edit shops**.
