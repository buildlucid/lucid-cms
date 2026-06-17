import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import type {
	CloudflareWorkerExport,
	CloudflareWorkerExportArtifact,
	CloudflareWorkerImport,
} from "@lucidcms/runtime-cloudflare/types";
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
	configArtifacts: {
		config: string;
		env: string;
		db: string;
		runtime: string;
	};
	customArtifacts: RuntimeBuildArtifactCustom[];
}): string => {
	const imports: CloudflareWorkerImport[] = [
		{
			path: props.configArtifacts.config,
			default: "configFactory",
		},
		{
			path: props.configArtifacts.env,
			exports: [{ name: "env", as: "envSchema" }],
		},
		{
			path: props.configArtifacts.db,
			default: "db",
		},
		{
			path: props.configArtifacts.runtime,
			default: "runtime",
		},
		{
			path: "@lucidcms/core/runtime",
			exports: [
				"prepareTranslations",
				"processConfig",
				"resolveDatabaseAdapter",
				"setupCronJobs",
			],
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
			path: "@lucidcms/runtime-cloudflare/runtime",
			exports: ["getRuntimeContext"],
		},
		{
			path: `./${astroConstants.files.emailTemplatesJson}`,
			default: "emailTemplates",
		},
		{
			path: `./${astroConstants.files.i18nTranslationsJson}`,
			default: "i18nTranslations",
		},
		{
			path: "@lucidcms/core/plugin",
			exports: ["createTranslator"],
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
	if (envSchema) {
		envSchema.parse(env);
	}
	await runtime.resolveOptions?.(env);

	const wrappedDefinition = astroConfigureLucid({
		runtime,
		db,
		config: configFactory,
	}, {
		emailTemplates,
	});
	const databaseAdapter = await resolveDatabaseAdapter(
		wrappedDefinition.db,
		env,
	);
	const resolvedConfig = await processConfig(wrappedDefinition.config(env), {
		bypassCache: true,
		recipe: wrappedDefinition.recipe,
		resolvedDb: databaseAdapter,
		skipValidation: true,
	});
	const { translationStore } = await prepareTranslations({
		config: resolvedConfig,
		bundles: i18nTranslations,
	});
		const runtimeContext = getRuntimeContext({
			server: "cloudflare",
			compiled: true,
		});
		const translate = createTranslator({ store: translationStore, locale: "en" });
		const kv = await getInitializedKVAdapter(resolvedConfig, {
			env,
			runtimeContext,
		});

		try {
			const cronJobSetup = await setupCronJobs({
				createQueue: true,
				runtimeContext,
				env,
			});
			await cronJobSetup.register({
				config: resolvedConfig,
				translationStore,
				db: { client: resolvedConfig.db.client },
				queue: cronJobSetup.queue,
				env,
				kv,
				request: {
					url: resolvedConfig.baseUrl || "http://localhost",
					locale: resolvedConfig.i18n.defaultLocale,
				},
				translate,
			}, {
				schedule: controller.cron,
			});
		} finally {
			await Promise.allSettled([
				destroyKVAdapter(kv, { config: resolvedConfig, env, runtimeContext }),
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
