import { defineSetup } from "#harness/setup";

export default defineSetup({
	description:
		"Node with SQLite and no plugins. The baseline every other setup is compared to.",
	runtime: "node",
	database: "sqlite",
});
