import { defineSetup } from "#harness/setup";

export default defineSetup({
	description:
		"A Cloudflare Worker with Postgres through Hyperdrive and media in R2.",
	runtime: "cloudflare",
	database: "postgres",
	//* a Worker only runs in workerd, so it cannot be hosted inside a Node test process
	modes: ["served", "project"],
});
