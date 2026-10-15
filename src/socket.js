import { CRAFT_APPROVAL_SETTING, MODULE_ID, SOCKET_CHANNEL } from "./shared/constants.js";
import { needsApproval, runsOnOwnClient } from "./shared/features.js";
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
  const request = { type, data };
  // What only touches the player's own character is done on their client, GM or not,
  // unless the GM has to approve it first.
  const approval = needsApproval(request, { isGM: game.user.isGM, requireApproval: game.settings.get(MODULE_ID, CRAFT_APPROVAL_SETTING) });
  if (runsOnOwnClient(type) && !approval) {
    processRequest(game.user.id, request, reportError);
    return;
  }
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications.warn(t("SODLTRADE.Errors.NoGM"));
    return;
  }
  if (gm.isSelf) {
    processRequest(game.user.id, request, reportError);
    return;
  }
  game.socket.emit(SOCKET_CHANNEL, { type: "request", userId: game.user.id, request });
}

export function sendAction(tradeId, action) {
  sendRequest("act", { tradeId, action });
}
