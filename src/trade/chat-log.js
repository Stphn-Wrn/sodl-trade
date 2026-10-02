import { modulePath } from "../shared/constants.js";
import { renderTemplate, t } from "../shared/foundry-adapter.js";
import { describeOffer } from "./trade-view.js";

const OPENABLE_EVENTS = ["created", "awaitingApproval", "failed"];
const EVENTS_WITHOUT_OFFERS = ["created", "cancelled"];

function ownersOf(actorIds) {
  return game.users
    .filter((user) => user.isGM || actorIds.some((actorId) => game.actors.get(actorId)?.testUserPermission(user, "OWNER")))
    .map((user) => user.id);
}

async function postCard(card, actorIds) {
  const content = await renderTemplate(modulePath("src/trade/chat-card.html"), card);
  await ChatMessage.create({ content, whisper: ownersOf(actorIds), speaker: { alias: t("SODLTRADE.Title") } });
}

export function postTradeEvent(event, trade, data = {}) {
  const [first, second] = trade.parties;
  return postCard({
    event,
    text: t(`SODLTRADE.Chat.${event}`, { first: first.name, second: second.name, ...data }),
    showOffers: !EVENTS_WITHOUT_OFFERS.includes(event),
    offers: trade.parties.map((party) => ({ label: t("SODLTRADE.Chat.Gives", { name: party.name }), summary: describeOffer(party.offer, t) })),
    canOpen: OPENABLE_EVENTS.includes(event),
    tradeId: trade.id
  }, trade.parties.map((party) => party.actorId));
}

function grantSummary(grant) {
  const items = grant.items.map((entry) => ({ name: entry.data.name, quantity: entry.quantity }));
  return describeOffer({ items, wealth: grant.wealth }, t);
}

const LOOT_MESSAGES = {
  taken: (grants, names) => ({
    text: t("SODLTRADE.Chat.taken", { name: names[0] }),
    offers: [{ label: t("SODLTRADE.Chat.Receives", { name: names[0] }), summary: grantSummary(grants[0]) }]
  }),
  split: (grants, names) => ({
    text: t("SODLTRADE.Chat.split", { names: names.join(", ") }),
    offers: [{ label: t("SODLTRADE.Chat.Share"), summary: grantSummary(grants[0]) }]
  })
};

// Loot is shared by the whole group, so its messages are public.
export async function postLootEvent(event, grants) {
  const names = grants.map((grant) => game.actors.get(grant.actorId).name);
  const message = LOOT_MESSAGES[event](grants, names);
  const content = await renderTemplate(modulePath("src/trade/chat-card.html"), { event, ...message, showOffers: true, canOpen: false });
  await ChatMessage.create({ content, speaker: { alias: t("SODLTRADE.Loot.Title") } });
}

export async function postPurchaseEvent(actor, purchase) {
  const item = describeOffer({ items: [{ name: purchase.name, quantity: purchase.units }], wealth: { gc: 0, ss: 0, cp: 0, bits: 0 } }, t);
  const text = t("SODLTRADE.Chat.bought", { name: actor.name, item, cost: describeOffer({ items: [], wealth: purchase.cost }, t) });
  const content = await renderTemplate(modulePath("src/trade/chat-card.html"), { event: "bought", text, showOffers: false, canOpen: false });
  await ChatMessage.create({ content, speaker: { alias: t("SODLTRADE.Shop.Title") } });
}
