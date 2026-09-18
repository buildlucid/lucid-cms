import { access, cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import path from "node:path";
import { build, type LogLevel } from "vite";
import { getAdminBuildKey } from "./cache.js";
import {
	type AdminConfigOptions,
	adminRoot,
	createAdminConfig,
} from "./config.js";
import { hasAdminExtensions } from "./extensions/plugin.js";

type AdminBuildOptions = AdminConfigOptions & {
	outDir: string;
	logLevel?: LogLevel;
};

/** Builds the complete admin application into the host's public output. */
export const buildAdmin = async (options: AdminBuildOptions) => {
	// Match Vite's production default on cache hits as well as fresh builds.
	process.env.NODE_ENV ??= "production";

	const compile = (outDir: string) =>
		build({
			...createAdminConfig(options),
			mode: "production",
			logLevel: options.logLevel ?? "warn",
			build: {
				outDir,
				emptyOutDir: true,
				chunkSizeWarningLimit: Infinity,
			},
		});

	const outDir = path.resolve(options.outDir);

	const key = hasAdminExtensions(options.admin)
		? undefined
		: await getAdminBuildKey(
				adminRoot,
				options.projectRoot,
				options.clientConfig,
			);
	if (!key) {
		await compile(outDir);
		return;
	}

	const cacheRoot = path.join(options.projectRoot, ".lucid/cache/admin");
	const cached = path.join(cacheRoot, key);

	const exists = await access(path.join(cached, "index.html")).then(
		() => true,
		() => false,
	);
	if (!exists) {
		await mkdir(cacheRoot, { recursive: true });
		const staging = await mkdtemp(path.join(cacheRoot, ".build-"));

		try {
			await compile(staging);
			// Publish only complete builds. Another process may have finished this key first.
			await rename(staging, cached).catch((error: unknown) => {
				if (
					!(error instanceof Error) ||
					!("code" in error) ||
					!["EEXIST", "ENOTEMPTY"].includes(String(error.code))
				)
					throw error;
			});
		} finally {
			await rm(staging, { recursive: true, force: true });
		}
	}

	await rm(outDir, { recursive: true, force: true });
	await cp(cached, outDir, { recursive: true });
};
