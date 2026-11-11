/**
 * Serves a CMS on a free local port and prints it when ready. Migration tests use separate
 * processes to isolate server state.
 *
 * Usage: node serve-host.ts <configPath> <databaseUrl> [schemaStep]
 */
import bootHost from "../targets/boot-host.ts";
import serveFetch from "../utils/serve-fetch.ts";

const [configPath, databaseUrl, schemaStep] = process.argv.slice(2);
if (!configPath || !databaseUrl) {
	throw new Error(
		"Usage: serve-host.ts <configPath> <databaseUrl> [schemaStep]",
	);
}

const host = await bootHost({
	configPath,
	databaseUrl,
	env: { HARNESS_SCHEMA_STEP: schemaStep },
});
//* requests keep the address the CMS believes it is served from, as they do in host mode
const server = await serveFetch(host.transport, { base: host.url });
console.log(server.port);

process.once("SIGTERM", async () => {
	await server.close();
	await host.close();
	process.exit(0);
});
