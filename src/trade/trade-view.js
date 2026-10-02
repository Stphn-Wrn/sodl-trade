import { GM_ROLE } from "./inventory.js";
import { STATUS } from "./trade.js";
import { DENOMINATIONS } from "./wealth.js";

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
      return { id: item.id, name: item.name, available };
    })
    .filter((item) => item.available > 0);
}

function partyView(party, index, role, negotiating, t) {
  const isMine = index === role;
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
      value: party.offer.wealth[denomination]
    })),
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
    parties: trade.parties.map((party, index) => partyView(party, index, role, negotiating, t)),
    inventory: availableItems(inventory, mine?.offer ?? { items: [] }),
    canAccept: isParty && negotiating && !mine.accepted,
    canWithdraw: isParty && mine.accepted,
    canApprove: role === GM_ROLE && trade.status === STATUS.AWAITING_APPROVAL,
    canCancel: role !== null
  };
}
