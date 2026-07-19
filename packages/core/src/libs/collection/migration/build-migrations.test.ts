import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ServiceContext } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import buildMigrations from "./build-migrations.js";
import createTableQuery from "./create-table-query.js";
import modifyTableQuery from "./modify-table-query.js";
import removeTableQuery from "./remove-table-query.js";
import type { MigrationPlan, TableMigration } from "./types.js";

vi.mock("./create-table-query.js", () => ({ default: vi.fn() }));
vi.mock("./modify-table-query.js", () => ({ default: vi.fn() }));
vi.mock("./remove-table-query.js", () => ({ default: vi.fn() }));

const context = {} as ServiceContext;

const createMigration = (tableName: string): TableMigration => ({
	type: "create",
	priority: 100,
	tableName,
	columnOperations: [],
	indexOperations: [],
});

const migrationPlan = (...tables: TableMigration[]): MigrationPlan[] => [
	{
		collectionKey: "test",
		tables,
	},
];

describe("buildMigrations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(modifyTableQuery).mockResolvedValue({
			data: undefined,
			error: undefined,
		});
		vi.mocked(removeTableQuery).mockResolvedValue({
			data: undefined,
			error: undefined,
		});
	});

	test("runs table migrations serially within a priority group", async () => {
		let activeMigrations = 0;
		let maxActiveMigrations = 0;
		vi.mocked(createTableQuery).mockImplementation(async () => {
			activeMigrations += 1;
			maxActiveMigrations = Math.max(maxActiveMigrations, activeMigrations);
			await Promise.resolve();
			activeMigrations -= 1;
			return {
				data: undefined,
				error: undefined,
			};
		});

		const res = await buildMigrations(context, {
			migrationPlan: migrationPlan(
				createMigration("lucid_document__one"),
				createMigration("lucid_document__two"),
			),
		});

		expect(res.error).toBeUndefined();
		expect(createTableQuery).toHaveBeenCalledTimes(2);
		expect(maxActiveMigrations).toBe(1);
	});

	test("stops the batch after the first table migration error", async () => {
		const error = {
			message: copy.literal("Migration failed"),
		};
		vi.mocked(createTableQuery).mockResolvedValueOnce({
			data: undefined,
			error,
		});

		const res = await buildMigrations(context, {
			migrationPlan: migrationPlan(
				createMigration("lucid_document__one"),
				createMigration("lucid_document__two"),
			),
		});

		expect(res.error).toEqual(error);
		expect(createTableQuery).toHaveBeenCalledTimes(1);
	});
});
