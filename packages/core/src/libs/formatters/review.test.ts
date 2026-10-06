import { expect, test } from "vitest";
import reviewFormatter from "./review.js";

test("review overview splits each target's counts into in sync, out of sync and unreleased", () => {
	const counts = {
		awaitingApproval: 0,
		approved: 0,
		scheduled: 0,
		failed: 0,
		assignedToMe: 0,
	};
	const overview = reviewFormatter.formatOverview({
		collections: [
			{
				key: "pages",
				targets: ["staging", "production"],
				counts: {
					total: "5",
					environments: [
						{ environment_key: "staging", released: "4", in_sync: "3" },
					],
				},
			},
		],
		requests: { publish: counts, create: counts },
	});

	expect(overview.collections).toEqual([
		{
			collectionKey: "pages",
			total: 5,
			targets: [
				{ key: "staging", inSync: 3, outOfSync: 1, unreleased: 1 },
				{ key: "production", inSync: 0, outOfSync: 0, unreleased: 5 },
			],
		},
	]);
});
