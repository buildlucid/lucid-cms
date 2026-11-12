import {
	describe,
	expect,
	type Lucid,
	type Session,
	requires,
	test,
} from "#harness/vitest";
import { TEAM_STORY_KEY } from "#shared/collections/team-story";
import {
	approve,
	approverIds,
	blockerCodes,
	commentsOf,
	completeRequest,
	createWithTeam,
	openRequest,
	postComment,
	readRequest,
	requestAction,
	requestNotifications,
	requestTeam,
} from "#shared/requests";

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

describe("reviewing requests", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	/** Has the team create a story, then opens a request to publish it to staging and production. */
	const openTeamRequest = async (
		lucid: Lucid,
		title: string,
		options: {
			by: "author" | "reviewer";
			reviewers?: Array<"reviewer" | "secondReviewer">;
		},
	) => {
		const team = await requestTeam(lucid, TEAM_STORY_KEY);
		const id = await createWithTeam(team, TEAM_STORY_KEY, titled(title));
		const requestId = await openRequest(
			team[options.by].session,
			"publish",
			[
				{
					collectionKey: TEAM_STORY_KEY,
					documentId: id,
					targets: ["staging", "production"],
				},
			],
			{ reviewerIds: options.reviewers?.map((name) => team[name].id) },
		);
		return { team, requestId };
	};

	test("needs two approvals from people other than whoever asked, and withdrawing one keeps the other", async ({
		lucid,
	}) => {
		const { team, requestId } = await openTeamRequest(lucid, "Twice approved", {
			by: "reviewer",
		});
		const { author, reviewer, secondReviewer } = team;
		const admin = await lucid.admin();

		//* the collection doesn't allow approving your own request
		expect(
			(await readRequest(reviewer.session, requestId)).permissions.approve,
		).toBe(false);
		expect((await approve(reviewer.session, requestId)).status).toBe(403);
		expect((await approve(author.session, requestId)).status).toBe(403);

		expect((await approve(secondReviewer.session, requestId)).status).toBe(204);
		expect((await approve(secondReviewer.session, requestId)).status).toBe(409);
		const once = await readRequest(admin, requestId);
		expect(once).toMatchObject({ approved: false, requiredApprovals: 2 });
		expect(approverIds(once)).toEqual([secondReviewer.id]);

		//* super admins can approve anything, so the admin gives the second
		expect((await approve(admin, requestId)).status).toBe(204);
		expect((await readRequest(admin, requestId)).approved).toBe(true);

		expect((await requestAction(admin, requestId, "unapprove")).status).toBe(
			204,
		);
		const withdrawn = await readRequest(admin, requestId);
		expect(withdrawn.approved).toBe(false);
		expect(approverIds(withdrawn)).toEqual([secondReviewer.id]);
	});

	test("withdraws every approval when someone comments, and waits for the comment to be resolved, while replies change nothing", async ({
		lucid,
	}) => {
		const { team, requestId } = await openTeamRequest(lucid, "Discussed", {
			by: "author",
		});
		const { author, reviewer, secondReviewer } = team;
		expect((await approve(reviewer.session, requestId)).status).toBe(204);

		expect(
			(await postComment(author.session, requestId, "One more thing")).status,
		).toBe(204);
		const commented = await readRequest(author.session, requestId);
		expect(approverIds(commented)).toEqual([]);
		expect(commented.openComments).toBe(1);
		expect(blockerCodes(commented)).toEqual(["comments_open"]);
		expect((await approve(reviewer.session, requestId)).status).toBe(409);

		const [comment] = commentsOf(commented);
		if (!comment) {
			throw new Error("The comment wasn't recorded.");
		}
		const resolved = await author.session.request({
			method: "PATCH",
			path: `/api/v1/requests/${requestId}/comments/${comment.id}/resolution`,
			body: { resolution: "resolved" },
		});
		expect(resolved.status).toBe(204);
		expect((await approve(reviewer.session, requestId)).status).toBe(204);

		expect(
			(
				await postComment(
					secondReviewer.session,
					requestId,
					"Agreed",
					comment.id,
				)
			).status,
		).toBe(204);
		const replied = await readRequest(author.session, requestId);
		expect(approverIds(replied)).toEqual([reviewer.id]);
		expect(replied.openComments).toBe(0);
	});

	test("tells reviewers, approvers and whoever asked what needs them as a request moves on", async ({
		lucid,
	}) => {
		const { team, requestId } = await openTeamRequest(lucid, "Followed", {
			by: "author",
			reviewers: ["reviewer", "secondReviewer"],
		});
		const { author, reviewer, secondReviewer } = team;
		const toReview = (session: Session) =>
			requestNotifications(session, requestId, "requests:review-requested");

		for (const person of [reviewer, secondReviewer]) {
			expect(await toReview(person.session)).toEqual([
				expect.objectContaining({ actionRequired: true, resolvedAt: null }),
			]);
		}

		expect((await approve(reviewer.session, requestId)).status).toBe(204);
		expect(await toReview(reviewer.session)).toEqual([
			expect.objectContaining({ resolvedAt: expect.any(String) }),
		]);
		expect(await toReview(secondReviewer.session)).toEqual([
			expect.objectContaining({ resolvedAt: null }),
		]);
		expect(
			await requestNotifications(
				author.session,
				requestId,
				"requests:approved",
			),
		).toHaveLength(1);
		expect(
			await requestNotifications(author.session, requestId, "requests:ready"),
		).toEqual([]);

		expect((await approve(secondReviewer.session, requestId)).status).toBe(204);
		expect(
			await requestNotifications(author.session, requestId, "requests:ready"),
		).toHaveLength(1);

		await completeRequest(reviewer.session, requestId);
		for (const person of [author, secondReviewer]) {
			expect(
				await requestNotifications(
					person.session,
					requestId,
					"requests:completed",
				),
			).toHaveLength(1);
		}
	});
});
