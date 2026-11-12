import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STAGED_STORY_KEY, STAGES } from "#shared/collections/staged-story";
import { expectStatus, saveDocument } from "#shared/documents";
import {
	approve,
	approveAndCompleteRequest,
	blockerCodes,
	editProposal,
	onlyDocument,
	openCreateRequest,
	openRequest,
	readRequest,
} from "#shared/requests";

const DOCUMENTS = `/api/v1/documents/${STAGED_STORY_KEY}`;

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

/** Moves latest, or a request's proposal when given its version, to a workflow stage, returning the response. */
const moveStage = (
	session: Session,
	id: number,
	stage: string,
	versionId?: number | null,
) =>
	session.request({
		method: "PATCH",
		path: `${DOCUMENTS}/${id}/workflow`,
		body: { stage, versionId: versionId ?? undefined },
	});

/** The workflow stage latest is at. */
const latestStage = async (session: Session, id: number) => {
	const read = await session.request<{
		data: { workflow?: { stage: string } | null };
	}>({ path: `${DOCUMENTS}/${id}/latest` });
	expectStatus(`Reading staged story ${id}`, read, 200);
	return read.body.data.workflow?.stage;
};

/** Creates a staged story by moving its create request's proposal to `ready`, then approving and completing it. */
const createStagedStory = async (admin: Session, title: string) => {
	const { id, requestId } = await openCreateRequest(admin, STAGED_STORY_KEY, {
		title: `Create ${title}`,
		...titled(title),
	});
	const { versionId } = onlyDocument(await readRequest(admin, requestId));
	expectStatus(
		"Moving the proposal to ready",
		await moveStage(admin, id, STAGES.ready, versionId),
		204,
	);
	await approveAndCompleteRequest(admin, requestId);
	return id;
};

describe("workflow stages", () => {
	requires(`collection:${STAGED_STORY_KEY}`);

	test("holds a new document's create request until its proposal reaches a stage that allows latest, then gives the document that stage", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await openCreateRequest(admin, STAGED_STORY_KEY, {
			title: "Create a staged story",
			...titled("Staged"),
		});
		const requested = await readRequest(admin, requestId);
		const { versionId } = onlyDocument(requested);
		expect(onlyDocument(requested).workflowStage).toBe(STAGES.draft);
		expect(requested.blockers).toEqual([
			expect.objectContaining({ code: "workflow", target: "latest" }),
		]);
		expect((await approve(admin, requestId)).status).toBe(409);

		expect((await moveStage(admin, id, STAGES.review, versionId)).status).toBe(
			204,
		);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([
			"workflow",
		]);
		expect((await moveStage(admin, id, STAGES.ready, versionId)).status).toBe(
			204,
		);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([]);
		await approveAndCompleteRequest(admin, requestId);

		//* landing a request's content isn't an edit, so the stage doesn't fall back
		expect(await latestStage(admin, id)).toBe(STAGES.ready);
	});

	test("publishes directly only from a stage that allows the environment, which falls back once the content changes", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStagedStory(admin, "Published by stage");
		const publish = () =>
			admin.request({
				method: "POST",
				path: `${DOCUMENTS}/${id}/publish`,
				body: { environment: "staging" },
			});

		await saveDocument(admin, STAGED_STORY_KEY, id, titled("Changed"));
		expect(await latestStage(admin, id)).toBe(STAGES.review);
		expect((await publish()).status).toBe(403);

		expect((await moveStage(admin, id, STAGES.ready)).status).toBe(204);
		expect((await publish()).status).toBe(204);
	});

	test("gives a publish request's proposal its own stage, whose changes alone withdraw the request's approval", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStagedStory(admin, "Proposed by stage");
		const requestId = await openRequest(admin, "publish", [
			{
				collectionKey: STAGED_STORY_KEY,
				documentId: id,
				targets: ["production"],
			},
		]);
		const proposal = onlyDocument(await readRequest(admin, requestId));
		expect(proposal.workflowStage).toBe(STAGES.draft);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([
			"workflow",
		]);

		expect(
			(await moveStage(admin, id, STAGES.ready, proposal.versionId)).status,
		).toBe(204);
		expect((await approve(admin, requestId)).status).toBe(204);

		//* latest's stage is its own, and latest isn't a target
		expect((await moveStage(admin, id, STAGES.draft)).status).toBe(204);
		expect((await readRequest(admin, requestId)).approved).toBe(true);

		//* editing the proposal is a content change, so its stage falls back too
		expect(
			(await editProposal(admin, proposal, titled("Edited proposal"))).status,
		).toBe(200);
		const edited = await readRequest(admin, requestId);
		expect(edited.approved).toBe(false);
		expect(onlyDocument(edited).workflowStage).toBe(STAGES.review);
		expect(blockerCodes(edited)).toEqual(["workflow"]);
	});
});
