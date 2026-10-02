import { COMBAT_TYPES, GM_ROLE } from "./inventory.js";
import { STATUS } from "./trade.js";
import { DENOMINATIONS, emptyWealth, isEmptyWealth } from "./wealth.js";

function describeItem(item) {
  if (item.quantity === 1) {
    return item.name;
  }
  return `${item.name} ×${item.quantity}`;
}

export function describeOffer(offer, t) {
  const coins = DENOMINATIONS
    .filter((denomination) => offer.wealth[denomination] > 0)
    .map((denomination) => `${offer.wealth[denomination]} ${t(`SODLTRADE.Wealth.${denomination}`)}`);
  const parts = [...offer.items.map(describeItem), ...coins];
  if (parts.length === 0) {
    return t("SODLTRADE.Nothing");
  }
  return parts.join(", ");
}

function availableItems(inventory, offer) {
  if (!inventory) {
    return [];
  }
  return inventory.items
    .map((item) => {
      const offered = offer.items.find((entry) => entry.itemId === item.id);
      let available = item.quantity;
      if (offered) {
        available -= offered.quantity;
      }
      return { id: item.id, name: item.name, img: item.img, type: item.type, available };
    })
    .filter((item) => item.available > 0);
}

function inventoryGroups(items, t) {
  const entry = ({ id, name, img, available }) => ({ id, name, img, available });
  return [
    { id: "combat", label: t("SODLTRADE.Window.Combat"), items: items.filter((item) => COMBAT_TYPES.includes(item.type)).map(entry) },
    { id: "gear", label: t("SODLTRADE.Window.Gear"), items: items.filter((item) => !COMBAT_TYPES.includes(item.type)).map(entry) }
  ];
}

function describeWealth(wealth, t) {
  if (isEmptyWealth(wealth)) {
    return t("SODLTRADE.Window.NoMoney");
  }
  return describeOffer({ items: [], wealth }, t);
}

function partyView(party, index, role, negotiating, inventory, t) {
  const isMine = index === role;
  let owned = emptyWealth();
  if (isMine && inventory) {
    owned = inventory.wealth;
  }
  return {
    name: party.name,
    img: party.img,
    accepted: party.accepted,
    isMine,
    editable: isMine && negotiating,
    items: party.offer.items,
    wealth: DENOMINATIONS.map((denomination) => ({
      denomination,
      label: t(`SODLTRADE.Wealth.${denomination}`),
      value: party.offer.wealth[denomination],
      owned: owned[denomination]
    })),
    wealthText: describeWealth(party.offer.wealth, t),
    summary: describeOffer(party.offer, t)
  };
}

export function tradeView(trade, role, inventory, t) {
  const negotiating = trade.status === STATUS.NEGOTIATING;
  const isParty = role === 0 || role === 1;
  let mine = null;
  if (isParty) {
    mine = trade.parties[role];
  }
  return {
    id: trade.id,
    status: trade.status,
    statusLabel: t(`SODLTRADE.Status.${trade.status}`),
    isGM: role === GM_ROLE,
    parties: trade.parties.map((party, index) => partyView(party, index, role, negotiating, inventory, t)),
    inventoryGroups: inventoryGroups(availableItems(inventory, mine?.offer ?? { items: [] }), t),
    showInventory: isParty && negotiating,
    canAccept: isParty && negotiating && !mine.accepted,
    canWithdraw: isParty && mine.accepted,
    canApprove: role === GM_ROLE && trade.status === STATUS.AWAITING_APPROVAL,
    canCancel: role !== null
  };
}
