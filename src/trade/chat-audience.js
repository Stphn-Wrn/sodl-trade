export const CHAT_MODES = ["off", "gm", "involved", "everyone"];

// Who sees a chat message, depending on the GM's setting for that kind of message:
// null means no message, an empty object a public one, and a whisper list a private one.
const DELIVERIES = {
  off: () => null,
  gm: ({ gmIds }) => ({ whisper: gmIds }),
  involved: ({ involvedIds }) => ({ whisper: involvedIds }),
  everyone: ({ involvedIds, restricted }) => {
    if (restricted) {
      return { whisper: involvedIds };
    }
    return {};
  }
};

export function chatDelivery(mode, people) {
  const delivery = DELIVERIES[mode] ?? DELIVERIES.involved;
  return delivery(people);
}
