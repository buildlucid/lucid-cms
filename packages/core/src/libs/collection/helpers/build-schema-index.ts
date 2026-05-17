import type DatabaseAdapter from "../../db/adapter-base.js";
import type { CollectionSchemaIndex } from "../schema/types.js";
import buildIndexName from "./build-index-name.js";

/**
 * Creates schema-level index metadata with the same deterministic name rules
 * used by migration planning and DB introspection.
 */
const buildSchemaIndex = (props: {
	db: DatabaseAdapter;
	tableName: string;
	columns: string[];
	source: CollectionSchemaIndex["source"];
	unique?: boolean;
}): CollectionSchemaIndex => ({
	name: buildIndexName({
		tableName: props.tableName,
		columns: props.columns,
		tableNameByteLimit: props.db.config.tableNameByteLimit,
	}),
	columns: props.columns,
	source: props.source,
	unique: props.unique,
});

export default buildSchemaIndex;
