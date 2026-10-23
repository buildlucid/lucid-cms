import path from "node:path";
import { normalizePath, type Plugin, type PluginOption } from "vite";
import constants from "../../constants/constants.js";
import { getDirName } from "../../utils/helpers/index.js";
import buildApp from "./build-app.js";
import listResolvedPaths from "./list-resolved-paths.js";
import type { LucidPluginProps, LucidViteApi } from "./types.js";

/** Lucid's core package, as Vite's module IDs write it. */
const coreDirectory = `${normalizePath(path.resolve(getDirName(import.meta.url), "../../../"))}/`;

/** Lucid's generated files and common database names excluded from watching and serving, alongside adapter files and plugin additions such as uploads. */
const lucidFiles = [
	`**/${constants.directories.lucid}/**`,
	"**/*.sqlite",
	"**/*.sqlite-*",
	"**/*.db",
	"**/*.db-*",
];
/** Vite's own `server.fs.deny` defaults. */
const viteDeniedFiles = [
	".env",
	".env.*",
	"*.{crt,pem,key,p12,pfx,cer,der}",
	".npmrc",
	".yarnrc.yml",
	"**/.git/**",
];

/** The name of the plugin whose `api` exposes the loaded project and task token to Lucid's CLI. */
const lucidConfigPluginName = "lucid:config";

/** Configures Lucid builds, client output and development/preview addresses without SPA fallback, while framework hosts receive only watch exclusions and filesystem deny rules. */
const lucidConfigPlugin = (
	props: LucidPluginProps & {
		ready: Promise<boolean>;
		startMessage: string;
		listen?: { port?: number; hostname?: string };
	},
): Plugin<LucidViteApi> & { api: LucidViteApi } => ({
	name: lucidConfigPluginName,
	api: {
		project: props.project,
		token: props.token,
		ready: props.ready,
		startMessage: props.startMessage,
	},
	// Lucid's toolkit imports its services on demand, so builds that bundle Lucid's core, such as Astro's, would warn that
	// some of those imports can't split into their own chunks. Projects can't act on that, so it's left out.
	onLog(_level, log) {
		if (
			log.code === "INEFFECTIVE_DYNAMIC_IMPORT" &&
			log.id !== undefined &&
			normalizePath(log.id).startsWith(coreDirectory)
		) {
			return false;
		}
	},
	config: async (userConfig) => {
		// The database adapter's own files, whatever they're called, and those SQLite names after them, such as `-wal`.
		const databaseFiles = (
			await props.project.config.db.localFiles(props.project.env)
		)
			.flatMap(listResolvedPaths)
			.flatMap((file) => [normalizePath(file), `${normalizePath(file)}-*`]);
		const ignored = [...lucidFiles, ...databaseFiles];
		const server = {
			// Vite's merge replaces a `null` watch, which task servers set to turn the watcher off, so it's left alone.
			watch: userConfig.server?.watch === null ? undefined : { ignored },
			// Vite serves project files before Lucid's routes and permissions, so Lucid's data stays out of reach.
			// Setting `deny` replaces Vite's defaults, so they're kept.
			fs: { deny: [...viteDeniedFiles, ...ignored] },
		};
		if (props.host) return { server };

		const port = props.listen?.port ?? constants.dev.defaultPort;
		const host = props.listen?.hostname;

		return {
			appType: "custom",
			publicDir: false,
			builder: {
				// Each environment would otherwise resolve the Vite config again, loading the Lucid project each time.
				sharedConfigBuild: true,
				buildApp,
			},
			// The admin compiles with each project, which Rolldown's timing warnings would report though nobody can act on it.
			build: { rolldownOptions: { checks: { bundlerTimings: false } } },
			server: { ...server, port, host },
			preview: { port, host },
			environments: {
				client: {
					build: {
						outDir: path.resolve(
							props.project.config.build.outDir,
							constants.directories.public,
						),
						assetsDir: constants.builtAssets.directory,
						emptyOutDir: true,
					},
				},
			},
		};
	},
});

/** Checks for the plugin `lucidConfigPlugin` returns, whose `api` holds the loaded project. */
export const isLucidConfigPlugin = (
	plugin: PluginOption,
): plugin is ReturnType<typeof lucidConfigPlugin> =>
	typeof plugin === "object" &&
	plugin !== null &&
	"name" in plugin &&
	plugin.name === lucidConfigPluginName;

export default lucidConfigPlugin;
