// The roll goes through the system, so it shows in the chat with the character's own boons and banes.
// Returns null when the check asks for no roll.
export async function rollChallenge(actor, check) {
  if (!check.rolls) {
    return null;
  }
  const attribute = { ...actor.getAttribute(check.attribute), key: check.attribute };
  const roll = await actor.rollAttributeChallenge(attribute, check.boons, 0);
  return roll.total;
}
