// @vitest-environment node
import { createServer, type Plugin } from "vite";
import { expect, test } from "vitest";
import scopePlugin from "./scope-plugin.js";

const modules: Plugin = {
	name: "test:modules",
	resolveId: (id) => (id.startsWith("virtual:") ? `\0${id}` : undefined),
	load: (id) => (id.startsWith("\0virtual:") ? "export default 1;" : undefined),
};

const compiler: Plugin = {
	name: "test:compiler",
	configEnvironment: () => ({ define: { __COMPILED__: "true" } }),
	transform: (code) => `${code}\nexport const compiled = true;`,
};

test("only compiles included modules in the client environment", async () => {
	const server = await createServer({
		configFile: false,
		envFile: false,
		logLevel: "silent",
		plugins: [
			modules,
			scopePlugin(compiler, (id) => id.includes("virtual:admin")),
		],
		optimizeDeps: { noDiscovery: true, include: [] },
		server: { middlewareMode: true },
	});
	try {
		const { client, ssr } = server.environments;
		const transform = async (
			environment: typeof client,
			id: string,
		): Promise<string | undefined> =>
			(await environment.transformRequest(id))?.code;

		expect(await transform(client, "\0virtual:admin")).toContain("compiled");
		expect(await transform(client, "\0virtual:site")).not.toContain("compiled");
		expect(await transform(ssr, "\0virtual:admin")).not.toContain("compiled");
		expect(client.config.define).toMatchObject({ __COMPILED__: "true" });
		expect(ssr.config.define?.__COMPILED__).toBeUndefined();
	} finally {
		await server.close();
	}
});
