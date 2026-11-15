import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { PROPOSED_STORY_KEY } from "#shared/config/collections/proposed-story";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import {
	expectStatus,
	readDocument,
	saveDocument,
	titled,
} from "#shared/helpers/documents";
import {
	acknowledgeTarget,
	approve,
	approveAndCompleteRequest,
	blockerCodes,
	completeRequest,
	contributorPermissions,
	createThroughRequest,
	editProposal,
	onlyDocument,
	openProposal,
	openRequest,
	proposeChanges,
	readRequest,
	requestAction,
	requestChange,
	reviewerPermissions,
	setTargets,
} from "#shared/helpers/requests";

const createStory = (admin: Session, collectionKey: string, title: string) =>
	createThroughRequest(admin, collectionKey, titled(title));

/** Saves latest directly, returning the response so a test can check a refusal. */
const saveLatest = (
	session: Session,
	collectionKey: string,
	id: number,
	title: string,
) =>
	session.request({
		method: "POST",
		path: `/api/v1/documents/${collectionKey}/${id}`,
		body: titled(title),
	});

/** The open update requests holding a document. */
const openUpdateRequests = async (
	session: Session,
	collectionKey: string,
	id: number,
) => {
	const listed = await session.request<{ data: Array<{ id: number }> }>({
		path: "/api/v1/requests",
		query: {
			"filter[type]": "update",
			"filter[status]": "open",
			"filter[document]": `${collectionKey}:${id}`,
		},
	});
	expectStatus("Listing update requests", listed, 200);
	return listed.body.data.map((request) => request.id);
};

describe("update requests", () => {
	requires(`collection:${PROPOSED_STORY_KEY}`);

	test("proposes changes to latest, which only change once the request is completed", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Install");

		//* the collection reviews updates, so even people who can update latest propose instead
		expect(
			(await saveLatest(admin, PROPOSED_STORY_KEY, id, "Saved directly"))
				.status,
		).toBe(403);
		const latest = await readDocument(admin, PROPOSED_STORY_KEY, id);
		const requestId = await openProposal(admin, PROPOSED_STORY_KEY, id, {
			...titled("Install Lucid"),
			request: { title: "Fix the install title" },
			baseContentId: latest.contentId,
		});

		const request = await readRequest(admin, requestId);
		expect(request).toMatchObject({
			type: "update",
			title: "Fix the install title",
		});
		const document = onlyDocument(request);
		expect(document.targets.map((target) => target.target)).toEqual(["latest"]);
		expect(
			(
				await readDocument(
					admin,
					PROPOSED_STORY_KEY,
					id,
					document.versionId ?? 0,
				)
			).fields.title,
		).toBe("Install Lucid");
		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Install");

		await approveAndCompleteRequest(admin, requestId);
		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Install Lucid");
	});

	test("refuses a proposal made against latest that has changed since, opening no request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Overview");
		const stale = (await readDocument(admin, PROPOSED_STORY_KEY, id)).contentId;

		const first = await openProposal(admin, PROPOSED_STORY_KEY, id, {
			...titled("First change"),
			baseContentId: stale,
		});
		await approveAndCompleteRequest(admin, first);

		const second = await proposeChanges(admin, PROPOSED_STORY_KEY, id, {
			...titled("Made against the old latest"),
			baseContentId: stale,
		});
		expect(second.status).toBe(409);
		expect(await openUpdateRequests(admin, PROPOSED_STORY_KEY, id)).toEqual([]);
	});

	test("asks for latest edits landed meanwhile to be acknowledged before completing", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Parallel");
		const first = await openProposal(
			admin,
			PROPOSED_STORY_KEY,
			id,
			titled("First"),
		);
		const second = await openProposal(
			admin,
			PROPOSED_STORY_KEY,
			id,
			titled("Second"),
		);
		await approveAndCompleteRequest(admin, first);

		const flagged = await readRequest(admin, second);
		expect(blockerCodes(flagged)).toEqual(["acknowledge_required"]);
		expect((await approve(admin, second)).status).toBe(409);
		expect(
			(
				await acknowledgeTarget(
					admin,
					second,
					onlyDocument(flagged).id,
					"latest",
				)
			).status,
		).toBe(204);
		await approveAndCompleteRequest(admin, second);
		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Second");
	});

	test("adds changes to an open update request, but not to other request types", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const first = await createStory(admin, PROPOSED_STORY_KEY, "Guide one");
		const second = await createStory(admin, PROPOSED_STORY_KEY, "Guide two");
		const requestId = await openProposal(admin, PROPOSED_STORY_KEY, first, {
			...titled("Guide one, revised"),
			request: { title: "Guides" },
		});

		const added = await proposeChanges(admin, PROPOSED_STORY_KEY, second, {
			...titled("Guide two, revised"),
			request: { id: requestId },
		});
		expect(added.status).toBe(201);
		expect(added.body.data.requestId).toBe(requestId);
		expect(
			(await readRequest(admin, requestId)).documents.map(
				(document) => document.documentId,
			),
		).toEqual([first, second]);

		const publishing = await openRequest(admin, "publish", [
			{
				collectionKey: PROPOSED_STORY_KEY,
				documentId: first,
				targets: ["production"],
			},
		]);
		expect(
			(
				await proposeChanges(admin, PROPOSED_STORY_KEY, second, {
					...titled("Into a publish request"),
					request: { id: publishing },
				})
			).status,
		).toBe(400);
	});

	test("keeps latest as an update request's only target", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Fixed target");
		const requestId = await openProposal(
			admin,
			PROPOSED_STORY_KEY,
			id,
			titled("Changed"),
		);
		const document = onlyDocument(await readRequest(admin, requestId));
		expect(
			(
				await setTargets(admin, requestId, document.id, [
					"latest",
					"production",
				])
			).status,
		).toBe(400);
		expect(
			(
				await requestChange(admin, "update", [
					{
						collectionKey: PROPOSED_STORY_KEY,
						documentId: id,
						targets: ["production"],
					},
				])
			).status,
		).toBe(400);
	});

	test("restores a revision by proposing it, as restoring straight to latest isn't allowed", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Before");
		await approveAndCompleteRequest(
			admin,
			await openProposal(admin, PROPOSED_STORY_KEY, id, titled("After")),
		);
		const revisions = await admin.request<{ data: Array<{ id: number }> }>({
			path: `/api/v1/documents/${PROPOSED_STORY_KEY}/${id}/revisions`,
		});
		expectStatus("Listing revisions", revisions, 200);
		const revision = revisions.body.data[0];
		if (!revision) throw new Error("The completed request left no revision.");

		const restore = (body: object) =>
			admin.request<{ data: { requestId: number | null } }>({
				method: "POST",
				path: `/api/v1/documents/${PROPOSED_STORY_KEY}/${id}/${revision.id}/restore-revision`,
				body,
			});
		expect((await restore({})).status).toBe(403);
		const proposed = await restore({ request: { title: "Restore Before" } });
		expect(proposed.status).toBe(200);
		const requestId = proposed.body.data.requestId;
		if (requestId === null) throw new Error("The revision wasn't proposed.");

		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("After");
		await approveAndCompleteRequest(admin, requestId);
		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Before");
	});

	test("aligns latest with an environment by proposing it, as aligning latest directly isn't allowed", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Released");
		await approveAndCompleteRequest(
			admin,
			await openRequest(admin, "publish", [
				{
					collectionKey: PROPOSED_STORY_KEY,
					documentId: id,
					targets: ["production"],
				},
			]),
		);
		await approveAndCompleteRequest(
			admin,
			await openProposal(admin, PROPOSED_STORY_KEY, id, titled("Unreleased")),
		);
		const latest = await readDocument(admin, PROPOSED_STORY_KEY, id);
		const production = await readDocument(
			admin,
			PROPOSED_STORY_KEY,
			id,
			"production",
		);
		const align = (request?: { title: string }) =>
			admin.request<{ data: { requestId: number | null } }>({
				method: "POST",
				path: `/api/v1/documents/${PROPOSED_STORY_KEY}/${id}/${latest.versionId}/align`,
				body: {
					source: "production",
					sourceContentId: production.contentId,
					destinationContentId: latest.contentId,
					request,
				},
			});

		expect((await align()).status).toBe(403);
		const proposed = await align({ title: "Back to production" });
		expect(proposed.status).toBe(200);
		const requestId = proposed.body.data.requestId;
		if (requestId === null) throw new Error("The alignment wasn't proposed.");

		const document = onlyDocument(await readRequest(admin, requestId));
		expect(
			(
				await readDocument(
					admin,
					PROPOSED_STORY_KEY,
					id,
					document.versionId ?? 0,
				)
			).fields.title,
		).toBe("Released");
		expect(
			(await readDocument(admin, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Unreleased");
	});
});

describe("update requests between people", () => {
	requires(
		"harness:outbox",
		`collection:${PROPOSED_STORY_KEY}`,
		`collection:${REVIEWED_STORY_KEY}`,
	);

	test("contributors propose and edit their own changes, reviewers approve and editors complete", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const contributor = await lucid.user({
			permissions: contributorPermissions(PROPOSED_STORY_KEY),
		});
		const otherContributor = await lucid.user({
			permissions: contributorPermissions(PROPOSED_STORY_KEY),
		});
		//* approving needs review alone, while completing an update request needs update
		const approver = await lucid.user({
			permissions: [
				`documents:${PROPOSED_STORY_KEY}:read`,
				`documents:${PROPOSED_STORY_KEY}:review`,
			],
		});
		const editor = await lucid.user({
			permissions: reviewerPermissions(PROPOSED_STORY_KEY),
		});
		const id = await createStory(admin, PROPOSED_STORY_KEY, "Getting started");

		//* reading isn't enough to propose changes, or to align latest through a request
		const reader = await lucid.user({
			permissions: [`documents:${PROPOSED_STORY_KEY}:read`],
		});
		expect(
			(
				await proposeChanges(
					reader.session,
					PROPOSED_STORY_KEY,
					id,
					titled("Not theirs"),
				)
			).status,
		).toBe(403);
		const { versionId } = await readDocument(admin, PROPOSED_STORY_KEY, id);
		expect(
			(
				await reader.session.request({
					method: "POST",
					path: `/api/v1/documents/${PROPOSED_STORY_KEY}/${id}/${versionId}/align`,
					body: {
						source: "production",
						sourceContentId: "missing",
						destinationContentId: "missing",
						request: { title: "Not theirs" },
					},
				})
			).status,
		).toBe(403);

		expect(
			(
				await saveLatest(
					contributor.session,
					PROPOSED_STORY_KEY,
					id,
					"Not reviewed",
				)
			).status,
		).toBe(403);
		const requestId = await openProposal(
			contributor.session,
			PROPOSED_STORY_KEY,
			id,
			titled("Getting started with Lucid"),
		);
		const document = onlyDocument(
			await readRequest(contributor.session, requestId),
		);
		expect(
			(
				await editProposal(
					contributor.session,
					document,
					titled("Getting started with Lucid CMS"),
				)
			).status,
		).toBe(200);
		//* other contributors can't see someone else's request, so its proposal isn't found
		expect(
			(
				await editProposal(
					otherContributor.session,
					document,
					titled("Taken over"),
				)
			).status,
		).toBe(404);
		expect((await approve(contributor.session, requestId)).status).toBe(403);

		expect((await approve(approver.session, requestId)).status).toBe(204);
		expect(
			(await requestAction(approver.session, requestId, "complete")).status,
		).toBe(403);
		await completeRequest(editor.session, requestId);
		expect(
			(await readDocument(editor.session, PROPOSED_STORY_KEY, id)).fields.title,
		).toBe("Getting started with Lucid CMS");
	});

	test("contributors propose changes where editors save them directly", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const contributor = await lucid.user({
			permissions: contributorPermissions(REVIEWED_STORY_KEY),
		});
		const id = await createStory(admin, REVIEWED_STORY_KEY, "Changelog");

		expect(
			(await saveLatest(contributor.session, REVIEWED_STORY_KEY, id, "Direct"))
				.status,
		).toBe(403);
		const requestId = await openProposal(
			contributor.session,
			REVIEWED_STORY_KEY,
			id,
			titled("Changelog, proposed"),
		);
		expect((await readRequest(admin, requestId)).type).toBe("update");

		//* editors still save directly, which the contributor's request then asks to acknowledge
		await saveDocument(
			admin,
			REVIEWED_STORY_KEY,
			id,
			titled("Edited directly"),
		);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([
			"acknowledge_required",
		]);
	});
});
