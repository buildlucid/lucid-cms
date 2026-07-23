import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import {
	pathExists,
	resolveSourcePath,
} from "../../utils/helpers/resolve-source-path.js";
import type { ExternalMigrationFn, MigrationSource } from "./types.js";

const migrationFileExtensions = [".ts", ".mts", ".js", ".mjs"];

const isMigrationFile = (fileName: string) => {
	if (fileName.endsWith(".d.ts") || fileName.endsWith(".d.mts")) return false;
	return migrationFileExtensions.includes(path.extname(fileName));
};

//* a fixed width timestamp keeps lexicographic order in line with creation order
const validateMigrationName = (name: string, origin: string) => {
	if (!constants.db.externalMigrationNameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid migration name "${name}". Migration names must start with a 13 digit timestamp followed by lowercase letters, numbers, hyphens and underscores, eg. "1751400000000-example". Use the "migrate:new" command to create one.`,
			data: { origin },
		});
	}
};

/**
 * Collects migration file paths from a file or directory source.
 */
const collectMigrationFiles = async (
	sourcePath: string,
	options?: {
		optional?: boolean;
	},
): Promise<string[]> => {
	if (!(await pathExists(sourcePath))) {
		if (options?.optional) return [];
		throw new LucidError({
			message: `Migration source "${sourcePath}" does not exist.`,
		});
	}

	const stats = await fs.stat(sourcePath);
	if (stats.isFile()) {
		if (!isMigrationFile(path.basename(sourcePath))) {
			throw new LucidError({
				message: `Migration source "${sourcePath}" must be a ${migrationFileExtensions.join(", ")} file.`,
			});
		}
		return [sourcePath];
	}
	if (!stats.isDirectory()) {
		throw new LucidError({
			message: `Migration source "${sourcePath}" must be a file or directory.`,
		});
	}

	const entries = await fs.readdir(sourcePath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && isMigrationFile(entry.name))
		.map((entry) => path.join(sourcePath, entry.name))
		.sort();
};

/**
 * Loads configured migration sources and the optional project `migrations/`
 * directory. Sources can be files, directories or inline `{ name, migration }`
 * entries. Timestamped migration names can never clash with core migration
 * names and always sort after them.
 */
const loadExternalMigrations = async (props: {
	sources?: MigrationSource[];
	projectRoot?: string;
}): Promise<Record<string, ExternalMigrationFn>> => {
	const filePaths = new Set<string>();
	const inlineSources: Array<{ name: string; migration: ExternalMigrationFn }> =
		[];

	for (const source of props.sources ?? []) {
		if (typeof source === "object" && !(source instanceof URL)) {
			inlineSources.push(source);
			continue;
		}

		const sourcePath = await resolveSourcePath(source, {
			projectRoot: props.projectRoot,
			label: "Migration source",
		});
		for (const filePath of await collectMigrationFiles(sourcePath)) {
			filePaths.add(filePath);
		}
	}

	if (props.projectRoot) {
		const projectMigrations = await collectMigrationFiles(
			path.join(props.projectRoot, constants.db.externalMigrationDirectory),
			{ optional: true },
		);
		for (const filePath of projectMigrations) {
			filePaths.add(filePath);
		}
	}

	const migrations: Record<string, ExternalMigrationFn> = {};
	const migrationOrigins: Record<string, string> = {};

	const addMigration = (
		name: string,
		migration: ExternalMigrationFn,
		origin: string,
	) => {
		if (migrationOrigins[name]) {
			throw new LucidError({
				message: `Duplicate migration name "${name}". Migration names must be unique across all migration sources.`,
				data: {
					origins: [migrationOrigins[name], origin],
				},
			});
		}

		migrations[name] = migration;
		migrationOrigins[name] = origin;
	};

	for (const filePath of filePaths) {
		const fileName = path.basename(filePath);
		const stem = fileName.slice(
			0,
			fileName.length - path.extname(fileName).length,
		);
		validateMigrationName(stem, filePath);

		//* cache-busted so edits are picked up across config reloads (eg. dev watch mode)
		const migrationModule: { default?: unknown } = await import(
			/*! @vite-ignore */
			`${pathToFileURL(filePath).href}?t=${Date.now()}`
		);
		if (typeof migrationModule.default !== "function") {
			throw new LucidError({
				message: `Invalid migration file "${fileName}". Migration files must default export a migration created with the "defineMigration" helper.`,
				data: { filePath },
			});
		}

		addMigration(
			stem,
			migrationModule.default as ExternalMigrationFn,
			filePath,
		);
	}

	for (const source of inlineSources) {
		const origin = `inline source "${source.name}"`;
		validateMigrationName(source.name, origin);
		addMigration(source.name, source.migration, origin);
	}

	return migrations;
};

/**
 * Loads external migrations and registers them on the config's database adapter.
 * Only migration entry points should call this.
 */
export const prepareExternalMigrations = async (
	config: Config,
	projectRoot?: string,
) => {
	config.db.registerExternalMigrations(
		await loadExternalMigrations({
			sources: config.migrations?.sources,
			projectRoot,
		}),
	);
};

export default loadExternalMigrations;
