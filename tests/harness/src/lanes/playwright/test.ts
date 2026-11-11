import { test as base } from "@playwright/test";
import {
	describeMissing,
	findMissing,
} from "../../capabilities/find-missing.ts";
import type { Capability } from "../../capabilities/types.ts";
import openLucid, { type Lucid } from "../../client/open-lucid.ts";
import { resolveDriver } from "../../databases/get-driver.ts";
import loadContext from "../../environment/load-context.ts";
import createMigrationDatabase from "../../migrations/create-migration-database.ts";
import serveBuilt from "../../migrations/serve-built.ts";
import type {
	MigrationDatabase,
	Migrations,
	Step,
} from "../../migrations/types.ts";

/**
 * Playwright's `test` with the CMS under test as `lucid`, for preparing data over the API, and
 * `migrations` for tests that need the admin on a database they migrated themselves.
 * The browser starts signed in as the seeded admin.
 */
/** Empty databases for a test to migrate itself, and a server to open the admin on one. */
export type ServedMigrations = Migrations & {
	/** Starts the setup's built server on a database, with its config at a schema step. */
	serve(
		database: MigrationDatabase,
		step: Step,
	): Promise<Awaited<ReturnType<typeof serveBuilt>>>;
};

export const test = base.extend<
	object,
	{ lucid: Lucid; migrations: ServedMigrations }
>({
	lucid: [
		// oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's needs from this pattern
		async ({}, use) => {
			const lucid = await openLucid(loadContext());
			await use(lucid);
			await lucid.close();
		},
		{ scope: "worker" },
	],
	//* worker scoped, so a file can prepare one database in `beforeAll` for all its tests
	migrations: [
		// oxlint-disable-next-line no-empty-pattern -- Playwright reads a fixture's needs from this pattern
		async ({}, use) => {
			const context = loadContext();
			const cleanups: Array<() => Promise<void>> = [];

			await use({
				database: async () => {
					const database = await createMigrationDatabase({
						context,
						driver: resolveDriver(context.setup.database),
					});
					cleanups.push(database.destroy);
					return database;
				},
				serve: async (database, step) => {
					const server = await serveBuilt({
						context,
						databaseUrl: database.url,
						step,
					});
					cleanups.push(server.stop);
					return server;
				},
			});

			//* newest first, so servers stop before their databases go
			for (const cleanup of cleanups.reverse()) {
				await cleanup().catch(() => undefined);
			}
		},
		{ scope: "worker" },
	],
});

/**
 * Skips the tests around it when the setup lacks a capability, with the reason in the report.
 * Call it at the top of a file or inside a `test.describe`.
 */
export const requires = (...required: Capability[]): void => {
	const missing = findMissing(loadContext().capabilities, required);
	test.skip(missing.length > 0, describeMissing(missing));
};
