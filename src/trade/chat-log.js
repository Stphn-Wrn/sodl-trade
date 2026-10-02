import { modulePath } from "../shared/constants.js";
import { renderTemplate, t } from "../shared/foundry-adapter.js";
import { describeOffer } from "./trade-view.js";

const OPENABLE_EVENTS = ["created", "awaitingApproval", "failed"];
const EVENTS_WITHOUT_OFFERS = ["created", "cancelled"];

function recipients(trade) {
  return game.users
    .filter((user) => user.isGM || trade.parties.some((party) => game.actors.get(party.actorId)?.testUserPermission(user, "OWNER")))
    .map((user) => user.id);
}

export async function postTradeEvent(event, trade, data = {}) {
  const [first, second] = trade.parties;
  const content = await renderTemplate(modulePath("src/trade/chat-card.html"), {
    event,
    text: t(`SODLTRADE.Chat.${event}`, { first: first.name, second: second.name, ...data }),
    showOffers: !EVENTS_WITHOUT_OFFERS.includes(event),
    offers: trade.parties.map((party) => ({ label: t("SODLTRADE.Chat.Gives", { name: party.name }), summary: describeOffer(party.offer, t) })),
    canOpen: OPENABLE_EVENTS.includes(event),
    tradeId: trade.id
  });
  await ChatMessage.create({ content, whisper: recipients(trade), speaker: { alias: t("SODLTRADE.Title") } });
}
