import { SOCKET_CHANNEL } from "./shared/constants.js";
import { errorMessage, t } from "./shared/foundry-adapter.js";
import { processRequest } from "./trade/trade-store.js";

function reportError(userId, err) {
  if (userId === game.user.id) {
    ui.notifications.warn(errorMessage(err));
    return;
  }
  game.socket.emit(SOCKET_CHANNEL, { type: "error", userId, key: err.message, data: err.data ?? {} });
}

const MESSAGES = {
  request(message) {
    if (game.users.activeGM?.isSelf) {
      processRequest(message.userId, message.request, reportError);
    }
  },
  error(message) {
    if (message.userId === game.user.id) {
      ui.notifications.warn(t(message.key, message.data));
    }
  }
};

export function registerSocket() {
  game.socket.on(SOCKET_CHANNEL, (message) => MESSAGES[message.type]?.(message));
}

export function sendRequest(type, data) {
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications.warn(t("SODLTRADE.Errors.NoGM"));
    return;
  }
  const request = { type, data };
  if (gm.isSelf) {
    processRequest(game.user.id, request, reportError);
    return;
  }
  game.socket.emit(SOCKET_CHANNEL, { type: "request", userId: game.user.id, request });
}

export function sendAction(tradeId, action) {
  sendRequest("act", { tradeId, action });
}
