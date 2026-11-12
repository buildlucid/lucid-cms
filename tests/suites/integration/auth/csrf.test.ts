import { describe, expect, requires, test } from "#harness/vitest";
import {
	type RouteEntry,
	type RouteKey,
	resolveRoute,
	routes,
} from "#shared/helpers/permissions";

/** Routes that change something without a session, so a forged request has nothing to ride on. */
const EXEMPT: Partial<Record<RouteKey, string>> = {
	"POST /api/oauth/token": "OAuth clients send their own credentials.",
	"POST /api/oauth/revoke": "OAuth clients send their own credentials.",
	"PUT /api/v1/fs/upload": "Uploads carry a signed link.",
	"PUT /api/v1/media/r2/storage/upload": "Uploads carry a signed link.",
	"POST /api/v1/deploys/runs/{id}/callback": "Deploy providers sign callbacks.",
	"POST /api/v1/deploys/{key}/webhook": "Deploy webhooks carry a secret.",
	"POST /api/v1/content/preview": "Preview links carry a token.",
	"POST /api/v1/share/{token}/authorize":
		"Share links are public, so a forged request unlocks nothing the sender can't.",
	"POST /api/v1/share/{token}/download":
		"Share links are public, and a forged request can't read the file it gets.",
};

describe("cross-site request forgery", () => {
	requires("harness:outbox");

	test("every route that changes something with a session refuses a request without the CSRF token", async ({
		lucid,
	}) => {
		//* its own super admin, so a route that wrongly went ahead only changes this user
		const { session } = await lucid.user({ superAdmin: true });
		const changing = (
			Object.entries(routes) as Array<[RouteKey, RouteEntry]>
		).filter(
			([key, entry]) =>
				!key.startsWith("GET ") &&
				entry.kind !== "scope" &&
				!(key in EXEMPT) &&
				(entry.plugin === undefined ||
					lucid.capabilities.includes(`plugin:${entry.plugin}`)),
		);

		const accepted: string[] = [];
		for (const [key, entry] of changing) {
			const { method, path } = resolveRoute(key, entry);
			const response = await session.request<{ code?: string }>({
				method,
				path,
				query: entry.query,
				body: entry.body ?? {},
				csrf: false,
			});
			if (response.status !== 403 || response.body?.code !== "csrf") {
				accepted.push(`${key} gave ${response.status}`);
			}
		}

		expect(changing.length).toBeGreaterThan(100);
		expect(accepted).toEqual([]);
	});
});
