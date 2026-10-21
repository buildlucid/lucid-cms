import { createRawSnippet, type Snippet } from "svelte";

/** Maps default slots to `children` and named slots to snippet props, preserving each slot's HTML and `<client-slot>` wrapper for hydration. */
export const slotProps = (
	props: Record<string, unknown>,
	slots: Record<string, string>,
) => {
	const snippets: Record<string, Snippet> = {};
	for (const [name, html] of Object.entries(slots)) {
		snippets[name === "default" ? "children" : name] = createRawSnippet(() => ({
			render: () => html,
		}));
	}
	return { ...props, ...snippets };
};
