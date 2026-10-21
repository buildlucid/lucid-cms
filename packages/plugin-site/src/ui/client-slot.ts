import escapeHtml from "../utils/escape-html.js";

/** Wraps slot HTML in `<client-slot>` for hydration in renderers that write HTML, such as Solid and Svelte; other renderers create the element themselves. */
export const clientSlot = (name: string, html: string) =>
	`<client-slot name="${escapeHtml(name)}" style="display:contents">${html}</client-slot>`;

const REGEXP_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

/** Provides slot placeholders unique to each render to prevent escaping or duplication, replacing only its own placeholders and removing `<client-slot>` wrappers when hydration is disabled. */
export const slotPlaceholders = (id: string, slots: Record<string, string>) => {
	const marks = Object.keys(slots).map((name) => ({
		name,
		mark: `<!--client-slot:${id}:${name}-->`,
	}));
	return {
		placeholders: Object.fromEntries(
			marks.map(({ name, mark }) => [name, mark]),
		),
		fill: (html: string, keepWrappers: boolean) =>
			marks.reduce((result, { name, mark }) => {
				const content = slots[name] ?? "";
				if (keepWrappers) return result.replaceAll(mark, () => content);
				const pattern = mark.replace(REGEXP_CHARACTERS, "\\$&");
				return result.replace(
					new RegExp(`<client-slot\\b[^>]*>${pattern}</client-slot>`, "g"),
					() => content,
				);
			}, html),
	};
};
