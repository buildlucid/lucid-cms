import type { Job } from "@lucidcms/core/types";
import { describe, expect, requires, test } from "#harness/vitest";
import {
	PROBE_SCHEDULES,
	SCHEDULE_CHECK_TAG,
} from "#shared/config/fragments/jobs";
import { executions } from "#shared/helpers/jobs";

describe("the runtime's job scheduler", () => {
	requires("plugin:harness-jobs");
	requires("mode:served");
	//* on an inline queue, other tests tick the scheduler themselves to retry, which would hide a missing timer
	requires("queue.delayedDelivery");

	test(
		"ticks every minute without being asked, and stores no job for a schedule its check turns down",
		{ timeout: 100_000 },
		async ({ lucid }) => {
			const since = new Date().toISOString();

			//* the `checked` schedule is due every minute, and its check posts each time it is asked
			await expect
				.poll(
					async () =>
						(
							await executions(lucid, {
								tag: SCHEDULE_CHECK_TAG,
								event: "checked",
							})
						).some((entry) => entry.at > since),
					{ timeout: 90_000, interval: 2_000 },
				)
				.toBe(true);

			const admin = await lucid.admin();
			const stored = await admin.request<{ data: Job[] }>({
				path: "/api/v1/jobs",
				query: { "filter[scheduleKey]": PROBE_SCHEDULES.checked },
			});
			expect(stored.body.data).toEqual([]);
		},
	);
});
