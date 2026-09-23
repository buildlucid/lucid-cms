import path from "node:path";
import { createJiti } from "jiti";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import { migrationSchema } from "../config/definition-schemas.js";
import type { ResourceFile } from "../resources/types.js";
import type { ExternalMigration, MigrationDefinition } from "./types.js";

//* a fixed width timestamp keeps lexicographic order in line with creation order
const validateMigrationName = (name: string, origin: string) => {
	if (!constants.db.externalMigrationNameRegex.test(name)) {
		throw new LucidError({
			message: `Invalid migration name "${name}". Migration names must start with a 13 digit timestamp followed by lowercase letters, numbers, hyphens and underscores, eg. "1751400000000-example". Use the "migrate:new" command to create one.`,
			data: { origin },
		});
	}
};

/** Loads resolved migrations and explicit definitions when their command runs. */
const loadExternalMigrations = async (props: {
	definitions?: MigrationDefinition[];
	files?: ResourceFile[];
}): Promise<Record<string, ExternalMigration>> => {
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
		interopDefault: false,
	});
	const migrations: Record<string, ExternalMigration> = {};
	const migrationOrigins: Record<string, string> = {};

	const addMigration = (
		name: string,
		migration: ExternalMigration,
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

	for (const { path: filePath } of props.files ?? []) {
		const fileName = path.basename(filePath);
		const stem = fileName.slice(
			0,
			fileName.length - path.extname(fileName).length,
		);

		const migrationModule = await loader.import<{ default?: unknown }>(
			filePath,
		);
		if (!("default" in migrationModule)) continue;
		validateMigrationName(stem, filePath);

		const migration = migrationSchema.safeParse(migrationModule.default);
		if (!migration.success) {
			throw new LucidError({
				message: `Invalid migration file "${fileName}". Migration files must default export a migration created with the "defineMigration" helper.`,
				data: { filePath },
			});
		}

		addMigration(stem, migration.data, filePath);
	}

	for (const source of props.definitions ?? []) {
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
export const prepareExternalMigrations = async (props: {
	config: ResolvedLucidConfig;
	files: ResourceFile[];
}) => {
	props.config.db.registerExternalMigrations(
		await loadExternalMigrations({
			definitions: props.config.migrations.definitions,
			files: props.files,
		}),
	);
};

export default loadExternalMigrations;
