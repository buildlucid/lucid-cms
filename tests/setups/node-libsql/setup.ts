import { defineSetup } from "#harness/setup";

export default defineSetup({
	description:
		"Node with a libSQL server over HTTP, and a KV store so responses are cached.",
	runtime: "node",
	database: "libsql",
});
