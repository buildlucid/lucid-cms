import { defineMigration } from "@lucidcms/core";
import { SUBMISSION_FILES_TABLE } from "../constants.js";

export default defineMigration({
	async up({ context }) {
		const schema = context.db.kysely.schema;
		const adapter = context.config.db;
		const integer = adapter.getDataType("integer");

		await schema
			.createTable(SUBMISSION_FILES_TABLE)
			.addColumn("id", adapter.getDataType("primary"), (col) =>
				adapter.primaryKeyColumnBuilder(col),
			)
			.addColumn("submission_id", integer, (col) => col.notNull())
			.addColumn("media_id", integer, (col) =>
				col.notNull().references("lucid_media.id").onDelete("cascade"),
			)
			.execute();

		await schema
			.createIndex(`${SUBMISSION_FILES_TABLE}_submission`)
			.on(SUBMISSION_FILES_TABLE)
			.columns(["submission_id", "media_id"])
			.unique()
			.execute();
	},
	async down({ context }) {
		await context.db.kysely.schema.dropTable(SUBMISSION_FILES_TABLE).execute();
	},
});
