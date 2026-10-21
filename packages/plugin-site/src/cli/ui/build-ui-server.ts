import path from "node:path";
import type { PluginOption } from "vite";
import type { ResolvedIntegrations } from "./resolve-integrations.js";

const ENTRY = "\0lucid:ui-server";
const ENTRY_FILE = "ui-server.js";

/** The entry's source: a loader for each component and each renderer, so a render only loads what it uses. */
const entrySource = (
	root: string,
	components: string[],
	integrations: ResolvedIntegrations,
) => {
	const used = new Set(
		components.flatMap((name) => integrations.match(name)?.name ?? []),
	);
	const loaders = (entries: [string, string][]) =>
		entries
			.map(
				([key, id]) =>
					`\t${JSON.stringify(key)}: () => import(${JSON.stringify(id)}),`,
			)
			.join("\n");
	return [
		`export const components = {\n${loaders(components.map((name) => [name, path.resolve(root, name)]))}\n};`,
		`export const renderers = {\n${loaders(
			integrations.list
				.filter((integration) => used.has(integration.name))
				.map((integration) => [integration.name, integration.server]),
		)}\n};`,
	].join("\n");
};

/** Bundles named UI components and renderers into a server module in `outDir`, leaving library imports for the server build so both share one copy. */
const buildUiServer = async (props: {
	vite: typeof import("vite");
	options: import("vite").InlineConfig;
	root: string;
	outDir: string;
	components: string[];
	integrations: ResolvedIntegrations;
	plugins: PluginOption[];
}) => {
	await props.vite.build({
		...props.options,
		mode: "production",
		logLevel: "warn",
		ssr: { noExternal: props.integrations.packages },
		build: {
			ssr: true,
			outDir: props.outDir,
			emptyOutDir: true,
			copyPublicDir: false,
			rolldownOptions: {
				input: ENTRY,
				output: { entryFileNames: ENTRY_FILE, format: "esm" },
			},
		},
		plugins: [
			...props.plugins,
			{
				name: "lucid:ui-server",
				resolveId: (id) => (id === ENTRY ? id : undefined),
				load: (id) =>
					id === ENTRY
						? entrySource(props.root, props.components, props.integrations)
						: undefined,
			},
		],
	});
	return path.join(props.outDir, ENTRY_FILE);
};

export default buildUiServer;
