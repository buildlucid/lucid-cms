import { beforeEach, test as base, onTestFinished, vi } from "vitest";
import type { Variant } from "../../../../shared/variants.ts";
import {
	describeMissing,
	findMissing,
} from "../../capabilities/find-missing.ts";
import type { Capability } from "../../capabilities/types.ts";
import openLucid, { type Lucid } from "../../client/open-lucid.ts";
import { getDriver } from "../../databases/get-driver.ts";
import loadContext from "../../environment/load-context.ts";
import createMigrationTemplates, {
	type MigrationTemplates,
} from "../../migrations/create-migration-templates.ts";
import createMigrations from "../../migrations/create-migrations.ts";
import type { Migrations } from "../../migrations/types.ts";
import type { JsonObject } from "../../utils/json.ts";

declare module "vitest" {
	interface TaskMeta {
		/** Extra data for the harness report, such as a simulation's seed and digest. */
		harness?: JsonObject;
	}
}

/** The setup's database driver in host mode, which is the only mode with migration databases. */
const getHostDriver = () => {
	const { target } = loadContext();
	if (target.mode !== "host") {
		throw new Error("Migration tests only run in host mode.");
	}
	return getDriver(target.template.driver);
};

/**
 * Vitest's `test` with the CMS under test as `lucid`, and `migrations` for tests that migrate
 * their own databases. Each test file shares one `lucid`. In host mode that is a fresh CMS and
 * database for the file.
 */
export const test = base.extend<{
	lucid: Lucid;
	/** The config variant the file's `lucid` runs with. Set it with `useVariant()`. */
	variant: Variant | undefined;
	migrations: Migrations;
	/** The templates `migrations.database(prepare)` copies, shared by a file's tests. Used through `migrations`. */
	migrationTemplates: MigrationTemplates;
}>({
	variant: [undefined, { scope: "file" }],
	lucid: [
		async ({ variant }, use) => {
			const lucid = await openLucid(loadContext(), { variant });
			await use(lucid);
			await lucid.close();
		},
		{ scope: "file" },
	],
	migrationTemplates: [
		// oxlint-disable-next-line no-empty-pattern -- Vitest reads a fixture's needs from this pattern
		async ({}, use) => {
			const templates = createMigrationTemplates({
				context: loadContext(),
				driver: getHostDriver(),
			});
			await use(templates);
			await templates.destroy();
		},
		{ scope: "file" },
	],
	/**
	 * Databases for a test to migrate itself. It needs host mode, so call `requires("mode:host")`
	 * in files that use it.
	 */
	migrations: async ({ migrationTemplates }, use) => {
		const migrations = createMigrations({
			context: loadContext(),
			driver: getHostDriver(),
			templates: migrationTemplates,
		});
		await use(migrations);
		await migrations.destroy();
	},
});

/**
 * Skips the tests around it when the setup lacks a capability, with the reason in the report.
 * Call it at the top of a file or inside a `describe`.
 *
 * @example
 * ```ts
 * describe("page paths", () => {
 * 	requires("plugin:pages");
 *
 * 	test("builds a full path", async ({ lucid }) => {});
 * });
 * ```
 */
export const requires = (...required: Capability[]): void => {
	const missing = findMissing(loadContext().capabilities, required);
	if (missing.length === 0) {
		return;
	}

	beforeEach(({ skip }) => {
		skip(describeMissing(missing));
	});
};

/**
 * Runs the file's tests on a CMS with a variant of the setup's config, such as one without
 * password login. Host mode only, so other modes report the file as not applicable. Call it at
 * the top of a file. See `shared/variants.ts`.
 */
export const useVariant = (variant: Variant): void => {
	requires("mode:host");
	test.override({ variant });
};

/**
 * Moves the clock forward for the rest of the test, such as past a token's expiry. Time keeps
 * running from there. Host mode only, as the CMS shares the test's clock. Timers are left alone.
 */
export const advanceClock = (ms: number): void => {
	if (loadContext().mode !== "host") {
		throw new Error(
			'The clock can only move in host mode. Call requires("mode:host").',
		);
	}
	const now = Date.now();
	if (!vi.isFakeTimers()) {
		vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true });
		onTestFinished(() => {
			vi.useRealTimers();
		});
	}
	vi.setSystemTime(now + ms);
};
