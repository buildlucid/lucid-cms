import { defineSetup } from "#harness/setup";

export default defineSetup({
	description:
		"Node with a libSQL server over HTTP, a KV store so responses are cached, and the forms plugin.",
	runtime: "node",
	database: "libsql",
});
