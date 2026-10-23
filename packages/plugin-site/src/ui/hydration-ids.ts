/*
 * The ids Vite serves UI components' browser modules under, shared by the CLI's Vite plugin and runtime code.
 */

const PREFIX = "/@client-component/";
// A path segment, not an extension, so plugins for `.vue` or `.svelte` files leave the module alone.
const SUFFIX = "/hydrate.js";

/** Vite's id for the `<client-component>` element's script. */
export const ELEMENT_ID = "/@client-component-element";

/** The development URL prefix for a UI component's stylesheets, followed by its resolved name. */
export const COMPONENT_STYLES_PATH = "/@client-component-styles/";

/** Matches `ELEMENT_ID` and every hydration module id, for Vite hook filters, kept in step with `PREFIX`, `SUFFIX` and `ELEMENT_ID`. */
export const CLIENT_COMPONENT_ID_PATTERN =
	/^\/@client-component(-element|\/.+\/hydrate\.js)$/;

/** Vite's id for a UI component's hydration module, which imports the component and its integration's `client`. */
export const hydrationId = (name: string) => PREFIX + name + SUFFIX;

/** The resolved name of the UI component a hydration module is for, or null for any other id. */
export const hydrationName = (id: string | null) =>
	id?.startsWith(PREFIX) && id.endsWith(SUFFIX)
		? id.slice(PREFIX.length, -SUFFIX.length)
		: null;
