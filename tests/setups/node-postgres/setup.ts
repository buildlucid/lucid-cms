import { defineSetup } from "#harness/setup";

export default defineSetup({
	description: "Node with Postgres, localization and the pages plugin.",
	runtime: "node",
	database: "postgres",
});
