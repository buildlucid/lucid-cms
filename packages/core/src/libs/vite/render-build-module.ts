import { normalizePath } from "vite";
import type { LogLevel } from "../logger/types.js";
import type { ResourceFile } from "../resources/types.js";
import type { LucidViteProject } from "./types.js";

const importPath = (file: string) => JSON.stringify(normalizePath(file));

/** Renders `lucid:build` from project config and optional admin HTML, adding development tasks, runtime logs honoring `logLevel`, inline command queues and plugin module HMR without server restarts. */
const renderBuildModule = (props: {
	project: LucidViteProject;
	/** Plugins' server modules, which reach their runtime code as `pluginModules`. */
	pluginModules: Array<{ key: string; module: string }>;
	/** The admin's HTML document, for servers that serve it themselves rather than as a static file. */
	adminHtml?: string;
	dev?: { token: string; logLevel?: LogLevel; taskServer?: boolean };
}) => {
	const { project, dev } = props;
	const json = JSON.stringify;
	const hasEnvSchema = project.envSchema !== undefined;

	const meta = [
		`emailTemplates: ${json(project.emailTemplates)}`,
		...(dev ? ['admin: "development"'] : []),
	];
	const host = [
		"definition",
		`envSchema: ${hasEnvSchema ? "env" : "undefined"}`,
		`translationBundles: ${json(project.translationStore.bundles)}`,
		`meta: { ${meta.join(", ")} }`,
		...(dev
			? [
					`logger: { transport: import.meta.hot ? createHotLogTransport(import.meta.hot) : undefined, level: ${json(dev.logLevel)} }`,
				]
			: []),
		...(dev?.taskServer
			? ["adapterOverrides: { queue: inlineQueueAdapter() }"]
			: []),
	];

	const members = [`host: { ${host.join(", ")} }`, "pluginModules"];
	if (dev) {
		const modules = (files: ResourceFile[]) =>
			`[${files
				.map(
					(file) =>
						`{ path: ${json(file.path)}, load: () => import(${importPath(file.path)}) }`,
				)
				.join(", ")}]`;

		members.push(
			`dev: { token: ${json(dev.token)}, migrations: ${modules(project.resources.files.migrations)}, seeds: ${modules(project.resources.files.seeds)} }`,
		);
	}

	if (props.adminHtml !== undefined) {
		members.push(`admin: { html: ${json(props.adminHtml)} }`);
	}

	const lines = [
		`import definition${hasEnvSchema ? ", { env }" : ""} from ${importPath(project.configPath)};`,
		...(dev
			? [
					`import { ${dev.taskServer ? "createHotLogTransport, inlineQueueAdapter" : "createHotLogTransport"} } from "@lucidcms/core/runtime";`,
				]
			: []),
		...props.pluginModules.map(
			({ module }, index) =>
				`import * as pluginModule${index} from ${json(module)};`,
		),
		"",
		`const pluginModules = { ${props.pluginModules
			.map(({ key }, index) => `${json(key)}: pluginModule${index}`)
			.join(", ")} };`,
		"",
		`export default {\n\t${members.join(",\n\t")},\n};`,
	];
	if (dev && props.pluginModules.length > 0) {
		lines.push(
			"",
			"if (import.meta.hot) {",
			`\timport.meta.hot.accept(${json(props.pluginModules.map(({ module }) => module))}, (updated) => {`,
			`\t\tconst keys = ${json(props.pluginModules.map(({ key }) => key))};`,
			"\t\tupdated.forEach((module, index) => {",
			"\t\t\tif (module) pluginModules[keys[index]] = module;",
			"\t\t});",
			"\t});",
			"}",
		);
	}

	return `${lines.join("\n")}\n`;
};

export default renderBuildModule;
