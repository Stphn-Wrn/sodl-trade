import { LocalizedError } from "../shared/i18n.js";
import { GM_ROLE } from "./inventory.js";
import { coversWealth, emptyWealth, isEmptyWealth, toWealth } from "./wealth.js";

export const STATUS = {
  NEGOTIATING: "negotiating",
  AWAITING_APPROVAL: "awaitingApproval",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};

export const FINAL_STATUSES = [STATUS.APPROVED, STATUS.REJECTED, STATUS.CANCELLED];

const OPEN_STATUSES = [STATUS.NEGOTIATING, STATUS.AWAITING_APPROVAL];
const PARTY = "party";
const GM = "gm";

function newParty({ actorId, name, img }) {
  return { actorId, name, img, accepted: false, offer: { items: [], wealth: emptyWealth() } };
}

export function createTrade({ id, initiator, target }) {
  return { id, status: STATUS.NEGOTIATING, parties: [newParty(initiator), newParty(target)] };
}

export function isEmptyOffer(offer) {
  return offer.items.length === 0 && isEmptyWealth(offer.wealth);
}

function withOffer(trade, role, offer) {
  const parties = trade.parties.map((party, index) => {
    if (index === role) {
      return { ...party, offer, accepted: false };
    }
    return { ...party, accepted: false };
  });
  return { trade: { ...trade, parties }, event: null };
}

function withStatus(trade, status, event) {
  return { trade: { ...trade, status }, event };
}

function setItem(trade, action, { role, inventories }) {
  const owned = inventories[role].items.find((item) => item.id === action.itemId);
  if (!owned) {
    throw new LocalizedError("SODLTRADE.Errors.ItemNotOwned");
  }
  const quantity = Math.trunc(Number(action.quantity));
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  if (quantity > owned.quantity) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: owned.name });
  }
  const offer = trade.parties[role].offer;
  const items = offer.items.filter((item) => item.itemId !== owned.id);
  if (quantity > 0) {
    items.push({ itemId: owned.id, name: owned.name, img: owned.img, quantity });
  }
  return withOffer(trade, role, { ...offer, items });
}

function setWealth(trade, action, { role, inventories }) {
  const wealth = toWealth(action.wealth);
  if (!coversWealth(inventories[role].wealth, wealth)) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
  }
  return withOffer(trade, role, { ...trade.parties[role].offer, wealth });
}

function accept(trade, action, { role }) {
  if (trade.parties.every((party) => isEmptyOffer(party.offer))) {
    throw new LocalizedError("SODLTRADE.Errors.EmptyTrade");
  }
  const parties = trade.parties.map((party, index) => {
    if (index === role) {
      return { ...party, accepted: true };
    }
    return party;
  });
  if (parties.every((party) => party.accepted)) {
    return withStatus({ ...trade, parties }, STATUS.AWAITING_APPROVAL, "awaitingApproval");
  }
  return { trade: { ...trade, parties }, event: null };
}

function withdraw(trade, action, { role }) {
  const parties = trade.parties.map((party, index) => {
    if (index === role) {
      return { ...party, accepted: false };
    }
    return party;
  });
  return withStatus({ ...trade, parties }, STATUS.NEGOTIATING, null);
}

const ACTIONS = {
  setItem: { roles: [PARTY], statuses: [STATUS.NEGOTIATING], run: setItem },
  setWealth: { roles: [PARTY], statuses: [STATUS.NEGOTIATING], run: setWealth },
  accept: { roles: [PARTY], statuses: [STATUS.NEGOTIATING], run: accept },
  withdraw: { roles: [PARTY], statuses: OPEN_STATUSES, run: withdraw },
  cancel: { roles: [PARTY, GM], statuses: OPEN_STATUSES, run: (trade) => withStatus(trade, STATUS.CANCELLED, "cancelled") },
  approve: { roles: [GM], statuses: [STATUS.AWAITING_APPROVAL], run: (trade) => withStatus(trade, STATUS.APPROVED, "approved") },
  reject: { roles: [GM], statuses: [STATUS.AWAITING_APPROVAL], run: (trade) => withStatus(trade, STATUS.REJECTED, "rejected") }
};

function roleKind(role) {
  if (role === GM_ROLE) {
    return GM;
  }
  if (role === 0 || role === 1) {
    return PARTY;
  }
  return null;
}

export function applyAction(trade, action, context) {
  const strategy = ACTIONS[action.type];
  if (!strategy) {
    throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
  }
  if (!strategy.roles.includes(roleKind(context.role))) {
    throw new LocalizedError("SODLTRADE.Errors.NotAllowed");
  }
  if (!strategy.statuses.includes(trade.status)) {
    throw new LocalizedError("SODLTRADE.Errors.WrongStatus");
  }
  return strategy.run(trade, action, context);
}

export function reopenTrade(trade) {
  return {
    ...trade,
    status: STATUS.NEGOTIATING,
    parties: trade.parties.map((party) => ({ ...party, accepted: false }))
  };
}
