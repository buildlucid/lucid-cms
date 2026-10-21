/** Provides UI integration APIs such as `@lucidcms/site-react` without other plugin code, with server imports permitted and browser imports restricted to types such as `UiHydrate`. */
import type { UiIntegration, UiRenderer, UiVite } from "./types.js";

export { clientSlot } from "./client-slot.js";
export type {
	UiClient,
	UiFilter,
	UiHydrate,
	UiHydrateContext,
	UiIntegration,
	UiRenderContext,
	UiRendered,
	UiRenderer,
	UiVite,
} from "./types.js";

/** Describes a UI library for the site plugin's `ui` option. */
export const defineUiIntegration = (integration: UiIntegration) => integration;

/** Gives an integration's Vite plugins: the default export of its `vite` module, typed by the plugins' own type. */
export const defineUiVite = <Plugin>(vite: UiVite<Plugin>): UiVite<Plugin> =>
	vite;

/** Renders a library's components on the server: the default export of an integration's `server` module. */
export const defineUiRenderer = <Component>(
	renderer: UiRenderer<Component>,
): UiRenderer<Component> => renderer;
