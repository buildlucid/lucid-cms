import type { CollectionTableNames } from "../../exports/types.js";
import collections from "../../libs/collection/collections.js";
import { getFieldDatabaseConfig } from "../../libs/collection/custom-fields/storage/index.js";
import type { FieldDatabaseMode } from "../../libs/collection/custom-fields/types.js";
import getMigrationStatus from "../../libs/collection/get-collection-migration-status.js";
import getRuntimeSchema from "../../libs/collection/schema/runtime/get-runtime-schema.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { CollectionSchemaTable } from "../../libs/collection/schema/types.js";
import type { ServiceFn } from "../../utils/services/types.js";

type ReadonlySchema<T> = T extends object
	? { readonly [K in keyof T]: ReadonlySchema<T[K]> }
	: T;

/** Reads the effective schema and migration status without changing collection tables. */
const getSchema: ServiceFn<
	[{ collectionKey: string }],
	{
		readonly collectionKey: string;
		/** Typed names for document, version and collection field queries. */
		readonly names: Readonly<CollectionTableNames>;
		/** True when the current collection config needs a database migration. No migration is run here. */
		readonly requiresMigration: boolean;
		/** Tables, columns and relationships available for custom queries. */
		readonly tables: readonly ReadonlySchema<
			CollectionSchemaTable & { storage: FieldDatabaseMode | null }
		>[];
	}
> = async (context, data) => {
	const collection = await collections.getSingle(context, {
		key: data.collectionKey,
	});
	if (collection.error) return collection;

	const [schema, names, migration] = await Promise.all([
		getRuntimeSchema(context, data),
		getTableNames(context, data.collectionKey),
		getMigrationStatus(context, { collection: collection.data }),
	]);
	if (schema.error) return schema;
	if (names.error) return names;
	if (migration.error) return migration;

	return {
		error: undefined,
		data: {
			collectionKey: data.collectionKey,
			names: names.data,
			requiresMigration: migration.data.requiresMigration,
			tables: schema.data.tables.map((table) => ({
				...structuredClone(table),
				storage:
					getFieldDatabaseConfig(table.type)?.mode ??
					(table.type === "brick" || table.type === "document-fields"
						? "column"
						: null),
			})),
		},
	};
};

export default getSchema;
