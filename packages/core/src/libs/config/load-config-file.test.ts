import { expect, test } from "vitest";
import path from "node:path";
import loadConfigFile from "./load-config-file.js";

test("should return lucid config object", async () => {
	const res = await loadConfigFile({
		path: path.resolve(__dirname, "./mock-config/lucid.config.ts"),
	});

	expect(typeof res.config).toBe("object");
	expect(res.config).toBeDefined();
});

test("should return lucid adapter object", async () => {
	const res = await loadConfigFile({
		path: path.resolve(__dirname, "./mock-config/lucid.config.ts"),
	});

	expect(typeof res.adapter).toBe("object");
	expect(res.adapter).toBeDefined();
});
