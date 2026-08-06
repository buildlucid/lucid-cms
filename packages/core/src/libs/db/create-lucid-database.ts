import { LucidError } from "../../utils/errors/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import inferCollectionSchema from "../collection/schema/infer-schema.js";
import { translate } from "../i18n/index.js";
import type DatabaseAdapter from "./adapter-base.js";
import LucidDatabase from "./client/lucid-database.js";
import {
	defineRuntimeTable,
	type TableDefinition,
} from "./client/table/definition.js";
import { coreTableDefinitions } from "./tables/index.js";
import type { KyselyDB } from "./types.js";

export type CreateLucidDatabaseOptions = {
	client: KyselyDB;
	adapter: DatabaseAdapter;
	collections?: readonly CollectionBuilder[];
	/** Table metadata registered through `config.tables` at runtime. */
	tables?: readonly TableDefinition[];
};

/** Creates a Lucid database with every core and generated collection table. */
const createLucidDatabase = (options: CreateLucidDatabaseOptions) => {
	const database = LucidDatabase.create({
		client: options.client,
		adapter: options.adapter,
		tables: [...coreTableDefinitions, ...(options.tables ?? [])],
	});

	for (const collection of options.collections ?? []) {
		const schema = inferCollectionSchema(collection, options.adapter);
		if (schema.error) {
			throw new LucidError({
				message: translate(
					schema.error.message ?? "server:core.collections.schema.infer.failed",
				),
			});
		}

		for (const table of schema.data.tables) {
			database.registerTable(
				defineRuntimeTable({
					name: table.name,
					columns: table.columns,
				}),
			);
		}
	}

	return database;
};

export default createLucidDatabase;
