// Saving a field re-renders the window, which replaces every input: the field the user just clicked
// would lose its focus and need a second click. The focused field is found again by its attributes.

const EDITABLE_TAGS = ["INPUT", "SELECT", "TEXTAREA"];

function focusSelector(element) {
  const attributes = [...element.attributes].filter((attribute) => attribute.name === "name" || attribute.name.startsWith("data-"));
  if (attributes.length === 0) {
    return null;
  }
  return element.tagName.toLowerCase() + attributes.map((attribute) => `[${attribute.name}="${CSS.escape(attribute.value)}"]`).join("");
}

export function captureFocus(root) {
  const active = document.activeElement;
  if (!root || !active || !root.contains(active) || !EDITABLE_TAGS.includes(active.tagName)) {
    return null;
  }
  const selector = focusSelector(active);
  if (!selector) {
    return null;
  }
  return { selector, value: active.value };
}

// The value typed so far is put back too, since it may not have been saved yet.
export function restoreFocus(root, focus) {
  if (!root || !focus) {
    return;
  }
  const element = root.querySelector(focus.selector);
  if (!element) {
    return;
  }
  element.value = focus.value;
  element.focus();
}
