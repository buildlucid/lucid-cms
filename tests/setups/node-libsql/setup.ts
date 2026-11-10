import { defineSetup } from "#harness/setup";

export default defineSetup({
	description: "Node with a libSQL server over HTTP.",
	runtime: "node",
	database: "libsql",
});
