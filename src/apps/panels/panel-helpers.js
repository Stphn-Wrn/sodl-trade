import { t } from "../../shared/foundry-adapter.js";
import { DENOMINATIONS } from "../../trade/wealth.js";

export function wealthRows(wealth) {
  return DENOMINATIONS.map((denomination) => ({ denomination, label: t(`SODLTRADE.Wealth.${denomination}`), value: wealth[denomination] }));
}

export function readWealthInputs(container, attribute) {
  return Object.fromEntries(DENOMINATIONS.map((denomination) => [denomination, container.querySelector(`[${attribute}="${denomination}"]`)?.value ?? 0]));
}
