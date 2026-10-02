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
  return Boolean(actor) && actor.type === "character" && actor.hasPlayerOwner;
}

export function openApps(AppClass) {
  return [...foundry.applications.instances.values()].filter((app) => app instanceof AppClass);
}

export function backToTokenControls() {
  setTimeout(() => ui.controls.activate({ control: "tokens" }), 0);
}
