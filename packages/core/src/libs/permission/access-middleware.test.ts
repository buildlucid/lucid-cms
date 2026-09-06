import { Hono } from "hono";
import { expect, test } from "vitest";
import type { LucidHonoGeneric } from "../../types/hono.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import externalScopes from "../http/middleware/external-scopes.js";
import permissions from "../http/middleware/permissions.js";
import type { AccessGroup } from "./access-config.js";

declare module "./types.js" {
	interface CustomPermissions {
		"reports:read": true;
	}
}
declare module "@lucidcms/types" {
	interface CustomPermissions {
		"reports:read": true;
	}
}
declare module "./external-scopes.js" {
	interface CustomExternalScopes {
		"reports:read": true;
		"reports:system": true;
	}
}

const access: AccessGroup[] = [
	{
		key: "reports",
		name: "Reports",
		permissions: { "reports:read": { name: "Read reports" } },
		scopes: {
			"reports:read": { userPermission: "reports:read" },
			"reports:system": {
				userPermission: null,
				name: "System reports",
				principalTypes: ["system"],
			},
		},
	},
];

const { getConfig } = getTestConfig();

test("permission middleware accepts custom grants and rejects removed permissions even for super admins", async () => {
	const base = await getConfig();
	for (const [granted, registered, superAdmin, expected] of [
		[true, true, false, 200],
		[false, true, false, 403],
		[false, true, true, 200],
		[true, false, false, 403],
		[true, false, true, 403],
	] as const) {
		const app = new Hono<LucidHonoGeneric>();
		app.use("*", async (c, next) => {
			c.set("config", { ...base, access: registered ? access : [] });
			c.set("auth", {
				id: 1,
				username: "test",
				email: "test@example.com",
				superAdmin,
				permissions: granted ? ["reports:read"] : [],
				exp: 0,
				iat: 0,
				nonce: "test",
			});
			await next();
		});
		app.onError((_, c) => c.text("Denied", 403));
		app.get("/reports", permissions(["reports:read"]), (c) =>
			c.text("Allowed"),
		);
		expect((await app.request("/reports")).status).toBe(expected);
	}
});

test("scope middleware checks dynamic requirements against the current catalogue and principal", async () => {
	const base = await getConfig();
	for (const principalType of ["system", "user"] as const) {
		const app = new Hono<LucidHonoGeneric>();
		app.use("*", async (c, next) => {
			c.set("config", { ...base, access });
			c.set("externalAuth", {
				credential: { type: "api-key", integrationId: 1 },
				principal:
					principalType === "system"
						? { type: "system" }
						: { type: "user", userId: 1 },
				scopes: ["reports:read", "reports:system"],
			});
			await next();
		});
		app.onError((_, c) => c.text("Denied", 403));
		app.get(
			"/reports",
			externalScopes(() => ["reports:system"]),
			(c) => c.text("Allowed"),
		);
		expect((await app.request("/reports")).status).toBe(
			principalType === "system" ? 200 : 403,
		);
	}
});
