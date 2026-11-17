import { defineSetup } from "#harness/setup";

export default defineSetup({
	description:
		"Node with Postgres, localization and the pages and forms plugins.",
	runtime: "node",
	database: "postgres",
});
