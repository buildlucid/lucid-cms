import { type BrowserContext, test as base, type Page } from "@playwright/test";
import {
	describeMissing,
	findMissing,
} from "../../capabilities/find-missing.ts";
import type { Capability } from "../../capabilities/types.ts";
import { CLIENT_ADDRESS_HEADER } from "../../client/contract.ts";
import { nextAddress } from "../../client/create-session.ts";
import openLucid, { type Lucid } from "../../client/open-lucid.ts";
import type { Session } from "../../client/types.ts";
import { resolveDriver } from "../../databases/get-driver.ts";
import loadContext from "../../environment/load-context.ts";
import createMigrationTemplates from "../../migrations/create-migration-templates.ts";
import createMigrations from "../../migrations/create-migrations.ts";
import serveBuilt from "../../migrations/serve-built.ts";
import type {
	MigrationDatabase,
	Migrations,
	Step,
} from "../../migrations/types.ts";
import toStorageState from "./storage-state.ts";

/**
 * Playwright fixtures for CMS API access and migration databases. The browser starts signed in as
 * the seeded admin.
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
	{
		/**
		 * Opens a page for another session, such as `lucid.user()`, leaving the default page signed in
		 * as admin. Only one person can have a document open for editing, so give each page its own
		 * document. See `suites/e2e/permissions/access.spec.ts`.
		 */
		pageAs: (session: Session) => Promise<Page>;
	},
	{ lucid: Lucid; migrations: ServedMigrations }
>({
	//* each browser has its own address, so tests that log in don't share rate limits
	extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
		await use({ ...extraHTTPHeaders, [CLIENT_ADDRESS_HEADER]: nextAddress() });
	},
	pageAs: async ({ browser, lucid }, use) => {
		const contexts: BrowserContext[] = [];
		await use(async (session) => {
			const context = await browser.newContext({
				baseURL: lucid.url,
				storageState: toStorageState(session, lucid.url),
				extraHTTPHeaders: { [CLIENT_ADDRESS_HEADER]: nextAddress() },
			});
			contexts.push(context);
			return context.newPage();
		});
		for (const context of contexts) {
			await context.close();
		}
	},
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
			const driver = resolveDriver(context.setup.database);
			const templates = createMigrationTemplates({ context, driver });
			const migrations = createMigrations({ context, driver, templates });
			const servers: Array<() => Promise<void>> = [];

			await use({
				database: migrations.database,
				serve: async (database, step) => {
					const server = await serveBuilt({
						context,
						databaseUrl: database.url,
						step,
						uploads: database.uploads,
					});
					servers.push(server.stop);
					return server;
				},
			});

			//* servers stop before their databases go
			for (const stop of servers) {
				await stop().catch(() => undefined);
			}
			await migrations.destroy();
			await templates.destroy();
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
