import type { SiteData, SiteModule } from "../types.js";
import {
	COMPONENT_STYLES_PATH,
	ELEMENT_ID,
	hydrationId,
} from "./hydration-ids.js";
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
	/** Loads the component and its integration's renderer. */
	load: () => Promise<{ component: unknown; renderer: UiRenderer }>;
	assets: () => UiAssets;
};

/** Finds the UI components templates name. */
export type SiteUi = {
	/** The component for a resolved template name, or null when the name is a template. */
	find: (name: string) => SiteUiComponent | null;
	/** URL of the `<client-component>` element's script. */
	script: string;
};

/** What the client build records for the UI components templates name. */
export type BuiltUi = {
	/** URL of the `<client-component>` element's script. */
	script: string;
	/** Each component's browser files, by resolved name. */
	components: Record<string, UiAssets>;
	/** The text of components' small stylesheets, by URL, which pages rendered in one go write inline. */
	styles: Record<string, string>;
};

/** Loads UI components through the server module, using recorded client build assets or Vite development modules and requested stylesheets, or returns null without components. */
const createSiteUi = (module: SiteModule, data: SiteData): SiteUi | null => {
	const built = data.kind === "build" ? data.ui : null;
	if (
		data.kind === "build" ? !built : Object.keys(module.components).length === 0
	) {
		return null;
	}

	return {
		script: built?.script ?? ELEMENT_ID,
		find: (name) => {
			const component = module.components[name];
			const loadRenderer = module.renderers[component?.integration ?? ""];
			const assets = built
				? built.components[name]
				: {
						src: hydrationId(name),
						// Vite serves modules one by one, so there is nothing to preload.
						preload: [],
						css: [COMPONENT_STYLES_PATH + name],
					};
			if (!component || !loadRenderer || !assets) return null;

			return {
				load: async () => {
					const [loaded, renderer] = await Promise.all([
						component.load(),
						loadRenderer(),
					]);
					return { component: loaded.default, renderer: renderer.default };
				},
				assets: () => assets,
			};
		},
	};
};

export default createSiteUi;
