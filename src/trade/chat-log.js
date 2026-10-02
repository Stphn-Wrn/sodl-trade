import { CHAT_LOOT_SETTING, CHAT_SHOP_SETTING, CHAT_TRADES_SETTING, MODULE_ID, modulePath } from "../shared/constants.js";
import { isPlayerCharacter, renderTemplate, t } from "../shared/foundry-adapter.js";
import { chatDelivery } from "./chat-audience.js";
import { describeOffer } from "./trade-view.js";
import { emptyWealth } from "./wealth.js";

const OPENABLE_EVENTS = ["created", "awaitingApproval", "failed"];
const EVENTS_WITHOUT_OFFERS = ["created", "cancelled"];

function ownersOf(actorIds) {
  return game.users
    .filter((user) => user.isGM || actorIds.some((actorId) => game.actors.get(actorId)?.testUserPermission(user, "OWNER")))
    .map((user) => user.id);
}

// Every message goes through the GM's setting for its kind: trades, rewards or shop.
async function post(setting, card, { actorIds, alias, restricted = false }) {
  const people = { gmIds: game.users.filter((user) => user.isGM).map((user) => user.id), involvedIds: ownersOf(actorIds), restricted };
  const delivery = chatDelivery(game.settings.get(MODULE_ID, setting), people);
  if (!delivery) {
    return;
  }
  const content = await renderTemplate(modulePath("src/trade/chat-card.html"), card);
  await ChatMessage.create({ content, speaker: { alias }, ...delivery });
}

export function postTradeEvent(event, trade, data = {}) {
  const [first, second] = trade.parties;
  return post(CHAT_TRADES_SETTING, {
    event,
    text: t(`SODLTRADE.Chat.${event}`, { first: first.name, second: second.name, ...data }),
    showOffers: !EVENTS_WITHOUT_OFFERS.includes(event),
    offers: trade.parties.map((party) => ({ label: t("SODLTRADE.Chat.Gives", { name: party.name }), summary: describeOffer(party.offer, t) })),
    canOpen: OPENABLE_EVENTS.includes(event),
    tradeId: trade.id
  }, { actorIds: trade.parties.map((party) => party.actorId), alias: t("SODLTRADE.Title") });
}

function grantSummary(grant) {
  const items = grant.items.map((entry) => ({ name: entry.data.name, quantity: entry.quantity }));
  return describeOffer({ items, wealth: grant.wealth }, t);
}

const LOOT_MESSAGES = {
  opened: () => ({
    text: t("SODLTRADE.Chat.opened"),
    showOffers: false,
    openLoot: true
  }),
  revealed: (grants, names, revealed) => ({
    text: t("SODLTRADE.Chat.revealed", { treasure: describeOffer(revealed, t) }),
    showOffers: false,
    openLoot: true
  }),
  taken: (grants, names) => ({
    text: t("SODLTRADE.Chat.taken", { name: names[0] }),
    offers: [{ label: t("SODLTRADE.Chat.Receives", { name: names[0] }), summary: grantSummary(grants[0]) }]
  }),
  split: (grants, names) => ({
    text: t("SODLTRADE.Chat.split", { names: names.join(", ") }),
    offers: [{ label: t("SODLTRADE.Chat.Share"), summary: grantSummary(grants[0]) }]
  })
};

// Rewards kept for some characters are never shown to the others, whatever the setting.
export async function postLootEvent(event, grants, revealed, audience) {
  const buildMessage = LOOT_MESSAGES[event];
  if (!buildMessage) {
    return;
  }
  const restricted = (audience ?? []).length > 0;
  let actorIds = game.actors.filter(isPlayerCharacter).map((actor) => actor.id);
  if (restricted) {
    actorIds = audience;
  }
  const names = grants.map((grant) => game.actors.get(grant.actorId).name);
  await post(CHAT_LOOT_SETTING, { event, showOffers: true, canOpen: false, ...buildMessage(grants, names, revealed) }, { actorIds, alias: t("SODLTRADE.Loot.Title"), restricted });
}

function describeUnits(name, units) {
  return describeOffer({ items: [{ name, quantity: units }], wealth: emptyWealth() }, t);
}

function describeCost(cost) {
  return describeOffer({ items: [], wealth: cost }, t);
}

export function postOrderEvent(event, order) {
  const actor = game.actors.get(order.actorId);
  const text = t(`SODLTRADE.Chat.order.${event}`, { name: actor?.name ?? "", item: describeUnits(order.name, order.units), cost: describeCost(order.cost) });
  return post(CHAT_SHOP_SETTING, { event: `order-${event}`, text, showOffers: false, canOpen: false, openShop: event === "ordered" }, { actorIds: [order.actorId], alias: t("SODLTRADE.Shop.Title") });
}

export function postPurchaseEvent(actor, purchase) {
  const text = t("SODLTRADE.Chat.bought", { name: actor.name, item: describeUnits(purchase.name, purchase.units), cost: describeCost(purchase.cost) });
  return post(CHAT_SHOP_SETTING, { event: "bought", text, showOffers: false, canOpen: false }, { actorIds: [actor.id], alias: t("SODLTRADE.Shop.Title") });
}
