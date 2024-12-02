import { expect, test } from "vitest";
import path from "node:path";
import getConfig from "./get-config.js";

test("should return lucid config object", async () => {
	const config = await getConfig({
		path: path.resolve(__dirname, "./mock-config/lucid.config.ts"),
	});

	expect(typeof config).toBe("object");
	expect(config).toBeDefined();
});
