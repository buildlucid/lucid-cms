import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import picocolors from "picocolors";
import z from "zod";
import packageJson from "../../../../package.json" with { type: "json" };
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";
import fetchLatestPackage from "../../package-updates/fetch-latest-package.js";
import getInstalledPackages from "../../package-updates/get-installed-packages.js";
import getUpdateStatus from "../../package-updates/get-update-status.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";

const UPDATE_AVAILABLE_FILE = "update-available.json";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const cacheSchema = z.object({
	checkedAt: z.number(),
	packages: z.record(
		z.string(),
		z.object({
			installed: z.string(),
			latest: z
				.object({ version: z.string(), requiresCore: z.string().nullable() })
				.nullable(),
		}),
	),
});

type UpdateCache = z.infer<typeof cacheSchema>;

type UpdateLine = {
	name: string;
	installed: string;
	latest: string;
	/** Set when the update needs a newer core first. */
	requiresCore: string | null;
};

const readCache = async (filePath: string): Promise<UpdateCache | null> => {
	try {
		return cacheSchema.parse(JSON.parse(await readFile(filePath, "utf-8")));
	} catch {
		return null;
	}
};

const renderUpdateBox = (updates: UpdateLine[]) => {
	const installable = updates.filter((update) => !update.requiresCore);
	if (installable.length === 0) return;

	const nameWidth = Math.max(...updates.map((update) => update.name.length));
	const installedWidth = Math.max(
		...updates.map((update) => update.installed.length),
	);
	const updateCommand = picocolors.cyan(
		`npm install ${installable.map((update) => `${update.name}@latest`).join(" ")}`,
	);

	const lines = [
		...updates.map(
			(update) =>
				`${update.name.padEnd(nameWidth)}  ${picocolors.yellow(update.installed.padEnd(installedWidth))} → ${
					update.requiresCore
						? picocolors.dim(
								`${update.latest} needs core ${update.requiresCore}`,
							)
						: picocolors.green(update.latest)
				}`,
		),
		"",
		`Run ${updateCommand} to update`,
		"",
		picocolors.dim("View the changelog: ") +
			picocolors.cyan("https://github.com/buildlucid/lucid-cms/releases"),
		picocolors.dim(
			"Remember to back up your database before updating or running migrations.",
		),
	];

	const title = " Updates Available ";
	const width = Math.max(
		title.length + 2,
		...lines.map((line) => stripVTControlCharacters(line).length),
	);
	const row = (line: string) =>
		`${picocolors.yellow("│")}  ${line}${" ".repeat(width - stripVTControlCharacters(line).length)}  ${picocolors.yellow("│")}`;

	console.log(
		[
			"",
			picocolors.yellow(`╭─${title}${"─".repeat(width + 3 - title.length)}╮`),
			row(""),
			...lines.map(row),
			row(""),
			picocolors.yellow(`╰${"─".repeat(width + 4)}╯`),
			"",
		].join("\n"),
	);
};

/**
 * Checks daily or when installed versions change. Compares compatibility against the suggested
 * core update and displays results only after a fresh check.
 */
const updateAvailable = async (props: {
	config: ResolvedLucidConfig;
	runtimeContext: AdapterRuntimeContext;
}) => {
	if (!props.config.updateChecks) return { renderUpdateBox: () => {} };

	const cachePath = join(
		await ensureLucidDirectoryExists(),
		UPDATE_AVAILABLE_FILE,
	);
	const packages = getInstalledPackages(props);
	const cache = await readCache(cachePath);
	const isCacheFresh =
		cache !== null &&
		Date.now() - cache.checkedAt < ONE_DAY_MS &&
		packages.every(
			(item) => cache.packages[item.name]?.installed === item.version,
		);

	const checked: UpdateCache["packages"] = isCacheFresh
		? cache.packages
		: Object.fromEntries(
				await Promise.all(
					packages.map(async (item) => [
						item.name,
						{
							installed: item.version,
							latest: await fetchLatestPackage(item.name),
						},
					]),
				),
			);
	if (!isCacheFresh) {
		await writeFile(
			cachePath,
			JSON.stringify({ checkedAt: Date.now(), packages: checked }, null, 2),
			"utf-8",
		);
	}

	//* the command updates core alongside the others, so their core ranges must fit the core it installs
	const coreLatest = checked[packageJson.name]?.latest ?? null;
	const targetCore =
		coreLatest &&
		getUpdateStatus({ installed: packageJson.version, latest: coreLatest }) ===
			"available"
			? coreLatest.version
			: packageJson.version;

	const updates = packages.flatMap((item): UpdateLine[] => {
		const latest = checked[item.name]?.latest ?? null;
		const status = getUpdateStatus({
			installed: item.version,
			latest,
			coreVersion: targetCore,
		});
		if (!latest || (status !== "available" && status !== "needs-core")) {
			return [];
		}
		return [
			{
				name: item.name,
				installed: item.version,
				latest: latest.version,
				requiresCore: status === "needs-core" ? latest.requiresCore : null,
			},
		];
	});

	return {
		renderUpdateBox: () => {
			if (!isCacheFresh) renderUpdateBox(updates);
		},
	};
};

export default updateAvailable;
