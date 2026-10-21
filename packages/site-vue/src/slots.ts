import { h } from "vue";

/**
 * A component's props and Vue slots from the template's slots. Each slot keeps its HTML as is inside
 * `<client-slot>`, whose `innerHTML` Vue leaves alone while hydrating.
 */
export const slotProps = (
	props: Record<string, unknown>,
	slots: Record<string, string>,
) => ({
	props,
	slots: Object.fromEntries(
		Object.entries(slots).map(([name, html]) => [
			name,
			() =>
				h("client-slot", { name, style: "display:contents", innerHTML: html }),
		]),
	),
});
