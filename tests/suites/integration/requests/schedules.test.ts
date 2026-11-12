import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/collections/reviewed-story";
import { STORY_KEY } from "#shared/collections/story";
import { TEAM_STORY_KEY } from "#shared/collections/team-story";
import { createDocument, expectStatus, readDocument } from "#shared/documents";
import { waitForJob } from "#shared/jobs";
import {
	approve,
	blockerCodes,
	createThroughRequest,
	createWithTeam,
	editProposal,
	onlyDocument,
	openCreateRequest,
	openRequest,
	readRequest,
	type RequestExecution,
	requestAction,
	requestTeam,
} from "#shared/requests";

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

/** Sets or, with null, removes when a request completes, returning the response. */
const schedule = (session: Session, requestId: number, at: Date | null) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/requests/${requestId}`,
		body: { scheduledAt: at?.toISOString() ?? null },
	});

const readExecution = async (session: Session, requestId: number) => {
	const read = await session.request<{ data: RequestExecution }>({
		path: `/api/v1/requests/${requestId}/execution`,
	});
	expectStatus(`Reading request ${requestId}'s execution`, read, 200);
	return read.body.data;
};

/** Schedules are kept to the minute, rounded up. */
const toMinute = (date: Date) => Math.ceil(date.getTime() / 60_000) * 60_000;

/** Opens a scheduled request to publish a new reviewed story to production, and approves it. */
const scheduleStory = async (admin: Session, title: string, at: Date) => {
	const id = await createThroughRequest(
		admin,
		REVIEWED_STORY_KEY,
		titled(title),
	);
	const requestId = await openRequest(admin, "publish", [
		{
			collectionKey: REVIEWED_STORY_KEY,
			documentId: id,
			targets: ["production"],
		},
	]);
	expectStatus(
		`Scheduling ${title}`,
		await schedule(admin, requestId, at),
		204,
	);
	expectStatus(`Approving ${title}`, await approve(admin, requestId), 204);
	return { id, requestId };
};

/** The job queued for a request, which must have one. */
const jobOf = async (admin: Session, requestId: number) => {
	const execution = await readExecution(admin, requestId);
	if (!execution) {
		throw new Error(`Request ${requestId} has no job.`);
	}
	return execution;
};

describe("scheduled requests", () => {
	requires(`collection:${REVIEWED_STORY_KEY}`);
	//* the queue holds each request's job until its time
	requires("queue.delayedDelivery");

	test(
		"completes approved requests at their time, and never ones closed or changed since they were approved",
		//* schedules are kept to the minute, so this waits for the next one
		{ timeout: 120_000 },
		async ({ lucid }) => {
			const admin = await lucid.admin();
			//* far enough ahead that a slow server still schedules all four before it passes
			const at = new Date(Date.now() + 15_000);

			const created = await openCreateRequest(admin, REVIEWED_STORY_KEY, {
				title: "Create on time",
				...titled("Created on time"),
			});
			expect((await schedule(admin, created.requestId, at)).status).toBe(204);
			expect((await approve(admin, created.requestId)).status).toBe(204);
			const closed = await scheduleStory(admin, "Closed", at);
			const changed = await scheduleStory(admin, "Changed", at);
			const reapproved = await scheduleStory(admin, "Reapproved", at);

			const jobs = [
				await jobOf(admin, created.requestId),
				await jobOf(admin, closed.requestId),
				await jobOf(admin, changed.requestId),
			];
			expect(jobs.map((job) => Date.parse(job.runAt ?? ""))).toEqual(
				jobs.map(() => toMinute(at)),
			);

			expect(
				(await requestAction(admin, closed.requestId, "close")).status,
			).toBe(204);
			for (const { requestId } of [changed, reapproved]) {
				const request = await readRequest(admin, requestId);
				expectStatus(
					`Editing request ${requestId}'s proposal`,
					await editProposal(
						admin,
						onlyDocument(request),
						titled("Edited after approval"),
					),
					200,
				);
			}
			expect(await readExecution(admin, changed.requestId)).toBeNull();
			expect((await approve(admin, reapproved.requestId)).status).toBe(204);
			jobs.push(await jobOf(admin, reapproved.requestId));

			for (const job of jobs) {
				const finished = await waitForJob(lucid, job.jobId, "completed", {
					timeout: 90_000,
				});
				expect(Date.parse(finished.startedAt ?? "")).toBeGreaterThanOrEqual(
					toMinute(at),
				);
			}

			expect((await readRequest(admin, created.requestId)).status).toBe(
				"completed",
			);
			expect(
				(await readDocument(admin, REVIEWED_STORY_KEY, created.id)).fields
					.title,
			).toBe("Created on time");
			expect((await readRequest(admin, reapproved.requestId)).status).toBe(
				"completed",
			);
			expect(
				(
					await readDocument(
						admin,
						REVIEWED_STORY_KEY,
						reapproved.id,
						"production",
					)
				).fields.title,
			).toBe("Edited after approval");
			for (const { id, requestId } of [closed, changed]) {
				expect((await readRequest(admin, requestId)).status).not.toBe(
					"completed",
				);
				expect(
					(await readDocument(admin, REVIEWED_STORY_KEY, id)).versions
						.production,
				).toBeNull();
			}
		},
	);

	test("queues an approved request again for its new time, and holds it for completing by hand once the schedule is removed", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const first = new Date(Date.now() + 60 * 60_000);
		const later = new Date(Date.now() + 2 * 60 * 60_000);
		const { requestId } = await scheduleStory(admin, "Moved", first);
		const queued = await jobOf(admin, requestId);
		expect(Date.parse(queued.runAt ?? "")).toBe(toMinute(first));

		expect((await schedule(admin, requestId, later)).status).toBe(204);
		const moved = await jobOf(admin, requestId);
		expect(moved.jobId).not.toBe(queued.jobId);
		expect(Date.parse(moved.runAt ?? "")).toBe(toMinute(later));
		//* changing when doesn't change what, so the approval stays
		expect((await readRequest(admin, requestId)).approved).toBe(true);

		expect((await schedule(admin, requestId, null)).status).toBe(204);
		expect(await readExecution(admin, requestId)).toBeNull();
		expect(await readRequest(admin, requestId)).toMatchObject({
			approved: true,
			scheduledAt: null,
			status: "open",
		});
	});
});

describe("schedules that can't be kept", () => {
	requires(`collection:${STORY_KEY}`);

	test("blocks a scheduled request in a collection that doesn't allow scheduling", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Unscheduled"));
		const requestId = await openRequest(admin, "publish", [
			{ collectionKey: STORY_KEY, documentId: id, targets: ["staging"] },
		]);

		expect(
			(await schedule(admin, requestId, new Date(Date.now() + 60 * 60_000)))
				.status,
		).toBe(204);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([
			"scheduling_unavailable",
		]);
		expect((await approve(admin, requestId)).status).toBe(409);

		expect((await schedule(admin, requestId, null)).status).toBe(204);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([]);
	});
});

describe("who schedules requests", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	test("lets only people who can complete a request schedule it", async ({
		lucid,
	}) => {
		const team = await requestTeam(lucid, TEAM_STORY_KEY);
		const id = await createWithTeam(team, TEAM_STORY_KEY, titled("Timed"));
		const requestId = await openRequest(team.author.session, "publish", [
			{ collectionKey: TEAM_STORY_KEY, documentId: id, targets: ["staging"] },
		]);
		const at = new Date(Date.now() + 60 * 60_000);

		expect((await schedule(team.author.session, requestId, at)).status).toBe(
			403,
		);
		expect((await schedule(team.reviewer.session, requestId, at)).status).toBe(
			204,
		);
	});
});
