# Shadow of the Demon Lord - Trades

[Version française](README.fr.md)

Foundry VTT module for **Shadow of the Demon Lord**: trades negotiated between players and approved by the GM, a shared loot pool revealed as the game goes, and shops with prices, availability and stock.

**Compatibility:** Foundry VTT v13+ (tested on v14) | `demonlord` system v6.1.0+

**Languages:** English and French, following the language set in Foundry (*Settings → Configure Settings → Core Settings → Language*).

## Features

Everything goes through the **Trades** window, opened by the double-arrow button in the left toolbar. It has three tabs: **Trades**, **Rewards** and **Shop**. Below the tabs, a banner shows the player's character (portrait, name, purse). A player who owns several characters picks the one they act with there.

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

## Installation

See the [installation guide](INSTALLATION.md). In short, in the **Add-on Modules** tab of the Foundry setup screen, **Install Module**, then paste:

```
https://raw.githubusercontent.com/Stphn-Wrn/sodl-trade/main/module.json
```

## Settings

In *Game Settings → Configure Settings → L'Ombre du Seigneur Démon - Échanges*:

| Setting | Default |
|---|---|
| Trade messages | People involved |
| Reward messages | Everyone |
| Shop messages | People involved |
| Purchases must be approved by the GM | on |
| Unit of unitless prices | GC |

For each kind of chat message, the GM chooses who gets it: **No message**, **GM only**, **People involved** (the GM and the players concerned) or **Everyone**. Rewards kept for some characters are never shown to the others.

## Good to know

- **A GM must be connected.** A player cannot change another player's character: the GM's client checks the actions and makes the transfers.
- **Party characters** — Only characters assigned to a player or explicitly owned by a player count. An actor everyone owns by default (shared token, map marker) does not show up.
- **Trades** — Money is traded coin by coin, without change: to give 1 SS, you need to own 1 SS. If an offered item is gone before approval, the trade goes back to negotiation and the chat gives the reason.
- **Shields** — The system defines each shield twice: a weapon (to bash with) and an armor (for the Defense bonus), sharing the same name. The module treats them as one item: only the armor is shown, and trading, taking or buying the shield moves both. If a character only has one half (only the weapon, for instance), whoever receives it in a trade also gets the other half, looked up in the world's items then in the compendiums, unless they already own it.
- **Received items** — They do not merge with an identical item already owned.
- **Shops** — A shop keeps a reference to the original item: if it is deleted, it can no longer be bought. The loot, on the other hand, keeps a copy.

## Development

```bash
npm test
```

The tests cover the logic (negotiation, transfers, money, prices, loot, shops and purchase requests, shields, message recipients) and run with `node --test`, without Foundry.

## License

MIT
