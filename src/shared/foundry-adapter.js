import { isPartyCharacter } from "../trade/inventory.js";

export function t(key, data) {
  if (data) {
    return game.i18n.format(key, data);
  }
  return game.i18n.localize(key);
}

export function errorMessage(err) {
  return t(err.message, err.data);
}

export function renderTemplate(path, data) {
  return foundry.applications.handlebars.renderTemplate(path, data);
}

export function ownsActor(user) {
  return (actorId) => Boolean(game.actors.get(actorId)?.testUserPermission(user, "OWNER"));
}

export function isPlayerCharacter(actor) {
  if (!actor) {
    return false;
  }
  const players = game.users.players;
  const assignedIds = players.map((user) => user.character?.id).filter(Boolean);
  return isPartyCharacter(actor, players.map((user) => user.id), assignedIds);
}

export function ownedCharacterIds(user = game.user) {
  return game.actors.filter(isPlayerCharacter).filter((actor) => actor.testUserPermission(user, "OWNER")).map((actor) => actor.id);
}

export function openApps(AppClass) {
  return [...foundry.applications.instances.values()].filter((app) => app instanceof AppClass);
}

export function backToTokenControls() {
  setTimeout(() => ui.controls.activate({ control: "tokens" }), 0);
}
