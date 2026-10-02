import { readFileSync } from "node:fs";
import { createTranslator } from "../../src/shared/i18n.js";

const french = JSON.parse(readFileSync(new URL("../../lang/fr.json", import.meta.url), "utf8"));

export const t = createTranslator(french);
