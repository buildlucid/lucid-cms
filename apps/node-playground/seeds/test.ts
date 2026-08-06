import { defineSeed } from "@lucidcms/core/plugin";
import type { TestOrganisationTable } from "../src/tables/test-organisations.js";

export default defineSeed(async (context) => {
	const now = new Date().toISOString();

	const result = await context.db
		.query("seed.test-organisations.upsert", (db) =>
			db
				.$extendTables<{ "test-organisations": TestOrganisationTable }>()
				.insertInto("test-organisations")
				.values({
					name: "Lucid CMS",
					createdAt: now,
					updatedAt: now,
				})
				.onConflict((conflict) =>
					conflict.column("name").doUpdateSet({ updatedAt: now }),
				),
		)
		.many();
	if (result.error) throw result.error;
});
