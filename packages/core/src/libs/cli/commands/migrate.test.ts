import { confirm } from "@inquirer/prompts";
import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { syncServices } from "../../../services/index.js";
import type { Config } from "../../../types.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import type { CollectionMigrationPlan } from "../../collection/migration/types.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import { prepareExternalMigrations } from "../../db/load-external-migrations.js";
import { createTranslationStore } from "../../i18n/index.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import migrateCommand from "./migrate.js";

vi.mock("@inquirer/prompts", () => ({ confirm: vi.fn() }));
vi.mock("../../../services/index.js", () => ({
	syncServices: { syncCollections: vi.fn() },
}));
vi.mock("../../collection/apply-collection-migrations.js", () => ({
	default: vi.fn(),
}));
vi.mock("../../collection/plan-collection-migrations.js", () => ({
	default: vi.fn(),
}));
vi.mock("../../db/load-external-migrations.js", () => ({
	prepareExternalMigrations: vi.fn(),
}));
vi.mock("../../kv/lifecycle.js", () => ({
	destroyKVAdapter: vi.fn(),
	getInitializedKVAdapter: vi.fn(),
}));
vi.mock("../services/run-sync-tasks.js", () => ({ default: vi.fn() }));

/** Builds an exact collection plan containing one risk-assessable operation. */
const collectionPlan = (
	risk: "none" | "safe" | "warning" | "destructive",
): CollectionMigrationPlan => {
	const columnOperations =
		risk === "safe" || risk === "warning"
			? [
					{
						type: "add" as const,
						column: {
							name: "_summary",
							source: "field" as const,
							type: "text" as const,
							nullable: risk === "safe",
						},
					},
				]
			: risk === "destructive"
				? [{ type: "remove" as const, columnName: "legacy" }]
				: [];
	return {
		collections: [
			{
				inferredSchema: { key: "pages", tables: [] },
				migrationPlan: {
					collectionKey: "pages",
					tables:
						columnOperations.length === 0
							? []
							: [
									{
										type: "modify",
										tableName: "lucid_document__pages__fld",
										priority: 0,
										columnOperations,
										indexOperations: [],
									},
								],
				},
			},
		],
	};
};

/** Creates the minimal configured command dependencies used by migration tests. */
const commandFixture = (pendingCore: boolean, pendingExternal = false) => {
	const kv = { clear: vi.fn() };
	const client = { withPlugin: vi.fn() };
	client.withPlugin.mockReturnValue(client);
	const database = {
		client,
		destroy: vi.fn(),
	};
	const db = new SQLiteAdapter({ database: ":memory:" });
	db.connect = vi.fn().mockResolvedValue(database);
	db.getMigrationStatus = vi.fn().mockResolvedValue({
		registered: [],
		executed: [],
		pendingCore: pendingCore ? ["00000013-preview-sessions"] : [],
		pendingExternal: pendingExternal ? ["1751400000000-example"] : [],
		missing: [],
	});
	db.migrateCoreToLatest = vi.fn();
	db.migrateExternalToLatest = vi.fn();
	const config = {
		db,
		tables: [],
		collections: [],
		i18n: {
			defaultLocale: "en",
		},
	} as unknown as Config;
	const translationStore = createTranslationStore({
		defaultLocale: "en",
		bundles: {},
	});
	return { config, database, db, kv, translationStore };
};

describe("migrateCommand collection policy", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(prepareExternalMigrations).mockResolvedValue(undefined);
		vi.mocked(syncServices.syncCollections).mockResolvedValue({
			data: undefined,
			error: undefined,
		});
		vi.mocked(applyCollectionMigrations).mockResolvedValue({
			data: undefined,
			error: undefined,
		});
		vi.mocked(runSyncTasks).mockResolvedValue(true);
		vi.mocked(destroyKVAdapter).mockResolvedValue(undefined);
	});

	test("automatically executes safe collection additions without prompting", async () => {
		const fixture = commandFixture(false);
		const plan = collectionPlan("safe");
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: plan,
			error: undefined,
		});
		vi.mocked(getInitializedKVAdapter).mockResolvedValue(fixture.kv as never);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ skipSyncSteps: true });

		expect(result).toBe(true);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).toHaveBeenCalledWith(
			expect.any(Object),
			plan,
		);
	});

	test("prompts for warning changes with a default of false", async () => {
		const fixture = commandFixture(false);
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: collectionPlan("warning"),
			error: undefined,
		});
		vi.mocked(confirm).mockResolvedValue(false);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ skipSyncSteps: true });

		expect(result).toBe(false);
		expect(confirm).toHaveBeenCalledWith(
			expect.objectContaining({ default: false }),
		);
		expect(applyCollectionMigrations).not.toHaveBeenCalled();
	});

	test("--yes executes warning changes without prompting", async () => {
		const fixture = commandFixture(false);
		const plan = collectionPlan("warning");
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: plan,
			error: undefined,
		});
		vi.mocked(getInitializedKVAdapter).mockResolvedValue(fixture.kv as never);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ yes: true, skipSyncSteps: true });

		expect(result).toBe(true);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).toHaveBeenCalledWith(
			expect.any(Object),
			plan,
		);
	});

	test("--yes rejects destructive changes without prompting", async () => {
		const fixture = commandFixture(false);
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: collectionPlan("destructive"),
			error: undefined,
		});

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ yes: true, skipSyncSteps: true });

		expect(result).toBe(false);
		expect(confirm).not.toHaveBeenCalled();
		expect(getInitializedKVAdapter).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).not.toHaveBeenCalled();
	});

	test("--allow-destructive executes destructive changes non-interactively", async () => {
		const fixture = commandFixture(false);
		const plan = collectionPlan("destructive");
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: plan,
			error: undefined,
		});
		vi.mocked(getInitializedKVAdapter).mockResolvedValue(fixture.kv as never);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ allowDestructive: true, skipSyncSteps: true });

		expect(result).toBe(true);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).toHaveBeenCalledWith(
			expect.any(Object),
			plan,
		);
	});

	test("re-planning after database migrations cannot bypass higher risk", async () => {
		const fixture = commandFixture(true);
		vi.mocked(planCollectionMigrations)
			.mockResolvedValueOnce({
				data: collectionPlan("none"),
				error: undefined,
			})
			.mockResolvedValueOnce({
				data: collectionPlan("destructive"),
				error: undefined,
			});
		vi.mocked(getInitializedKVAdapter).mockResolvedValue(fixture.kv as never);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ yes: true, skipSyncSteps: true });

		expect(result).toBe(false);
		expect(fixture.db.migrateCoreToLatest).toHaveBeenCalledWith(
			fixture.database,
		);
		expect(planCollectionMigrations).toHaveBeenCalledTimes(2);
		expect(confirm).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).not.toHaveBeenCalled();
	});

	test("runs external migrations after collection migration and sync", async () => {
		const fixture = commandFixture(false, true);
		vi.mocked(planCollectionMigrations).mockResolvedValue({
			data: collectionPlan("safe"),
			error: undefined,
		});
		vi.mocked(getInitializedKVAdapter).mockResolvedValue(fixture.kv as never);

		const result = await migrateCommand({
			config: fixture.config,
			translationStore: fixture.translationStore,
			mode: "return",
		})({ yes: true, skipSyncSteps: true });

		expect(result).toBe(true);
		expect(fixture.db.migrateCoreToLatest).not.toHaveBeenCalled();
		expect(applyCollectionMigrations).toHaveBeenCalled();
		expect(runSyncTasks).toHaveBeenCalled();
		expect(fixture.db.migrateExternalToLatest).toHaveBeenCalledWith(
			fixture.database,
			expect.any(Object),
		);
		expect(
			vi.mocked(applyCollectionMigrations).mock.invocationCallOrder[0],
		).toBeLessThan(vi.mocked(runSyncTasks).mock.invocationCallOrder[0] ?? 0);
		expect(vi.mocked(runSyncTasks).mock.invocationCallOrder[0]).toBeLessThan(
			fixture.db.migrateExternalToLatest.mock.invocationCallOrder[0] ?? 0,
		);
	});
});
