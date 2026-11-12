import { defineSetup } from "#harness/setup";

export default defineSetup({
	description: "Node with SQLite and no plugins. The plainest setup.",
	runtime: "node",
	database: "sqlite",
});
