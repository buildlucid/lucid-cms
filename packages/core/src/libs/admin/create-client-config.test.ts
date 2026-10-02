import { expect, test } from "vitest";
import createAdminClientConfig from "./create-client-config.js";
import { adminConfigSchema } from "./schema.js";

test("copies only explicitly public values from resolved config", () => {
	const config = {
		brand: { name: "My site", privateValue: "private-brand-value" },
		admin: {
			agentHomescreen: false,
			slots: [],
			routes: [],
			scripts: [],
			stylesheets: [],
		},
		secret: "private-server-value",
	};
	const client = createAdminClientConfig(config);
	expect(client).toEqual({
		brand: { name: "My site" },
		agentHomescreen: false,
	});
	expect(client.brand).not.toBe(config.brand);
	config.brand.name = "Changed server config";
	expect(client.brand.name).toBe("My site");
});

test.each([
	undefined,
	{},
	{ agentHomescreen: true },
	{ agentHomescreen: false },
])("resolves the agent home screen setting through to the client config: %j", (admin) => {
	const client = createAdminClientConfig({
		brand: { name: "My site" },
		admin: adminConfigSchema.parse(admin),
	});
	expect(client.agentHomescreen).toBe(admin?.agentHomescreen ?? true);
});
