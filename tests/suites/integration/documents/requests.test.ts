import { randomUUID } from "node:crypto";
import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/collections/reviewed-story";
import {
	approveAndCompleteRequest,
	createContentReader,
	listDocumentIds,
	publishDocument,
	readContent,
	readDocument,
} from "#shared/documents";

const DOCUMENTS = `/api/v1/documents/${REVIEWED_STORY_KEY}`;

const titled = (title: string, summary = "") => ({
	fields: [
		{ key: "title", type: "text", value: title },
		{ key: "summary", type: "textarea", value: summary },
	],
});

/** Opens a create request for a new story, and returns the document and request it made. */
const requestStory = async (admin: Session, title: string, summary = "") => {
	const requested = await admin.request<{
		data: { id: number; requestId: number };
	}>({
		method: "POST",
		path: `${DOCUMENTS}/request`,
		body: { title: `Create ${title}`, ...titled(title, summary) },
	});
	expect(requested.status).toBe(201);
	return requested.body.data;
};

/** Creates a story the only way the collection allows: through an approved create request. */
const createStory = async (admin: Session, title: string) => {
	const { id, requestId } = await requestStory(admin, title);
	await approveAndCompleteRequest(admin, requestId);
	return id;
};

/** Opens a publish, unpublish or delete request for one story, and returns the request's ID. */
const openRequest = async (
	admin: Session,
	type: "publish" | "unpublish" | "delete",
	documentId: number,
	targets: string[] = [],
) => {
	const opened = await admin.request<{ data: { id: number } }>({
		method: "POST",
		path: "/api/v1/requests",
		body: {
			type,
			title: `${type} story ${documentId}`,
			documents: [
				{
					collectionKey: REVIEWED_STORY_KEY,
					documentId,
					targets,
					//* only a publish request has content to take from somewhere
					...(type === "publish" ? { source: "latest" } : {}),
				},
			],
		},
	});
	expect(opened.status, JSON.stringify(opened.body)).toBe(201);
	return opened.body.data.id;
};

describe("documents that need an approved request", () => {
	requires(`collection:${REVIEWED_STORY_KEY}`);

	test("keeps a requested document out of the collection until its request is approved", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const marker = randomUUID();
		const mine = { "filter[fields.summary]": marker };

		const direct = await admin.request({
			method: "POST",
			path: DOCUMENTS,
			body: titled("Direct", marker),
		});
		expect(direct.status).toBe(403);

		const { id, requestId } = await requestStory(admin, "Requested", marker);
		expect(await listDocumentIds(admin, REVIEWED_STORY_KEY, mine)).toEqual([]);
		expect(
			await listDocumentIds(admin, REVIEWED_STORY_KEY, {
				...mine,
				"filter[pending]": 1,
			}),
		).toEqual([id]);

		await approveAndCompleteRequest(admin, requestId);

		expect(await listDocumentIds(admin, REVIEWED_STORY_KEY, mine)).toEqual([
			id,
		]);
		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id)).fields,
		).toMatchObject({ title: "Requested", summary: marker });
	});

	test("never creates the document of a create request that is closed", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await requestStory(admin, "Abandoned");

		const closed = await admin.request({
			method: "POST",
			path: `/api/v1/requests/${requestId}/close`,
		});

		expect(closed.status).toBe(204);
		expect(
			(await admin.request({ path: `${DOCUMENTS}/${id}/latest` })).status,
		).toBe(404);
	});

	test("refuses to complete a request before it is approved", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { requestId } = await requestStory(admin, "Unapproved");

		const completed = await admin.request({
			method: "POST",
			path: `/api/v1/requests/${requestId}/complete`,
		});

		expect(completed.status).toBe(409);
	});

	test("refuses an approval of content that changed after it was read", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const { id, requestId } = await requestStory(admin, "Reviewed");
		const request = await admin.request<{
			data: { reviewToken: string; documents: Array<{ versionId: number }> };
		}>({ path: `/api/v1/requests/${requestId}` });

		const edited = await admin.request({
			method: "PATCH",
			path: `${DOCUMENTS}/${id}/${request.body.data.documents[0]?.versionId}`,
			body: titled("Changed after review"),
		});
		const approved = await admin.request({
			method: "POST",
			path: `/api/v1/requests/${requestId}/approve`,
			body: { ifUnchanged: request.body.data.reviewToken },
		});

		expect(edited.status).toBe(200);
		expect(approved.status).toBe(409);
	});

	test("publishes to a reviewed environment only through an approved request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const read = await createContentReader(admin, lucid.session, [
			REVIEWED_STORY_KEY,
		]);
		const id = await createStory(admin, "Going live");

		//* staging has no review, so it can be published to directly
		await publishDocument(admin, REVIEWED_STORY_KEY, id, "staging");
		const direct = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/${id}/publish`,
			body: { environment: "production" },
		});
		expect(direct.status).toBe(403);
		expect(
			await readContent(read, REVIEWED_STORY_KEY, id, "production"),
		).toBeNull();

		await approveAndCompleteRequest(
			admin,
			await openRequest(admin, "publish", id, ["production"]),
		);

		expect(
			(await readContent(read, REVIEWED_STORY_KEY, id, "production"))?.fields
				.title,
		).toBe("Going live");
	});

	test("unpublishes from a reviewed environment only through an approved request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, "Coming down");
		await approveAndCompleteRequest(
			admin,
			await openRequest(admin, "publish", id, ["production"]),
		);

		const direct = await admin.request({
			method: "POST",
			path: `${DOCUMENTS}/${id}/unpublish`,
			body: { environment: "production" },
		});
		expect(direct.status).toBe(403);

		await approveAndCompleteRequest(
			admin,
			await openRequest(admin, "unpublish", id, ["production"]),
		);

		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id)).versions.production,
		).toBeNull();
	});

	test("moves a document to the bin only through an approved delete request", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createStory(admin, "Leaving");

		const direct = await admin.request({
			method: "DELETE",
			path: `${DOCUMENTS}/${id}`,
		});
		expect(direct.status).toBe(403);
		expect((await readDocument(admin, REVIEWED_STORY_KEY, id)).isDeleted).toBe(
			false,
		);

		await approveAndCompleteRequest(
			admin,
			await openRequest(admin, "delete", id),
		);

		expect((await readDocument(admin, REVIEWED_STORY_KEY, id)).isDeleted).toBe(
			true,
		);
	});
});
