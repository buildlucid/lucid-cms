import type { SiteData } from "../../types.js";

/** Generates `pluginModules` exports for browser assets, templates, UI components and renderers, with template globs detecting additions/removals and modules accepting source edits without server restarts. */
const renderSiteModule = (props: {
	data: SiteData;
	/** The site directory as a path from the Vite root, such as `/site/`. */
	base: string;
	/** Imports each template's source, such as `?lucid-site-template`. */
	templateQuery: string;
	/** Components by resolved name, with their integration. */
	components: Array<{ name: string; integration: string }>;
	/** Server renderer modules by integration name. */
	renderers: Array<{ name: string; server: string }>;
	/** Development component globs that reload the module when files are added. */
	componentGlobs?: string[];
}) => {
	const json = JSON.stringify;
	return [
		`export const data = ${json(props.data)};`,
		`const templateFiles = import.meta.glob(${json(`${props.base}**/*.kiln`)}, { query: ${json(props.templateQuery)}, import: "default" });`,
		`export const templates = Object.fromEntries(Object.entries(templateFiles).map(([file, load]) => [file.slice(${props.base.length}), load]));`,
		...(props.componentGlobs
			? [`import.meta.glob(${json(props.componentGlobs)});`]
			: []),
		`export const components = {\n${props.components
			.map(
				({ name, integration }) =>
					`\t${json(name)}: { integration: ${json(integration)}, load: () => import(${json(props.base + name)}) },`,
			)
			.join("\n")}\n};`,
		`export const renderers = {\n${props.renderers
			.map(
				({ name, server }) => `\t${json(name)}: () => import(${json(server)}),`,
			)
			.join("\n")}\n};`,
	].join("\n");
};

export default renderSiteModule;
