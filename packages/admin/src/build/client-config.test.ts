// @vitest-environment node
import { build, createServer } from "vite";
import { expect, test } from "vitest";
import { adminClientConfigPlugin } from "./client-config.js";

test("emits the prepared client config in dev and production", async () => {
	const config = {
		brand: { name: "Client brand" },
	};
	const server = await createServer({
		configFile: false,
		envFile: false,
		logLevel: "silent",
		plugins: [adminClientConfigPlugin(config)],
		optimizeDeps: { noDiscovery: true, include: [] },
		server: { middlewareMode: true },
	});
	try {
		const result = await server.transformRequest(
			"\0virtual:lucid-admin-config",
		);
		expect(result?.code).toContain("Client brand");
	} finally {
		await server.close();
	}
	const result = await build({
		configFile: false,
		envFile: false,
		logLevel: "silent",
		plugins: [adminClientConfigPlugin(config)],
		build: {
			write: false,
			minify: false,
			rolldownOptions: {
				input: "virtual:lucid-admin-config",
				preserveEntrySignatures: "strict",
			},
		},
	});
	if (Array.isArray(result) || !("output" in result))
		throw new Error("Expected one build");
	const code = result.output
		.flatMap((entry) => (entry.type === "chunk" ? [entry.code] : []))
		.join("\n");
	expect(code).toContain("Client brand");
	expect(code).toContain("Object.freeze");
});
