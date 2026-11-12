import {
	describe,
	expect,
	type Lucid,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/config/collections/story";
import { TEAM_STORY_KEY } from "#shared/config/collections/team-story";
import {
	createDocument,
	readDocument,
	titled,
} from "#shared/helpers/documents";
import { waitForJob } from "#shared/helpers/jobs";
import {
	approve,
	approverIds,
	createWithTeam,
	editProposal,
	onlyDocument,
	openRequest,
	readRequest,
	requestAction,
	requestTeam,
} from "#shared/helpers/requests";

/** Opens a request to publish a new story to staging, with its proposal titled `title`. */
const openStoryRequest = async (admin: Session, title: string) => {
	const id = await createDocument(admin, STORY_KEY, titled(title));
	const requestId = await openRequest(admin, "publish", [
		{ collectionKey: STORY_KEY, documentId: id, targets: ["staging"] },
	]);
	return { id, requestId };
};

/** Waits for the jobs of `complete` calls that were accepted, so nothing is still changing. */
const settle = async (
	lucid: Lucid,
	responses: Array<{
		status: number;
		body: { data: { jobId: string } | null };
	}>,
) => {
	for (const response of responses) {
		const jobId = response.status === 202 ? response.body.data?.jobId : null;
		if (jobId) {
			await waitForJob(lucid, jobId, ["completed", "failed", "cancelled"]);
		}
	}
};

const stagingTitle = async (admin: Session, id: number) =>
	(await readDocument(admin, STORY_KEY, id)).versions.staging
		? (await readDocument(admin, STORY_KEY, id, "staging")).fields.title
		: undefined;

describe("requests changed from several places at once", () => {
	requires(`collection:${STORY_KEY}`);
	//* separate connections only block and race each other on a real Postgres server
	requires("database.concurrentWrites");

	test("completes a request once when it is completed twice at once", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await openStoryRequest(admin, "Once");
		expect((await approve(admin, requestId)).status).toBe(204);

		const completions = await Promise.all([
			requestAction(admin, requestId, "complete"),
			requestAction(admin, requestId, "complete"),
		]);
		await settle(lucid, completions);

		const request = await readRequest(admin, requestId);
		expect(request.status).toBe("completed");
		expect(
			request.events.filter((event) => event.type === "completed"),
		).toHaveLength(1);
		expect(await stagingTitle(admin, id)).toBe("Once");
	});

	test("never approves a proposal edited while it was being approved", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		for (let attempt = 0; attempt < 5; attempt++) {
			const { requestId } = await openStoryRequest(admin, "Reviewed");
			const reviewed = await readRequest(admin, requestId);

			await Promise.all([
				approve(admin, requestId, reviewed.reviewToken),
				editProposal(admin, onlyDocument(reviewed), titled("Unreviewed")),
			]);

			const request = await readRequest(admin, requestId);
			const approvedVersionId = onlyDocument(request).approvedVersionId;
			if (request.approved && approvedVersionId !== null) {
				const { documentId } = onlyDocument(request);
				expect(
					(await readDocument(admin, STORY_KEY, documentId, approvedVersionId))
						.fields.title,
				).toBe("Reviewed");
			}
		}
	});

	test("ends closed and unpublished, or completed and published, when completed and closed at once", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		for (let attempt = 0; attempt < 5; attempt++) {
			const { id, requestId } = await openStoryRequest(admin, "Either way");
			expect((await approve(admin, requestId)).status).toBe(204);

			const [completed] = await Promise.all([
				requestAction(admin, requestId, "complete"),
				requestAction(admin, requestId, "close"),
			]);
			await settle(lucid, [completed]);

			const { status } = await readRequest(admin, requestId);
			expect(["closed", "completed"]).toContain(status);
			expect(await stagingTitle(admin, id)).toBe(
				status === "completed" ? "Either way" : undefined,
			);
		}
	});

	test("lets one of two approved requests for the same environment complete, and asks the other for a new approval", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Contested"));
		const requests = await Promise.all(
			["One", "Other"].map(async (title) => {
				const requestId = await openRequest(admin, "publish", [
					{ collectionKey: STORY_KEY, documentId: id, targets: ["staging"] },
				]);
				const request = await readRequest(admin, requestId);
				expect(
					(await editProposal(admin, onlyDocument(request), titled(title)))
						.status,
				).toBe(200);
				expect((await approve(admin, requestId)).status).toBe(204);
				return { title, requestId };
			}),
		);

		const completions = await Promise.all(
			requests.map(({ requestId }) =>
				requestAction(admin, requestId, "complete"),
			),
		);
		await settle(lucid, completions);

		const results = await Promise.all(
			requests.map(async ({ title, requestId }) => ({
				title,
				request: await readRequest(admin, requestId),
			})),
		);
		const completed = results.filter(
			({ request }) => request.status === "completed",
		);
		expect(completed).toHaveLength(1);
		expect(await stagingTitle(admin, id)).toBe(completed[0]?.title);
		const other = results.find(({ request }) => request.status !== "completed");
		expect(other?.request).toMatchObject({ status: "open", approved: false });
	});
});

describe("approvals given at once", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);
	requires("database.concurrentWrites");

	test("counts two reviewers approving at once as two approvals, and one reviewer approving twice as one", async ({
		lucid,
	}) => {
		const team = await requestTeam(lucid, TEAM_STORY_KEY);
		const { author, reviewer, secondReviewer } = team;
		const open = async () => {
			const id = await createWithTeam(
				team,
				TEAM_STORY_KEY,
				titled("Approved at once"),
			);
			return openRequest(author.session, "publish", [
				{ collectionKey: TEAM_STORY_KEY, documentId: id, targets: ["staging"] },
			]);
		};

		const together = await open();
		const answers = await Promise.all([
			approve(reviewer.session, together),
			approve(secondReviewer.session, together),
		]);
		expect(answers.map((answer) => answer.status)).toEqual([204, 204]);
		const approved = await readRequest(author.session, together);
		expect(approved.approved).toBe(true);
		expect(approverIds(approved).toSorted()).toEqual(
			[reviewer.id, secondReviewer.id].toSorted(),
		);

		const twice = await open();
		const token = (await readRequest(reviewer.session, twice)).reviewToken;
		const repeated = await Promise.all([
			approve(reviewer.session, twice, token),
			approve(reviewer.session, twice, token),
		]);
		expect(repeated.map((answer) => answer.status).toSorted()).toEqual([
			204, 409,
		]);
		expect(approverIds(await readRequest(author.session, twice))).toEqual([
			reviewer.id,
		]);
	});
});
