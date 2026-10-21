import type { Loader } from "@lucidkiln/core";
import createUiComponent from "./create-ui-component.js";
import type { SiteUi } from "./site-ui.js";

/** A loader that returns UI components as host components, and asks `loader` for everything else. */
const withUi = (loader: Loader, ui: SiteUi): Loader => ({
	list: loader.list?.bind(loader),
	load: (name) => {
		const component = ui.find(name);
		return component
			? createUiComponent(name, component, ui.script)
			: loader.load(name);
	},
});

export default withUi;
