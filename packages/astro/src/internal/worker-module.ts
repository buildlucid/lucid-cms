import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "@lucidcms/cloudflare-adapter/types";
import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import astroConstants from "../constants.js";

const mergeWorkerImports = (importsInput: CloudflareWorkerImport[]) => {
	const importTracker = new Map<
		string,
		{
			default?: string;
			exports: Map<string, string | undefined>;
		}
	>();

	for (const imp of importsInput) {
		const existing = importTracker.get(imp.path) || {
			exports: new Map<string, string | undefined>(),
		};

		if (imp.default) {
			existing.default = imp.default;
		}

		if (imp.exports) {
			for (const namedExport of imp.exports) {
				if (typeof namedExport === "string") {
					existing.exports.set(namedExport, undefined);
					continue;
				}

				existing.exports.set(namedExport.name, namedExport.as);
			}
		}

		importTracker.set(imp.path, existing);
	}

	const imports: string[] = [];
	for (const [importPath, data] of importTracker) {
		const parts: string[] = [];
		if (data.default) {
			parts.push(data.default);
		}
		if (data.exports.size > 0) {
			const namedImports = Array.from(data.exports.entries()).map(
				([name, alias]) => (alias ? `${name} as ${alias}` : name),
			);
			parts.push(`{ ${namedImports.join(", ")} }`);
		}

		imports.push(
			parts.length > 0
				? `import ${parts.join(", ")} from ${JSON.stringify(importPath)};`
				: `import ${JSON.stringify(importPath)};`,
		);
	}

	return imports;
};

const renderWorkerHandlers = (
	exportsInput: CloudflareWorkerExport[],
): string[] =>
	exportsInput.map((exp) => {
		const asyncKeyword = exp.async ? "async " : "";
		const params = exp.params?.join(", ") ?? "";
		return `${asyncKeyword}${exp.name}(${params}) { ${exp.content} }`;
	});

/**
 * Cloudflare plugin artifacts all target the same worker module shape, so this
 * keeps the source layout consistent across the merged worker Lucid emits.
 */
export const buildCloudflareWorkerModule = (props: {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
	includeAstroHandler?: boolean;
}): string => {
	const importLines = mergeWorkerImports(props.imports);
	const handlerLines = renderWorkerHandlers(props.exports);

	if (props.includeAstroHandler) {
		importLines.unshift(
			'import astroWorker from "@astrojs/cloudflare/entrypoints/server";',
		);
	}

	const workerProperties = [
		...(props.includeAstroHandler ? ["...astroWorker"] : []),
		...handlerLines,
	];

	return `${importLines.join("\n")}

const worker = {
	${workerProperties.join(",\n\t")}
};

export default worker;
`;
};

/**
 * The main worker is where Astro handles requests, so Lucid only layers in the
 * runtime hooks it cannot get from Astro's default Cloudflare entrypoint.
 */
export const buildCloudflareMainWorkerSource = (props: {
	configImportPath: string;
	databaseAdapterImportPath: string;
	customArtifacts: RuntimeBuildArtifactCustom[];
}): string => {
	const configImportPath = props.configImportPath.startsWith(".")
		? props.configImportPath
		: `./${props.configImportPath}`;
	const imports: CloudflareWorkerImport[] = [
		{
			path: "@lucidcms/core/runtime",
			exports: [
				"createConfiguredDatabaseAdapter",
				"processConfig",
				"setupCronJobs",
			],
		},
		{
			path: props.databaseAdapterImportPath,
			default: "ConfiguredDatabaseAdapter",
		},
		{
			path: astroConstants.integration.configureLucidModuleId,
			default: "astroConfigureLucid",
		},
		{
			path: "@lucidcms/core/kv",
			exports: ["destroyKVAdapter", "getInitializedKVAdapter"],
		},
		{
			path: `./${astroConstants.files.emailTemplatesJson}`,
			default: "emailTemplates",
		},
	];
	const exports: CloudflareWorkerExport[] = [
		{
			name: "fetch",
			async: true,
			params: ["request", "env", "ctx"],
			content: `// Astro owns the main request handler, so we stash the bindings where the generated Lucid route can read them.
globalThis[${JSON.stringify(astroConstants.cloudflare.runtimeEnvGlobal)}] = env;
return astroWorker.fetch(request, env, ctx);`,
		},
		{
			name: "scheduled",
			async: true,
			params: ["controller", "env", "ctx"],
			content: `const runCronService = async () => {
	const [{ default: configDefinition, env: envSchema }] = await Promise.all([
		import(${JSON.stringify(configImportPath)}),
	]);

	if (envSchema) {
		envSchema.parse(env);
	}

	const wrappedDefinition = astroConfigureLucid(configDefinition, {
		emailTemplates,
	});
	const databaseAdapter = createConfiguredDatabaseAdapter(
		ConfiguredDatabaseAdapter,
		wrappedDefinition.database,
		env,
	);
	const resolvedConfig = await processConfig(wrappedDefinition.config(env), {
		bypassCache: true,
		recipe: wrappedDefinition.recipe,
		resolvedDb: databaseAdapter,
		skipValidation: true,
	});
		const kv = await getInitializedKVAdapter(resolvedConfig);

		try {
			const cronJobSetup = await setupCronJobs({
				createQueue: true,
			});
			await cronJobSetup.register({
				config: resolvedConfig,
				db: { client: resolvedConfig.db.client },
				queue: cronJobSetup.queue,
				env,
				kv,
				requestUrl: "",
			});
		} finally {
			await Promise.allSettled([
				destroyKVAdapter(kv),
				resolvedConfig.db.client.destroy(),
			]);
		}
	};

ctx.waitUntil(runCronService());`,
		},
	];

	for (const artifact of props.customArtifacts) {
		if (artifact.type !== astroConstants.workerArtifacts.exportType) {
			continue;
		}

		const custom = artifact.custom as CloudflareWorkerExportArtifact;
		imports.push(...custom.imports);
		exports.push(...custom.exports);
	}

	return buildCloudflareWorkerModule({
		imports,
		exports,
		includeAstroHandler: true,
	});
};
