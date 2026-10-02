import { LocalizedError } from "../shared/i18n.js";
import { TRADABLE_TYPES, sourceQuantity } from "./inventory.js";
import { coversWealth, emptyWealth, fromBits, isEmptyWealth, settleWealth, toBits, toWealth } from "./wealth.js";

export function emptyLoot() {
  return { items: [], wealth: emptyWealth(), wealthRevealed: false, open: false, audience: [] };
}

export function splitWealth(wealth, count) {
  const total = toBits(wealth);
  const shareBits = Math.floor(total / count);
  return { share: fromBits(shareBits), remainder: fromBits(total - shareBits * count) };
}

function toQuantity(value) {
  const quantity = Math.trunc(Number(value));
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  return quantity;
}

function withItemQuantity(loot, id, quantity) {
  if (quantity === 0) {
    return { ...loot, items: loot.items.filter((item) => item.id !== id) };
  }
  return { ...loot, items: loot.items.map((item) => {
    if (item.id === id) {
      return { ...item, quantity };
    }
    return item;
  }) };
}

function result(loot, grants = [], event = null, revealed = null) {
  return { loot, grants, event, revealed };
}

// What players can see: only revealed items, and the money once the GM revealed it.
export function visibleWealth(loot) {
  if (loot.wealthRevealed) {
    return loot.wealth;
  }
  return emptyWealth();
}

function findVisibleItem(loot, id) {
  const item = loot.items.find((entry) => entry.id === id && entry.revealed);
  if (!item) {
    throw new LocalizedError("SODLTRADE.Errors.LootGone");
  }
  return item;
}

// A reveal is announced only while players can see the rewards; opening them announces the rest.
function announce(loot, next, items, wealth) {
  if (!loot.open || (items.length === 0 && isEmptyWealth(wealth))) {
    return result(next);
  }
  return result(next, [], "revealed", { items: items.map(({ name, quantity }) => ({ name, quantity })), wealth });
}

function grant(actorId, items, wealth) {
  return { actorId, items, wealth };
}

function add(loot, { id, sourceUuid, data, linked = [] }) {
  if (!TRADABLE_TYPES.includes(data.type)) {
    throw new LocalizedError("SODLTRADE.Errors.NotLootable", { name: data.name });
  }
  const existing = loot.items.find((item) => item.sourceUuid === sourceUuid);
  if (existing) {
    return result(withItemQuantity(loot, existing.id, existing.quantity + sourceQuantity(data)));
  }
  const item = { id, sourceUuid, name: data.name, img: data.img, quantity: sourceQuantity(data), revealed: false, data, linked };
  return result({ ...loot, items: [...loot.items, item] });
}

function setQuantity(loot, { id, quantity }) {
  return result(withItemQuantity(loot, id, toQuantity(quantity)));
}

function setWealth(loot, { wealth }) {
  return result({ ...loot, wealth: toWealth(wealth) });
}

// An empty audience means the whole party; otherwise only the listed characters see the rewards.
export function canAccessLoot(loot, actorIds) {
  if (!loot.open) {
    return false;
  }
  const audience = loot.audience ?? [];
  return audience.length === 0 || actorIds.some((actorId) => audience.includes(actorId));
}

function assertOpen(loot, actorId) {
  if (!canAccessLoot(loot, [actorId])) {
    throw new LocalizedError("SODLTRADE.Errors.LootClosed");
  }
}

function setAudience(loot, { actorIds }) {
  return result({ ...loot, audience: [...new Set(actorIds ?? [])] });
}

function take(loot, { actorId, id, quantity }) {
  assertOpen(loot, actorId);
  const item = findVisibleItem(loot, id);
  const wanted = toQuantity(quantity);
  if (wanted === 0) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  if (wanted > item.quantity) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: item.name });
  }
  const linked = (item.linked ?? []).map((data) => ({ data, quantity: wanted }));
  const taken = grant(actorId, [{ data: item.data, quantity: wanted }, ...linked], emptyWealth());
  return result(withItemQuantity(loot, id, item.quantity - wanted), [taken], "taken");
}

function takeWealth(loot, { actorId, wealth }) {
  assertOpen(loot, actorId);
  const wanted = toWealth(wealth);
  if (isEmptyWealth(wanted)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  if (!coversWealth(visibleWealth(loot), wanted)) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughWealth");
  }
  const remaining = settleWealth(loot.wealth, wanted, emptyWealth());
  return result({ ...loot, wealth: remaining }, [grant(actorId, [], wanted)], "taken");
}

function split(loot, { actorIds }) {
  if (!actorIds?.length) {
    throw new LocalizedError("SODLTRADE.Errors.NoRecipient");
  }
  const { share, remainder } = splitWealth(loot.wealth, actorIds.length);
  if (isEmptyWealth(share)) {
    throw new LocalizedError("SODLTRADE.Errors.NothingToSplit");
  }
  return result({ ...loot, wealth: remainder }, actorIds.map((actorId) => grant(actorId, [], share)), "split");
}

function setOpen(loot, { open }) {
  const isOpen = open === true;
  let event = "closed";
  if (isOpen) {
    event = "opened";
  }
  return result({ ...loot, open: isOpen }, [], event);
}

function setRevealed(loot, { id, revealed }) {
  const item = loot.items.find((entry) => entry.id === id);
  if (!item) {
    throw new LocalizedError("SODLTRADE.Errors.LootGone");
  }
  const next = { ...loot, items: loot.items.map((entry) => {
    if (entry.id === id) {
      return { ...entry, revealed: revealed === true };
    }
    return entry;
  }) };
  if (revealed !== true || item.revealed) {
    return result(next);
  }
  return announce(loot, next, [item], emptyWealth());
}

function setWealthRevealed(loot, { revealed }) {
  const next = { ...loot, wealthRevealed: revealed === true };
  if (revealed !== true || loot.wealthRevealed) {
    return result(next);
  }
  return announce(loot, next, [], loot.wealth);
}

function revealAll(loot) {
  const hidden = loot.items.filter((item) => !item.revealed);
  let wealth = emptyWealth();
  if (!loot.wealthRevealed) {
    wealth = loot.wealth;
  }
  const next = { ...loot, items: loot.items.map((item) => ({ ...item, revealed: true })), wealthRevealed: true };
  return announce(loot, next, hidden, wealth);
}

const GM = "gm";
const OWNER = "owner";

const ACTIONS = {
  add: { role: GM, run: add },
  setQuantity: { role: GM, run: setQuantity },
  setWealth: { role: GM, run: setWealth },
  split: { role: GM, run: split },
  setOpen: { role: GM, run: setOpen },
  setAudience: { role: GM, run: setAudience },
  setRevealed: { role: GM, run: setRevealed },
  setWealthRevealed: { role: GM, run: setWealthRevealed },
  revealAll: { role: GM, run: revealAll },
  take: { role: OWNER, run: take },
  takeWealth: { role: OWNER, run: takeWealth }
};

export function applyLootAction(loot, action, { isGM, ownsActor }) {
  const strategy = ACTIONS[action.type];
  if (!strategy) {
    throw new LocalizedError("SODLTRADE.Errors.UnknownAction");
  }
  if (strategy.role === GM && !isGM) {
    throw new LocalizedError("SODLTRADE.Errors.NotAllowed");
  }
  if (strategy.role === OWNER && !isGM && !ownsActor(action.actorId)) {
    throw new LocalizedError("SODLTRADE.Errors.NotYourCharacter");
  }
  return strategy.run(loot, action);
}
