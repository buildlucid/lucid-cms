import { expect, test } from "vitest";
import createAdminClientConfig from "./create-client-config.js";

test("copies only explicitly public values from resolved config", () => {
	const config = {
		brand: { name: "My site", privateValue: "private-brand-value" },
		secret: "private-server-value",
	};
	const client = createAdminClientConfig(config);
	expect(client).toEqual({ brand: { name: "My site" } });
	expect(client.brand).not.toBe(config.brand);
	config.brand.name = "Changed server config";
	expect(client.brand.name).toBe("My site");
});
