// @vitest-environment node

import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "vite";
import { expect, test } from "vitest";
import publicAssetsPlugin from "./public-assets-plugin.js";

test("serves public files mapped to new paths from Vite's public directory, leaving the rest to Vite", async () => {
	const root = await realpath(
		await mkdtemp(path.join(tmpdir(), "lucid-public-")),
	);
	const logo = path.join(root, "public/logo.svg");
	await mkdir(path.dirname(logo));
	await writeFile(logo, "<svg></svg>");
	const server = await createServer({
		root,
		configFile: false,
		logLevel: "silent",
		appType: "custom",
		server: { middlewareMode: true, ws: false, watch: null },
		plugins: [
			publicAssetsPlugin([
				{ path: logo, name: "logo.svg" },
				{ path: logo, name: "branding/logo.svg" },
			]),
		],
	});
	const listener = http.createServer(server.middlewares);
	try {
		await new Promise<void>((resolve) =>
			listener.listen(0, "127.0.0.1", resolve),
		);
		const address = listener.address();
		if (!address || typeof address === "string") {
			throw new Error("Expected a port.");
		}
		const get = async (pathname: string) => {
			const response = await fetch(
				`http://127.0.0.1:${address.port}${pathname}`,
			);
			return {
				status: response.status,
				type: response.headers.get("content-type"),
				body: await response.text(),
			};
		};

		await expect(get("/branding/logo.svg")).resolves.toEqual({
			status: 200,
			type: "image/svg+xml",
			body: "<svg></svg>",
		});
		await expect(get("/logo.svg")).resolves.toMatchObject({
			status: 200,
			body: "<svg></svg>",
		});
	} finally {
		listener.closeAllConnections();
		await new Promise<void>((resolve) => listener.close(() => resolve()));
		await server.close();
		await rm(root, { recursive: true, force: true });
	}
});
