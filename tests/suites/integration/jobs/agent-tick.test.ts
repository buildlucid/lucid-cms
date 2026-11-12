import { randomUUID } from "node:crypto";
import { describe, expect, requires, test } from "#harness/vitest";
import { resetScheduler, tick } from "#shared/jobs";

//* its own file, as the shared admin can't be used after another test moves the clock
describe("the agent tick", () => {
	requires("plugin:harness-jobs");
	//* it writes a routine straight into the database and ticks at chosen minutes
	requires("mode:host", "feature:ai");

	test.afterEach(async ({ lucid }) => {
		await resetScheduler(lucid);
		await lucid.query((db) => db.deleteFrom("lucid_agent_routines").execute());
	});

	test("stores a job only in a minute with agent work waiting, such as a due routine", async ({
		lucid,
	}) => {
		const agentTicks = () =>
			lucid.query((db) =>
				db
					.selectFrom("lucid_jobs")
					.select("scheduled_for")
					.where("job_key", "=", "core:agent-tick")
					.execute(),
			);
		const minute = Math.ceil(Date.now() / 60_000) * 60_000;

		await tick(lucid, new Date(minute));
		expect(await agentTicks()).toEqual([]);

		await lucid.query((db) =>
			db
				.insertInto("lucid_agent_routines")
				.values({
					id: randomUUID(),
					agent_key: "lucid-agent",
					source: "own",
					name: "Harness routine",
					instructions: "Nothing to do.",
					cron: "0 9 * * *",
					timezone: "UTC",
					next_run_at: new Date(Date.now() - 60_000).toISOString(),
				})
				.execute(),
		);
		await tick(lucid, new Date(minute + 60_000));
		expect(await agentTicks()).toHaveLength(1);
	});
});
