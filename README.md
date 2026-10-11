# Shadow of the Demon Lord - Trades and Crafting

[Version française](README.fr.md)

Foundry VTT module for **Shadow of the Demon Lord**: trades negotiated between players and approved by the GM, a shared loot pool revealed as the game goes, shops with prices, availability and stock, and crafting from recipes (potions, poisons…).

**Compatibility:** Foundry VTT v13+ (tested on v14) | `demonlord` system v6.1.0+

**Languages:** English and French, following the language set in Foundry (*Settings → Configure Settings → Core Settings → Language*).

## Features

Everything goes through the **Trades** window, opened by the double-arrow button in the left toolbar. It has five tabs: **Trades**, **Rewards**, **Shop**, **Crafting** and **Harvest**. Below the tabs, a banner shows the player's character (portrait, name, purse). A player who owns several characters picks the one they act with there.

A counter on the toolbar button, and on each tab, shows what is waiting: trades and purchase requests to approve for the GM; ongoing trades and treasures to take for players.

### Trades between players
- **Propose** — In the Trades tab, the player clicks another character's portrait. The negotiation window opens for both players.
- **Negotiate** — Each player sees their inventory on the right, sorted like on their sheet (**Combat** and **Inventory**). They drag items into their column, or click one to add it. Items can also be dragged from the character sheet. The quantity is set in the offer, and money is entered coin by coin, with what the character owns shown next to it.
- **Accept** — Each player clicks **Accept the trade**. Any change to an offer clears both acceptances.
- **GM approval** — The GM is told by the counter and a chat message, opens the trade, then approves or rejects it. On approval, items and money change hands. A received item arrives unequipped.
- **Tracking** — Every step is logged in the chat, by default whispered to the GM and both players (see the settings). The GM sees every ongoing trade in the Trades tab.

### Rewards (shared loot)
- **Closed by default** — The tab is greyed out for players. The GM prepares the loot, then clicks **Open to players**. **Close to players** closes it again at any time.
- **Access** — By default, the rewards are for the **whole party**. The GM can keep them for some characters by selecting them: the others see the tab closed, and chat messages only go to the GM and the players involved.
- **Prepare** — The **Prepare** button switches to editing: the GM drops what the group found (sidebar, compendium, NPC sheet), sets quantities and enters money. **Done** goes back to the play view. A dropped item is a copy: the original stays where it was.
- **Reveal as you go** — Everything the GM drops starts hidden. In the play view, the GM reveals each treasure by clicking its eye, the money separately, or everything at once with **Reveal all**. Players only see, and can only take, what is revealed.
- **Help themselves** — Players take what they want directly, one by one, as well as the money.
- **Split the money** — The GM selects the characters involved (everyone by default) and splits the money evenly. Change is made automatically (1 GC = 10 SS = 100 CP = 1000 bits), and what cannot be divided stays in the loot.

### Shop
- **Categories** — Shops are sorted into categories (Blacksmith, Alchemist…), collapsed or expanded by clicking their header.
- **Open or close** — A new shop starts closed: the GM stocks it, then opens it to players with the padlock in its header. Players only see, and can only buy from, open shops; if none is open, the Shop tab is greyed out. They are told when a shop opens.
- **Fill** — The **Edit shops** button switches to editing. The GM fills a category by pasting the ID or UUID of an item folder then clicking **Import**, by dropping a whole folder on the category, or by dropping items one by one. Subfolders are included, and compendium folders work too.
- **Price and availability** — Each item keeps its name, price and availability (common, uncommon, rare, exotic), which the GM can change. A price is written like "1 GC 5 SS". A plain number, such as "5" or "0.5", is counted in the unit chosen in the settings (GC by default, like the system), and decimals are converted to coins: 0.5 GC becomes 5 SS. An item without a readable price shows "Price to set" and cannot be bought.
- **Stock** — Unlimited by default. The GM enters the number of bundles available (empty field = unlimited). Each purchase removes the bundles bought; at 0 the item is "Sold out". The **Restock** button (every shop, or one category from its header) brings each item back to the stock the GM entered.
- **Buy** — By default, the player sends a **purchase request**: nothing is paid until the GM approves it. The GM sees the requests at the top of the tab (with the buyer's purse) and a counter on the tab. They can change the quantity (the price follows in proportion) and the total price, down to 0 to give the item away, then approve or reject; the player is told about every change and can cancel their request while it is pending. On approval, the requested price is paid, the merchant makes change and the stock goes down. If the GM turns approval off in the settings, purchases are immediate. An item sold in a bundle (20 arrows, for example) is delivered whole for the bundle price.

### Crafting (recipes)
- **Basic resources** — The **Create resources** button adds a "Crafting resources" folder of 44 items in 6 categories to the world's items (plants and mushrooms, minerals and metals, creature parts, alchemical components, craft materials, other worlds), with price, availability and description. They serve as ingredients, and can also be sold in shops or put in the rewards. Clicking again only creates what is missing, even if the GM renamed or moved the items.
- **Default recipes** — The **Default recipes** button adds 16 ready-made recipes: the Assassin's poison (core book), core book potions (healing, antitoxin, fire resistance, alertness) whose materials follow the Companion rule (a quarter of the price, minus the value of the ingredients asked for), and house recipes that turn resources into goods (oil, torches, candles, arrows, ingots, leather, spirit, bone powder). Missing resources are created, and book items are looked up by name (English or French) in the world then the compendiums: a recipe whose item cannot be found is left out and reported. Nobody knows the recipes until the GM teaches them.
- **Recipes** — The **Edit recipes** button switches to editing. The GM creates a recipe, drops the crafted item on it (potion, poison, ammunition…) and sets the quantity made, then drops the ingredients used up (with how many of each) and the required tools, which must be owned but are not used up (alchemist's kit, smith's tools…). The indicative time and the attribute roll are optional.
- **Companion rules** — Following *Crafting Equipment* (Demon Lord's Companion), the materials cost is filled in automatically with a quarter of the crafted item's price, rounded up; the GM can change or clear it. The right profession is handled by teaching the recipe to the characters who have it, and the Intellect test for a simple item is the recipe's roll.
- **Requirements** — A recipe can require a profession, path, talent or ancestry: the GM drops one, or types a word like "blacksmith". The requirement is met if the character has something copied from the dropped one, or whose name contains the word ("smith" matches "Artisan (blacksmith)", ignoring accents). If there are several, any one is enough. The player sees them in green or orange, and cannot craft without one.
- **Roll** — When the recipe asks for a roll (Strength, Agility, Intellect or Will, with boons or banes), the system rolls it with the character's bonuses and it succeeds on 10 or more. On a failure, the ingredients and money are lost and nothing is crafted.
- **Learned recipes** — Each recipe is taught to specific characters, with a click on their name. A player only sees their character's recipes, and is told when they learn one. Until they know one, the tab is greyed out.
- **Craft** — For each ingredient, the player sees what they own and what is needed. The **Craft** button stays greyed out while an ingredient or money is missing. An ingredient is recognised by its name (ignoring case and accents), or by the item it was copied from if it was renamed; several stacks add up.
- **Approval** — Crafting is immediate by default. If the GM turns approval on in the settings, the player sends a request the GM approves or rejects, as with purchases; nothing is used up before.
- **Turn off** — A table that does not want it turns crafting off in the settings: the tab disappears.

### Harvest
- **Worlds and biomes** — Each biome has its table: one line per item, with a **chance in %** and a **quantity in dice** (1d3, 2d4 or a number). What is left up to 100% finds nothing. The mortal world has seven biomes (forest, swamp, mountains, underground, plains and moors, ruins and graveyards, coasts and rivers), and each other world of the core book has its own: Hidden Kingdoms, Underworld, Hell and the Void. Ruins are searched rather than picked: scrap metal, vials, cloth.
- **Edit biomes** — The GM creates, renames and deletes worlds and biomes (with the description shown to players), drops any item on a biome and sets its chance and dice. A biome's total cannot go over 100%. The starting map comes from the shipped catalog, where chances follow each resource's rarity; **Reset from the catalog** goes back to it.
- **Open** — The GM picks the biome where the party is, the roll (Perception by default) and its boons, then opens the harvest. They see what can be found there, with the written chance and the actual chance in the current state of the world.
- **Harvest** — Each character searches once. The roll goes through the system: a failure finds nothing, a success allows one search, and 20 or more allows two. What is found joins the stack the character already carries. **Renew** lets them try again (after a day of searching, for instance), and **Close** ends the harvest.
- **A dying world** — Written chances are those of a preserved world. The **State of the world** setting multiplies them all: ×1 (preserved), ×0.5 (dying, the default) or ×0.25 (devastated).
- **Resources** — The world's version of a resource (price or description changed by the GM) is used if it exists, otherwise the catalog's.

## Installation

See the [installation guide](INSTALLATION.md). In short, in the **Add-on Modules** tab of the Foundry setup screen, **Install Module**, then paste:

```
https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
```

## Settings

In *Game Settings → Configure Settings → L'Ombre du Seigneur Démon - Échanges et artisanat*:

| Setting | Default |
|---|---|
| Enable trades, rewards, shops, crafting, harvesting (one switch each) | on |
| Trade messages | People involved |
| Reward messages | Everyone |
| Shop messages | People involved |
| Purchases must be approved by the GM | on |
| Crafting and harvest messages | People involved |
| State of the world | Dying |
| Crafting must be approved by the GM | off |
| Unit of unitless prices | GC |

Each part of the module can be turned off on its own: its tab disappears, and the GM's client refuses requests for it. If everything is off, the toolbar button disappears too.

For each kind of chat message, the GM chooses who gets it: **No message**, **GM only**, **People involved** (the GM and the players concerned) or **Everyone**. Rewards kept for some characters are never shown to the others.

## Good to know

- **A GM must be connected.** A player cannot change another player's character: the GM's client checks the actions and makes the transfers.
- **Party characters** — Only characters assigned to a player or explicitly owned by a player count. An actor everyone owns by default (shared token, map marker) does not show up.
- **Trades** — Money is traded coin by coin, without change: to give 1 SS, you need to own 1 SS. If an offered item is gone before approval, the trade goes back to negotiation and the chat gives the reason.
- **Shields** — The system defines each shield twice: a weapon (to bash with) and an armor (for the Defense bonus), sharing the same name. The module treats them as one item: only the armor is shown, and trading, taking or buying the shield moves both. If a character only has one half (only the weapon, for instance), whoever receives it in a trade also gets the other half, looked up in the world's items then in the compendiums, unless they already own it.
- **Received items** — They do not merge with an identical item already owned.
- **Shops** — A shop keeps a reference to the original item: if it is deleted, it can no longer be bought. The loot, on the other hand, keeps a copy. Recipes work like shops: once the original crafted item is deleted, the recipe no longer works.

## Development

```bash
npm test
```

The tests cover the logic (negotiation, transfers, money, prices, loot, shops and purchase requests, recipes and crafting, harvest, shields, message recipients) and run with `node --test`, without Foundry.

## License

MIT
