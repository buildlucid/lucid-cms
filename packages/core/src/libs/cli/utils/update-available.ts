import { ensureLucidDirectoryExists } from "../../../utils/helpers/lucid-directory.js";
import packageJson from "../../../../package.json" with { type: "json" };
import semver from "semver";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import boxen from "boxen";
import picocolors from "picocolors";

const UPDATE_AVAILABLE_FILE = "update-available.json";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type UpdateCache = {
	checkedAt: number;
	latestVersion: string | null;
	currentVersion: string;
};

type CoreUpdateAvailable = {
	available: boolean;
	show: boolean;
	latestVersion: string | null;
	currentVersion: string;
	renderUpdateBox: () => void;
};

const parseCache = async (filePath: string): Promise<UpdateCache | null> => {
	if (!existsSync(filePath)) {
		return null;
	}
	try {
		const raw = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(raw);
		const checkedAt =
			typeof parsed.checkedAt === "number" ? parsed.checkedAt : null;
		const latestVersion =
			typeof parsed.latestVersion === "string" || parsed.latestVersion === null
				? parsed.latestVersion
				: null;
		const currentVersion =
			typeof parsed.currentVersion === "string" ? parsed.currentVersion : null;

		if (checkedAt === null || currentVersion === null) {
			return null;
		}

		return {
			checkedAt,
			latestVersion,
			currentVersion,
		};
	} catch {
		return null;
	}
};

const writeCache = async (filePath: string, data: UpdateCache) => {
	await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
};

/**
 * Gets the latest version of a package from the npm registry
 */
const getLatestVersion = async (packageName: string) => {
	try {
		const response = await fetch(
			`https://registry.npmjs.org/${packageName}/latest`,
		);
		const data = await response.json();
		return data.version as string;
	} catch {
		return null;
	}
};

/**
 * Renders a box with the update information
 */
const renderUpdateBox = (
	updateAvailable: Omit<CoreUpdateAvailable, "renderUpdateBox">,
) => {
	if (!updateAvailable.show || !updateAvailable.available) {
		return;
	}

	const { currentVersion, latestVersion } = updateAvailable;

	const versionLines = [
		`Current: ${picocolors.yellow(currentVersion)}`,
		`Latest:  ${picocolors.green(latestVersion ?? "unknown")}`,
	];

	const updateCommand = picocolors.cyan(
		`npm install ${packageJson.name}@latest`,
	);

	const lines = [
		"A new version of Lucid CMS is available!",
		"",
		...versionLines,
		"",
		`Run ${updateCommand} to update`,
		"",
		picocolors.dim("View the changelog: ") +
			picocolors.cyan("https://github.com/buildlucid/lucid-cms/releases"),
		picocolors.dim(
			"Remember to back up your database before updating or running migrations.",
		),
	];

	const box = boxen(lines.join("\n"), {
		padding: 1,
		margin: 1,
		borderStyle: "round",
		borderColor: "yellow",
		title: "Update Available",
		titleAlignment: "left",
	});

	console.log(box);
};

/**
 * Checks if an update is available for the core package
 *
 * - Will only check once per day
 * - Invalidates cache if current version changes
 */
const updateAvailable = async (): Promise<CoreUpdateAvailable> => {
	const lucidDir = await ensureLucidDirectoryExists();
	const cachePath = join(lucidDir, UPDATE_AVAILABLE_FILE);
	const cache = await parseCache(cachePath);
	const now = Date.now();
	const currentVersion = packageJson.version;

	const versionChanged = cache ? cache.currentVersion !== currentVersion : true;
	const isCacheFresh = cache
		? now - cache.checkedAt < ONE_DAY_MS && !versionChanged
		: false;

	let latestVersion = isCacheFresh ? (cache?.latestVersion ?? null) : null;

	if (!isCacheFresh) {
		latestVersion = await getLatestVersion(packageJson.name);
		await writeCache(cachePath, {
			checkedAt: now,
			latestVersion,
			currentVersion,
		});
	}

	const updateAvailableFlag =
		!!latestVersion &&
		semver.valid(latestVersion) &&
		semver.valid(currentVersion)
			? semver.gt(latestVersion, currentVersion)
			: false;

	return {
		available: updateAvailableFlag,
		show: !isCacheFresh && updateAvailableFlag,
		latestVersion,
		currentVersion,
		renderUpdateBox: () =>
			renderUpdateBox({
				available: updateAvailableFlag,
				show: !isCacheFresh && updateAvailableFlag,
				latestVersion,
				currentVersion,
			}),
	};
};

export default updateAvailable;
