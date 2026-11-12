import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { TEAM_STORY_KEY } from "#shared/collections/team-story";
import {
	createContentReader,
	createDocument,
	listDocumentIds,
	readContent,
	readDocument,
} from "#shared/documents";
import {
	approve,
	approveAndCompleteRequest,
	authorPermissions,
	completeRequest,
	editProposal,
	onlyDocument,
	openCreateRequest,
	readRequest,
	requestAction,
	requestTeam,
} from "#shared/requests";

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

/** Opens a create request for a story as the admin, which needs no review to create one directly. */
const requestStory = (admin: Session, title: string) =>
	openCreateRequest(admin, STORY_KEY, {
		title: `Create ${title}`,
		...titled(title),
	});

describe("create requests", () => {
	requires(`collection:${STORY_KEY}`);

	test("keeps a requested document out of reads, lists, the content API and relations until it is created", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session, ["page"]);
		const { id, requestId } = await openCreateRequest(admin, "page", {
			title: "Create a page",
			...titled("Requested page"),
		});
		const relatingStory = {
			fields: [
				{ key: "title", type: "text", value: "Relates to the page" },
				{
					key: "relation",
					type: "relation",
					value: [{ id, collectionKey: "page" }],
				},
			],
		};

		expect(
			(await admin.request({ path: `/api/v1/documents/page/${id}/latest` }))
				.status,
		).toBe(404);
		expect(await listDocumentIds(admin, "page", { "filter[id]": id })).toEqual(
			[],
		);
		expect(await readContent(read, "page", id, "latest")).toBeNull();
		const related = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}`,
			body: relatingStory,
		});
		expect(related.status).toBe(400);

		await approveAndCompleteRequest(admin, requestId);

		expect((await readDocument(admin, "page", id)).fields.title).toBe(
			"Requested page",
		);
		expect(await listDocumentIds(admin, "page", { "filter[id]": id })).toEqual([
			id,
		]);
		expect((await readContent(read, "page", id, "latest"))?.fields.title).toBe(
			"Requested page",
		);
		expect(
			await createDocument(admin, STORY_KEY, relatingStory),
		).toBeGreaterThan(0);
	});

	test("changes a requested document only through its request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await requestStory(admin, "Untouchable");
		const path = `/api/v1/documents/${STORY_KEY}`;

		const attempts = {
			save: await admin.request({
				method: "POST",
				path: `${path}/${id}`,
				body: titled("Saved directly"),
			}),
			publish: await admin.request({
				method: "POST",
				path: `${path}/${id}/publish`,
				body: { environment: "staging" },
			}),
			duplicate: await admin.request({
				method: "POST",
				path: `${path}/${id}/duplicate`,
			}),
			bin: await admin.request({ method: "DELETE", path: `${path}/${id}` }),
			binMany: await admin.request({
				method: "DELETE",
				path,
				body: { ids: [id] },
			}),
			restore: await admin.request({
				method: "POST",
				path: `${path}/restore`,
				body: { ids: [id] },
			}),
			deletePermanently: await admin.request({
				method: "DELETE",
				path: `${path}/${id}/permanent`,
			}),
		};
		expect(
			Object.fromEntries(
				Object.entries(attempts).map(([name, response]) => [
					name,
					response.status,
				]),
			),
		).toEqual({
			save: 404,
			publish: 404,
			duplicate: 404,
			bin: 404,
			binMany: 404,
			restore: 404,
			deletePermanently: 404,
		});

		const request = await readRequest(admin, requestId);
		expect(onlyDocument(request).deleted).toBeNull();
		expect(
			(
				await editProposal(
					admin,
					onlyDocument(request),
					titled("Edited in its request"),
				)
			).status,
		).toBe(200);

		await approveAndCompleteRequest(admin, requestId);
		expect(await readDocument(admin, STORY_KEY, id)).toMatchObject({
			fields: { title: "Edited in its request" },
			isDeleted: false,
		});
	});

	test("keeps a closed create request's proposal, which can be edited and created once reopened", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await requestStory(admin, "Paused");
		const document = onlyDocument(await readRequest(admin, requestId));

		expect((await requestAction(admin, requestId, "close")).status).toBe(204);
		const closed = await readRequest(admin, requestId);
		expect(closed).toMatchObject({
			status: "closed",
			permissions: { edit: false, approve: false, reopen: true },
		});
		expect(
			(await editProposal(admin, document, titled("Edited while closed"))).ok,
		).toBe(false);
		expect((await approve(admin, requestId)).status).toBe(403);

		expect((await requestAction(admin, requestId, "reopen")).status).toBe(204);
		expect(
			(await editProposal(admin, document, titled("Edited once reopened")))
				.status,
		).toBe(200);
		await approveAndCompleteRequest(admin, requestId);

		expect((await readDocument(admin, STORY_KEY, id)).fields.title).toBe(
			"Edited once reopened",
		);
		expect((await readRequest(admin, requestId)).status).toBe("completed");
	});
});

describe("create requests between people", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	test("an author edits their own create request, and only reviewers approve and complete it", async ({
		lucid,
	}) => {
		const { author, reviewer, secondReviewer } = await requestTeam(
			lucid,
			TEAM_STORY_KEY,
		);
		const otherAuthor = await lucid.user({
			permissions: authorPermissions(TEAM_STORY_KEY),
		});

		const direct = await author.session.request({
			method: "POST",
			path: `/api/v1/documents/${TEAM_STORY_KEY}`,
			body: titled("Direct"),
		});
		expect(direct.status).toBe(403);

		const { id, requestId } = await openCreateRequest(
			author.session,
			TEAM_STORY_KEY,
			{ title: "Create a team story", ...titled("First draft") },
		);
		const document = onlyDocument(await readRequest(author.session, requestId));

		expect(
			(await editProposal(otherAuthor.session, document, titled("Not theirs")))
				.ok,
		).toBe(false);
		expect(
			(await editProposal(author.session, document, titled("Second draft")))
				.status,
		).toBe(200);

		expect((await readRequest(author.session, requestId)).permissions).toEqual({
			edit: true,
			approve: false,
			complete: false,
			reopen: false,
		});
		expect((await approve(author.session, requestId)).status).toBe(403);
		expect((await approve(reviewer.session, requestId)).status).toBe(204);
		expect(
			(await requestAction(reviewer.session, requestId, "complete")).status,
		).toBe(409);
		expect((await approve(secondReviewer.session, requestId)).status).toBe(204);
		expect(
			(await requestAction(author.session, requestId, "complete")).status,
		).toBe(403);
		await completeRequest(reviewer.session, requestId);

		expect(
			(await readDocument(author.session, TEAM_STORY_KEY, id)).fields.title,
		).toBe("Second draft");
	});
});
