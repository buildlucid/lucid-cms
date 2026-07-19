import inferSchema from "../../libs/collection/schema/infer-schema.js";
import type { CollectionSchema } from "../../libs/collection/schema/types.js";
import { CollectionMigrationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../types.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import buildTableName from "./helpers/build-table-name.js";
import buildMigrations from "./migration/build-migrations.js";
import generateMigrationPlan from "./migration/generate-migration-plan.js";
import type { MigrationPlan } from "./migration/types.js";

type CollectionMigrationBatch = {
	migrationPlan: MigrationPlan;
	migrationEntry: {
		collection_key: string;
		table_name_map: string;
		migration_plans: MigrationPlan;
		collection_schema: CollectionSchema;
	};
};

/**
 * Runs one collection's table changes and history insert atomically when the
 * configured database supports transactions.
 */
const migrateCollectionBatch = serviceWrapper<
	[CollectionMigrationBatch],
	undefined
>(
	async (context, data) => {
		const migrationRes = await buildMigrations(context, {
			migrationPlan: [data.migrationPlan],
		});
		if (migrationRes.error) return migrationRes;

		const CollectionMigrations = new CollectionMigrationsRepository(
			context.db.client,
			context.config.db,
		);
		const migrationEntryRes = await CollectionMigrations.createSingle({
			data: data.migrationEntry,
		});
		if (migrationEntryRes.error) return migrationEntryRes;

		return {
			data: undefined,
			error: undefined,
		};
	},
	{
		transaction: true,
	},
);

/**
 * Infers collection schemas, works out the difference between the current collection schema and then migrates collections tables and data
 * - lucid_document__{key}
 * - lucid_document__{key}__ver
 * - lucid_document__{key}__fld
 * - lucid_document__{key}__{brick-key} * all potential bricks
 * - lucid_document__{key}__{brick-key}__rep__{repeater-field-key} * for each repeater for a single brick
 * - lucid_document__{key}__{brick-key}__{cf-relation-separator}__{field-key} * for each relation-table custom field
 */
const migrateCollections: ServiceFn<
	[
		{
			dryRun?: boolean;
		},
	],
	{
		migrationPlans: MigrationPlan[];
		inferedSchemas: CollectionSchema[];
	}
> = async (context, data) => {
	const dbSchema = await context.config.db.inferSchema(context.db.client);

	//* infer schema for each collection
	const inferedSchemas: Array<CollectionSchema> = [];
	for (const [_, collection] of context.config.collections.entries()) {
		const schemaRes = inferSchema(collection, context.config.db);
		if (schemaRes.error) return schemaRes;
		inferedSchemas.push(schemaRes.data);
	}

	//* generate migration plan
	const migrationPlans: MigrationPlan[] = [];
	for (const i of inferedSchemas) {
		const tableNameRes = buildTableName(
			"document",
			{
				collection: i.key,
			},
			context.config.db.config.tableNameByteLimit,
		);
		if (tableNameRes.error) return tableNameRes;

		const existingTables = dbSchema.filter((t) =>
			t.name.startsWith(tableNameRes.data.name),
		);

		const migraitonPlanRes = generateMigrationPlan({
			schemas: {
				existing: existingTables,
				current: i,
			},
			db: context.config.db,
		});
		if (migraitonPlanRes.error) return migraitonPlanRes;

		migrationPlans.push(migraitonPlanRes.data);
	}

	if (data.dryRun) {
		return {
			data: {
				migrationPlans,
				inferedSchemas,
			},
			error: undefined,
		};
	}

	//* build each collection migration batch and its history entry
	const migrationBatches = inferedSchemas.map((schema) => {
		const migrationPlan = migrationPlans.find(
			(plan) => plan.collectionKey === schema.key,
		) ?? {
			collectionKey: schema.key,
			tables: [],
		};
		const tableNameMap = Object.fromEntries(
			schema.tables.map((table) => [table.name, table.rawName ?? table.name]),
		);

		return {
			migrationPlan,
			migrationEntry: {
				collection_key: schema.key,
				table_name_map: JSON.stringify(tableNameMap),
				migration_plans: migrationPlan,
				collection_schema: schema,
			},
		} satisfies CollectionMigrationBatch;
	});

	for (const batch of migrationBatches) {
		const migrationRes = await migrateCollectionBatch(context, batch);
		if (migrationRes.error) return migrationRes;
	}

	return {
		data: {
			migrationPlans,
			inferedSchemas,
		},
		error: undefined,
	};
};

export default migrateCollections;
