import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LucidError } from "../../utils/errors/index.js";
import type { HostCliIntegration } from "./types.js";

type PackageManifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	lucid?: { host?: unknown };
};

const isHostCliIntegration = (value: unknown): value is HostCliIntegration =>
	typeof value === "object" &&
	value !== null &&
	"name" in value &&
	typeof value.name === "string" &&
	"commands" in value &&
	typeof value.commands === "object" &&
	value.commands !== null &&
	"viteConfig" in value &&
	typeof value.viteConfig === "function";

const readManifest = async (
	file: string,
): Promise<PackageManifest | undefined> => {
	try {
		return JSON.parse(await readFile(file, "utf8"));
	} catch {
		return undefined;
	}
};

/** Finds framework CLI support, such as `@lucidcms/astro`, from dependencies declaring `lucid.host` in `package.json`, without a `lucid.config` entry. */
const findHostCli = async (
	projectRoot: string,
): Promise<HostCliIntegration | undefined> => {
	const manifestPath = path.join(projectRoot, "package.json");
	const manifest = await readManifest(manifestPath);
	if (!manifest) return undefined;

	const require = createRequire(manifestPath);
	const names = Object.keys({
		...manifest.dependencies,
		...manifest.devDependencies,
	});
	const hosts = (
		await Promise.all(
			names.map(async (name) => {
				let packagePath: string;
				try {
					packagePath = require.resolve(`${name}/package.json`);
				} catch {
					// Packages that don't export their `package.json` aren't hosts.
					return undefined;
				}

				const host = (await readManifest(packagePath))?.lucid?.host;
				return typeof host === "string"
					? { name, module: path.resolve(path.dirname(packagePath), host) }
					: undefined;
			}),
		)
	).filter((host) => host !== undefined);

	const [host, ...others] = hosts;
	if (!host) return undefined;
	if (others.length > 0) {
		throw new LucidError({
			message: `Several installed packages serve Lucid: ${hosts.map(({ name }) => name).join(", ")}. Keep one.`,
		});
	}

	const imported: unknown = await import(pathToFileURL(host.module).href);
	const integration =
		typeof imported === "object" && imported !== null && "default" in imported
			? imported.default
			: undefined;
	if (!isHostCliIntegration(integration)) {
		throw new LucidError({
			message: `"${host.name}" names a host CLI module in its package.json that doesn't default export one.`,
		});
	}

	return integration;
};

export default findHostCli;
