import type { UiRenderer } from "./types.js";

/** The browser files a UI component needs: its hydration module, the modules that one imports, and its stylesheets. */
export type UiAssets = {
	/** URL of the module that hydrates it. */
	src: string;
	/** URLs of the modules `src` imports, to preload for components that hydrate on load. */
	preload: string[];
	/** URLs of its stylesheets. */
	css: string[];
};

/** One UI component, as the runtime renders it. */
export type SiteUiComponent = {
	/** Loads a component and renderer, recording instances without hydration during development because editing them requires a page reload. */
	load: (instance: {
		hydrate: boolean;
	}) => Promise<{ component: unknown; renderer: UiRenderer }>;
	/** Its browser files, once loaded. */
	assets: () => UiAssets;
};

/** Finds the UI components templates name, from Vite's dev server in development or the build otherwise. */
export type SiteUi = {
	/** The component for a resolved template name, or null when the name is a template. */
	find: (name: string) => SiteUiComponent | null;
	/** URL of the `<client-component>` element's script. */
	script: string;
};

/** What the build records for the UI components templates name. */
export type BuiltUi = {
	/** URL of the `<client-component>` element's script. */
	script: string;
	/** Each component's browser files and the integration that renders it, by resolved name. */
	components: Record<string, UiAssets & { integration: string }>;
	/** The text of components' small stylesheets, by URL, which pages rendered in one go write inline. */
	styles: Record<string, string>;
};

/** The exports of the server module the build writes, which the runtime reads as `runtimeContext.pluginModules`. */
export type UiServerModule = {
	components: Record<string, () => Promise<{ default: unknown }>>;
	renderers: Record<string, () => Promise<{ default: UiRenderer }>>;
};

const isServerModule = (value: unknown): value is UiServerModule =>
	typeof value === "object" &&
	value !== null &&
	"components" in value &&
	"renderers" in value;

/** The UI components a build recorded, loaded from the server module it wrote. */
export const createBuiltUi = (built: BuiltUi, module: unknown): SiteUi => {
	if (!isServerModule(module)) {
		throw new Error(
			"The site's UI components weren't bundled with the server. Run lucidcms build again.",
		);
	}
	return {
		script: built.script,
		find: (name) => {
			const assets = built.components[name];
			const loadComponent = module.components[name];
			const loadRenderer = module.renderers[assets?.integration ?? ""];
			if (!assets || !loadComponent || !loadRenderer) return null;
			return {
				load: async () => {
					const [component, renderer] = await Promise.all([
						loadComponent(),
						loadRenderer(),
					]);
					return { component: component.default, renderer: renderer.default };
				},
				assets: () => assets,
			};
		},
	};
};
