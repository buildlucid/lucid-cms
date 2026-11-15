import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import { TEAM_STORY_KEY } from "#shared/config/collections/team-story";
import {
	createContentReader,
	publishDocument,
	readContent,
	readDocument,
	saveDocument,
	titled,
} from "#shared/helpers/documents";
import {
	acknowledgeTarget,
	approve,
	blockerCodes,
	completeRequest,
	createThroughRequest,
	createWithTeam,
	editProposal,
	onlyDocument,
	openRequest,
	readRequest,
	refreshFromLatest,
	requestAction,
	requestChange,
	requestTeam,
	setTargets,
} from "#shared/helpers/requests";

/** A reviewed story in one request, with the given targets. */
const reviewed = (documentId: number, targets: string[]) => [
	{ collectionKey: REVIEWED_STORY_KEY, documentId, targets },
];

const createStory = (admin: Session, title: string) =>
	createThroughRequest(admin, REVIEWED_STORY_KEY, {
		title: `Create ${title}`,
		...titled(title),
	});

describe("publish requests", () => {
	requires(`collection:${REVIEWED_STORY_KEY}`);

	test("publishes the content that was approved, not later edits to latest", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session, [
			REVIEWED_STORY_KEY,
		]);
		const id = await createStory(admin, "Approved");
		const requestId = await openRequest(
			admin,
			"publish",
			reviewed(id, ["production"]),
		);
		expect((await approve(admin, requestId)).status).toBe(204);

		//* latest isn't a target, so editing it keeps the approval
		await saveDocument(admin, REVIEWED_STORY_KEY, id, titled("Edited later"));
		expect((await readRequest(admin, requestId)).approved).toBe(true);
		await completeRequest(admin, requestId);

		expect(
			(await readContent(read, REVIEWED_STORY_KEY, id, "production"))?.fields
				.title,
		).toBe("Approved");
		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id)).fields.title,
		).toBe("Edited later");
	});

	test("keeps its copy of latest read only, and asks for a new approval once it's refreshed from latest", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, "Reconsidered");
		const requestId = await openRequest(
			admin,
			"publish",
			reviewed(id, ["production"]),
		);
		expect((await approve(admin, requestId)).status).toBe(204);
		const approved = await readRequest(admin, requestId);
		const document = onlyDocument(approved);

		//* publish requests move content, so their copy changes only by refreshing it from latest
		expect(
			(await editProposal(admin, document, titled("Edited copy"))).status,
		).toBe(403);
		await saveDocument(
			admin,
			REVIEWED_STORY_KEY,
			id,
			titled("Fixed in latest"),
		);
		expect(
			(await refreshFromLatest(admin, requestId, document.id)).status,
		).toBe(204);

		const refreshed = await readRequest(admin, requestId);
		expect(refreshed).toMatchObject({ approved: false, approvals: [] });
		expect(refreshed.revision).toBeGreaterThan(approved.revision);
		expect((await requestAction(admin, requestId, "complete")).status).toBe(
			409,
		);
		expect((await approve(admin, requestId)).status).toBe(204);
		await completeRequest(admin, requestId);
		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id, "production")).fields
				.title,
		).toBe("Fixed in latest");
	});

	test("waits for a target someone else published to be acknowledged, before and after approval", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, "Contested");
		//* staging needs no review, so it can also be published to directly
		const requestId = await openRequest(
			admin,
			"publish",
			reviewed(id, ["staging"]),
		);
		const requestDocumentId = onlyDocument(
			await readRequest(admin, requestId),
		).id;

		await saveDocument(
			admin,
			REVIEWED_STORY_KEY,
			id,
			titled("Published around it"),
		);
		await publishDocument(admin, REVIEWED_STORY_KEY, id, "staging");
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([
			"acknowledge_required",
		]);
		expect((await approve(admin, requestId)).status).toBe(409);

		expect(
			(await acknowledgeTarget(admin, requestId, requestDocumentId, "staging"))
				.status,
		).toBe(204);
		expect((await approve(admin, requestId)).status).toBe(204);

		//* a change to a target after approval withdraws the approval, so it is acknowledged again
		await publishDocument(admin, REVIEWED_STORY_KEY, id, "staging");
		const flagged = await readRequest(admin, requestId);
		expect(flagged.approved).toBe(false);
		expect(blockerCodes(flagged)).toEqual(["acknowledge_required"]);
		expect((await requestAction(admin, requestId, "complete")).status).toBe(
			409,
		);
		expect(
			(await acknowledgeTarget(admin, requestId, requestDocumentId, "staging"))
				.status,
		).toBe(204);
		expect((await approve(admin, requestId)).status).toBe(204);
		await completeRequest(admin, requestId);
		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id, "staging")).fields
				.title,
		).toBe("Contested");
	});

	test("never targets latest, which update requests change instead", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, "Original");
		expect(
			(await requestChange(admin, "publish", reviewed(id, ["latest"]))).status,
		).toBe(400);
	});
});

describe("publish requests between people", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	test("publishes production only once staging holds the same content, in the order the collection asks for", async ({
		lucid,
	}) => {
		const team = await requestTeam(lucid, TEAM_STORY_KEY);
		const { author, reviewer, secondReviewer } = team;
		const id = await createWithTeam(team, TEAM_STORY_KEY, titled("In order"));
		const requestId = await openRequest(author.session, "publish", [
			{
				collectionKey: TEAM_STORY_KEY,
				documentId: id,
				targets: ["production"],
			},
		]);
		const request = await readRequest(author.session, requestId);
		expect(request.blockers).toEqual([
			expect.objectContaining({
				code: "prerequisite",
				target: "production",
				required: "staging",
			}),
		]);

		expect(
			(
				await setTargets(author.session, requestId, onlyDocument(request).id, [
					"production",
					"staging",
				])
			).status,
		).toBe(204);
		expect((await readRequest(author.session, requestId)).blockers).toEqual([]);

		for (const approver of [reviewer, secondReviewer]) {
			expect((await approve(approver.session, requestId)).status).toBe(204);
		}
		await completeRequest(reviewer.session, requestId);
		for (const environment of ["staging", "production"]) {
			expect(
				(await readDocument(reviewer.session, TEAM_STORY_KEY, id, environment))
					.fields.title,
			).toBe("In order");
		}
	});
});
