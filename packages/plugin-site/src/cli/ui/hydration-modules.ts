import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PREFIX = "/@client-component/";
// A path segment, not an extension, so plugins for `.vue` or `.svelte` files leave the module alone.
const SUFFIX = "/hydrate.js";

/** Vite's id for the `<client-component>` element's script. */
export const ELEMENT_ID = "/@client-component-element";

/** Vite's id for a UI component's hydration module, which imports the component and its integration's `client`. */
export const hydrationId = (name: string) => PREFIX + name + SUFFIX;

/** The resolved name of the UI component a hydration module is for, or null for any other id. */
export const hydrationName = (id: string | null) =>
	id?.startsWith(PREFIX) && id.endsWith(SUFFIX)
		? id.slice(PREFIX.length, -SUFFIX.length)
		: null;

/** The element's built script, which builds copy as is and development serves through Vite. */
export const readElementScript = () =>
	readFile(
		fileURLToPath(
			import.meta.resolve("@lucidcms/plugin-site/client/component.js"),
		),
		"utf8",
	);
