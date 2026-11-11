/**
 * Serves a CMS on a free local port and prints it when ready. Migration tests use separate
 * processes to isolate server state.
 *
 * Usage: node serve-host.ts <configPath> <databaseUrl> [schemaStep]
 */
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { buffer } from "node:stream/consumers";
import bootHost from "../targets/boot-host.ts";

const [configPath, databaseUrl, schemaStep] = process.argv.slice(2);
if (!configPath || !databaseUrl) {
	throw new Error(
		"Usage: serve-host.ts <configPath> <databaseUrl> [schemaStep]",
	);
}

const host = await bootHost({ configPath, databaseUrl, schemaStep });

const server = createServer(async (incoming, outgoing) => {
	const headers = new Headers();
	for (const [name, value] of Object.entries(incoming.headers)) {
		for (const item of [value].flat()) {
			if (item !== undefined) {
				headers.append(name, item);
			}
		}
	}
	const hasBody = incoming.method !== "GET" && incoming.method !== "HEAD";

	//* requests keep the address the CMS believes it is served from, as they do in host mode
	const response = await host.transport(
		new Request(new URL(incoming.url ?? "/", host.url), {
			method: incoming.method,
			headers,
			body: hasBody ? await buffer(incoming) : undefined,
		}),
	);

	outgoing.statusCode = response.status;
	for (const [name, value] of response.headers) {
		if (name !== "set-cookie") {
			outgoing.setHeader(name, value);
		}
	}
	outgoing.setHeader("set-cookie", response.headers.getSetCookie());
	outgoing.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(0, "127.0.0.1", () => {
	console.log((server.address() as AddressInfo).port);
});

process.once("SIGTERM", async () => {
	server.close();
	server.closeAllConnections();
	await host.close();
	process.exit(0);
});
