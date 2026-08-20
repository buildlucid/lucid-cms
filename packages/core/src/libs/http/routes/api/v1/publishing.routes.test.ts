import { describe, expect, it } from "vitest";
import publishingRoutes from "./publishing.routes.js";

describe("publishing routes", () => {
	it("groups the overview and request operations under publishing", () => {
		expect(
			Array.from(
				new Set(
					publishingRoutes.routes.map(
						(route) => `${route.method} ${route.path}`,
					),
				),
			),
		).toEqual([
			"GET /overview",
			"GET /requests",
			"GET /requests/overview",
			"GET /requests/reviewers",
			"GET /requests/:id",
			"POST /requests/:id/approve",
			"POST /requests/:id/reject",
			"POST /requests/:id/cancel",
			"POST /requests/:id/reschedule",
			"POST /requests/:id/retry",
			"POST /requests/:id/reviewers",
		]);
	});
});
