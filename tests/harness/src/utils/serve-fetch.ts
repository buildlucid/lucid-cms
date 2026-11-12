import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { buffer } from "node:stream/consumers";

/**
 * Serves a fetch-style handler on a free local port. `base` replaces the address requests arrive
 * on, for a CMS that believes it is served from elsewhere. Response bodies stream as they are
 * written, and a request's `signal` aborts when the client goes away.
 */
const serveFetch = async (
	handler: (request: Request) => Promise<Response>,
	options?: { base?: string },
): Promise<{ url: string; port: number; close(): Promise<void> }> => {
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
		const base =
			options?.base ?? `http://${incoming.headers.host ?? "127.0.0.1"}`;
		const disconnect = new AbortController();
		outgoing.on("close", () => {
			if (!outgoing.writableFinished) {
				disconnect.abort();
			}
		});

		const response = await handler(
			new Request(new URL(incoming.url ?? "/", base), {
				method: incoming.method,
				headers,
				body: hasBody ? await buffer(incoming) : undefined,
				signal: disconnect.signal,
			}),
		).catch(
			(error: unknown) =>
				new Response(error instanceof Error ? error.message : String(error), {
					status: 500,
				}),
		);

		outgoing.statusCode = response.status;
		for (const [name, value] of response.headers) {
			if (name !== "set-cookie") {
				outgoing.setHeader(name, value);
			}
		}
		outgoing.setHeader("set-cookie", response.headers.getSetCookie());
		if (!response.body) {
			outgoing.end();
			return;
		}

		//* written chunk by chunk, so an event stream reaches the client as it happens
		outgoing.flushHeaders();
		try {
			for await (const chunk of response.body) {
				if (disconnect.signal.aborted) {
					break;
				}
				outgoing.write(chunk);
			}
		} catch {
			//* the handler's stream failed or was cancelled, so the response ends where it got to
		}
		outgoing.end();
	});

	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as AddressInfo;

	return {
		url: `http://127.0.0.1:${port}`,
		port,
		close: async () => {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
		},
	};
};

export default serveFetch;
