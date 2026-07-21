import constants from "../constants.js";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "../types.js";

const renderImports = (imports: CloudflareWorkerImport[]) => {
	const modules = new Map<
		string,
		{ default?: string; exports: Map<string, string | undefined> }
	>();

	for (const item of imports) {
		const current: {
			default?: string;
			exports: Map<string, string | undefined>;
		} = modules.get(item.path) ?? { exports: new Map() };
		if (item.default) current.default = item.default;
		for (const named of item.exports ?? []) {
			if (typeof named === "string") current.exports.set(named, undefined);
			else current.exports.set(named.name, named.as);
		}
		modules.set(item.path, current);
	}

	return Array.from(modules, ([modulePath, item]) => {
		const specifiers = [
			...(item.default ? [item.default] : []),
			...(item.exports.size
				? [
						`{ ${Array.from(item.exports, ([name, alias]) =>
							alias ? `${name} as ${alias}` : name,
						).join(", ")} }`,
					]
				: []),
		];
		return specifiers.length
			? `import ${specifiers.join(", ")} from ${JSON.stringify(modulePath)};`
			: `import ${JSON.stringify(modulePath)};`;
	});
};

const renderHandler = (handler: CloudflareWorkerExport) =>
	`${handler.async ? "async " : ""}${handler.name}(${handler.params?.join(", ") ?? ""}) { ${handler.content} }`;

/** Creates the Worker entrypoint shared by Astro, Lucid and plugin handlers. */
export const createAstroWorkerSource = (props: {
	runtimeModulePath: string;
	artifacts: Array<{ type: string; custom: unknown }>;
}) => {
	const imports: CloudflareWorkerImport[] = [
		{
			path: "@astrojs/cloudflare/handler",
			exports: [{ name: "handle", as: "astroFetch" }],
		},
		{
			path: "@lucidcms/runtime-cloudflare/astro",
			default: "lucidBridge",
		},
		{
			path: props.runtimeModulePath,
			exports: ["getLucidHost"],
		},
	];
	const handlers: CloudflareWorkerExport[] = [
		{
			name: "fetch",
			async: true,
			params: ["request", "env", "ctx"],
			content: "return astroFetch(request, env, ctx);",
		},
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: `const task = (async () => {
	const { host, state } = await getLucidHost({ runtime: { env, ctx } });
	await lucidBridge.scheduled({ host, controller, state });
})();
ctx.waitUntil(task);`,
		},
	];

	for (const artifact of props.artifacts) {
		if (artifact.type !== constants.WORKER_EXPORT_ARTIFACT_TYPE) continue;
		const custom = artifact.custom as CloudflareWorkerExportArtifact;
		imports.push(...custom.imports);
		handlers.push(...custom.exports);
	}

	return `${renderImports(imports).join("\n")}

const worker = {
	${handlers.map(renderHandler).join(",\n\t")}
};

export default worker;
`;
};
