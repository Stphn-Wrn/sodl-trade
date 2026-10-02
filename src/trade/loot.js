import { LocalizedError } from "../shared/i18n.js";
import { TRADABLE_TYPES, sourceQuantity } from "./inventory.js";
import { coversWealth, emptyWealth, fromBits, isEmptyWealth, settleWealth, toBits, toWealth } from "./wealth.js";

export function emptyLoot() {
  return { items: [], wealth: emptyWealth() };
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

function result(loot, grants = [], event = null) {
  return { loot, grants, event };
}

function grant(actorId, items, wealth) {
  return { actorId, items, wealth };
}

function add(loot, { id, sourceUuid, data }) {
  if (!TRADABLE_TYPES.includes(data.type)) {
    throw new LocalizedError("SODLTRADE.Errors.NotLootable", { name: data.name });
  }
  const existing = loot.items.find((item) => item.sourceUuid === sourceUuid);
  if (existing) {
    return result(withItemQuantity(loot, existing.id, existing.quantity + sourceQuantity(data)));
  }
  const item = { id, sourceUuid, name: data.name, img: data.img, quantity: sourceQuantity(data), data };
  return result({ ...loot, items: [...loot.items, item] });
}

function setQuantity(loot, { id, quantity }) {
  return result(withItemQuantity(loot, id, toQuantity(quantity)));
}

function setWealth(loot, { wealth }) {
  return result({ ...loot, wealth: toWealth(wealth) });
}

function take(loot, { actorId, id, quantity }) {
  const item = loot.items.find((entry) => entry.id === id);
  if (!item) {
    throw new LocalizedError("SODLTRADE.Errors.LootGone");
  }
  const wanted = toQuantity(quantity);
  if (wanted === 0) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  if (wanted > item.quantity) {
    throw new LocalizedError("SODLTRADE.Errors.NotEnoughItems", { name: item.name });
  }
  const taken = grant(actorId, [{ data: item.data, quantity: wanted }], emptyWealth());
  return result(withItemQuantity(loot, id, item.quantity - wanted), [taken], "taken");
}

function takeWealth(loot, { actorId, wealth }) {
  const wanted = toWealth(wealth);
  if (isEmptyWealth(wanted)) {
    throw new LocalizedError("SODLTRADE.Errors.InvalidQuantity");
  }
  if (!coversWealth(loot.wealth, wanted)) {
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

const GM = "gm";
const OWNER = "owner";

const ACTIONS = {
  add: { role: GM, run: add },
  setQuantity: { role: GM, run: setQuantity },
  setWealth: { role: GM, run: setWealth },
  split: { role: GM, run: split },
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
