import { EventEmitter } from "node:events";
import type { Connect, ViteDevServer } from "vite";
import { expect, test, vi } from "vitest";
import lucidDevPlugin from "./lucid-dev-plugin.js";
import type { LucidPluginProps } from "./types.js";

vi.mock("../logger/index.js", () => ({
	startLoggerBuffering: vi.fn(),
	stopLoggerBuffering: vi.fn(async () => {}),
}));

/** A dev server that never listens, so its start-up waits until it closes. */
const createServer = () => {
	let middleware: Connect.NextHandleFunction | undefined;
	const httpServer = new EventEmitter();
	const server = {
		environments: {},
		middlewares: {
			use: (handler: Connect.NextHandleFunction) => {
				middleware = handler;
			},
		},
		httpServer,
	};
	return {
		server: server as unknown as ViteDevServer,
		close: () => httpServer.emit("close"),
		/** Sends a request through Lucid's readiness check, resolving with its status, or `next` once it passes. */
		request: () =>
			new Promise<number | "next">((resolve) => {
				const response = {
					statusCode: 200,
					setHeader: () => {},
					end: () => resolve(response.statusCode),
				};
				middleware?.(
					{ headers: {} } as Connect.IncomingMessage,
					response as never,
					() => resolve("next"),
				);
			}),
	};
};

test("closing a server stops only its own start-up when a replacement reuses the plugin", async () => {
	const onReady = vi.fn();
	const plugin = lucidDevPlugin({
		onReady,
		token: "token",
	} as unknown as LucidPluginProps & { onReady: typeof onReady });
	if (typeof plugin.configureServer !== "function") {
		throw new Error("Missing configureServer");
	}

	const previous = createServer();
	const replacement = createServer();
	// Vite configures the replacement before it closes the server it replaces.
	await plugin.configureServer.call({} as never, previous.server);
	await plugin.configureServer.call({} as never, replacement.server);
	previous.close();

	expect(await previous.request()).toBe(503);
	expect(onReady).toHaveBeenCalledExactlyOnceWith(false);
	const replacementResult = await Promise.race([
		replacement.request(),
		new Promise((resolve) => setTimeout(() => resolve("waiting"), 20)),
	]);
	expect(replacementResult).toBe("waiting");
});
