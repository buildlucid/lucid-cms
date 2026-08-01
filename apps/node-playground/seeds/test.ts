import { defineSeed } from "@lucidcms/core/plugin";

type TestOrganisationTable = {
	name: string;
	createdAt: string;
	updatedAt: string;
};

export default defineSeed(async (context) => {
	const now = new Date().toISOString();

	const db = context.db.client.withTables<{
		"test-organisations": TestOrganisationTable;
	}>();

	await db
		.insertInto("test-organisations")
		.values({
			name: "Lucid CMS",
			createdAt: now,
			updatedAt: now,
		})
		.onConflict((conflict) =>
			conflict.column("name").doUpdateSet({ updatedAt: now }),
		)
		.execute();
});
