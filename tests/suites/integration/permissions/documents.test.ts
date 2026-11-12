import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import { STORY_KEY } from "#shared/config/collections/story";
import {
	createDocument,
	listDocumentIds,
	publishDocument,
	readDocument,
	saveDocument,
	titled,
} from "#shared/helpers/documents";
import { story } from "#shared/helpers/permissions";
import {
	approve,
	approveAndCompleteRequest,
	openCreateRequest,
	requestChange,
	requestCreation,
} from "#shared/helpers/requests";

const reviewed = (action: string) =>
	`documents:${REVIEWED_STORY_KEY}:${action}`;

/** Opens a request for one reviewed story, returning the response so a test can check a refusal. */
const openRequest = (
	session: Session,
	type: "publish" | "unpublish" | "delete",
	documentId: number,
	targets: string[] = [],
) =>
	requestChange(session, type, [
		{ collectionKey: REVIEWED_STORY_KEY, documentId, targets },
	]);

/** Opens a create request for a new reviewed story, returning the response. */
const requestCreate = (session: Session, title: string) =>
	requestCreation(session, REVIEWED_STORY_KEY, {
		title: `Create ${title}`,
		...titled(title),
	});

/** Creates a reviewed story the only way it allows: through an approved create request. */
const createReviewedStory = async (admin: Session, title: string) => {
	const { id, requestId } = await openCreateRequest(admin, REVIEWED_STORY_KEY, {
		title: `Create ${title}`,
		...titled(title),
	});
	await approveAndCompleteRequest(admin, requestId);
	return id;
};

describe("document permissions", () => {
	requires(
		"harness:outbox",
		`collection:${STORY_KEY}`,
		`collection:${REVIEWED_STORY_KEY}`,
	);

	test("a reader can read stories but not change them", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Read only"));
		const { versionId } = await readDocument(admin, STORY_KEY, id);
		const { session } = await lucid.user({ permissions: [story("read")] });
		const path = `/api/v1/documents/${STORY_KEY}`;

		expect((await readDocument(session, STORY_KEY, id)).fields.title).toBe(
			"Read only",
		);
		expect(
			await listDocumentIds(session, STORY_KEY, { "filter[id]": id }),
		).toEqual([id]);

		const attempts = {
			create: await session.request({
				method: "POST",
				path,
				body: titled("New"),
			}),
			save: await session.request({
				method: "POST",
				path: `${path}/${id}`,
				body: titled("Changed"),
			}),
			//* the version route only needs read, as request proposals use it, so latest is checked inside
			saveVersion: await session.request({
				method: "PATCH",
				path: `${path}/${id}/${versionId}`,
				body: titled("Changed"),
			}),
			publish: await session.request({
				method: "POST",
				path: `${path}/${id}/publish`,
				body: { environment: "staging" },
			}),
			bin: await session.request({ method: "DELETE", path: `${path}/${id}` }),
		};

		expect(
			Object.fromEntries(
				Object.entries(attempts).map(([name, response]) => [
					name,
					response.status,
				]),
			),
		).toEqual({
			create: 403,
			save: 403,
			saveVersion: 403,
			publish: 403,
			bin: 403,
		});
		expect(await readDocument(admin, STORY_KEY, id)).toMatchObject({
			fields: { title: "Read only" },
			isDeleted: false,
			versions: { staging: null },
		});
	});

	test("each action needs its own permission", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("First"));
		await saveDocument(admin, STORY_KEY, id, titled("Second"));
		const revisions = await admin.request<{ data: Array<{ id: number }> }>({
			path: `/api/v1/documents/${STORY_KEY}/${id}/revisions`,
		});
		const revisionId = revisions.body.data[0]?.id;
		expect(revisionId).toBeDefined();
		const { session } = await lucid.user({
			permissions: [
				story("read"),
				story("update"),
				story("create"),
				story("delete"),
			],
		});

		const restored = await session.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}/${revisionId}/restore-revision`,
		});
		const published = await session.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}/publish`,
			body: { environment: "staging" },
		});

		expect(restored.status).toBe(403);
		expect(published.status).toBe(403);
		await saveDocument(session, STORY_KEY, id, titled("Third"));
		const binned = await session.request({
			method: "DELETE",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
		});
		expect(binned.status).toBe(204);
	});

	test("a story permission gives nothing in other collections", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pageId = await createDocument(admin, "page", titled("Elsewhere"));
		const everyStoryPermission = [
			"read",
			"create",
			"update",
			"delete",
			"publish",
			"restore",
		].map(story);
		const { session } = await lucid.user({ permissions: everyStoryPermission });

		const attempts = await Promise.all([
			session.request({ path: `/api/v1/documents/page/${pageId}/latest` }),
			session.request({ path: "/api/v1/documents/page/latest" }),
			session.request({ path: "/api/v1/collections/page" }),
			session.request({
				method: "POST",
				path: "/api/v1/documents/page",
				body: titled("Refused"),
			}),
			session.request({
				method: "POST",
				path: `/api/v1/documents/page/${pageId}`,
				body: titled("Refused"),
			}),
		]);

		expect(attempts.map((response) => response.status)).toEqual([
			403, 403, 403, 403, 403,
		]);
	});

	test("collections a user can't read are left out of the collection list", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({ permissions: [story("read")] });

		const listed = await session.request<{ data: Array<{ key: string }> }>({
			path: "/api/v1/collections",
		});

		expect(listed.status).toBe(200);
		expect(listed.body.data.map((collection) => collection.key)).toEqual([
			STORY_KEY,
		]);
	});

	test("a create request needs create-request in the collection", async ({
		lucid,
	}) => {
		const without = await lucid.user({
			permissions: ["requests:read", reviewed("read")],
		});
		const withIt = await lucid.user({
			permissions: [
				"requests:read",
				reviewed("read"),
				reviewed("create-request"),
			],
		});

		expect((await requestCreate(without.session, "Refused")).status).toBe(403);
		expect((await requestCreate(withIt.session, "Requested")).status).toBe(201);
	});

	test("create-request alone never creates a document directly", async ({
		lucid,
	}) => {
		const { session } = await lucid.user({
			permissions: [
				"requests:read",
				reviewed("read"),
				reviewed("create-request"),
			],
		});

		const direct = await session.request({
			method: "POST",
			path: `/api/v1/documents/${REVIEWED_STORY_KEY}`,
			body: titled("Direct"),
		});

		expect(direct.status).toBe(403);
	});

	test("delete and unpublish requests need their request permissions", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createReviewedStory(admin, "Requested away");
		await approveAndCompleteRequest(
			admin,
			(await openRequest(admin, "publish", id, ["production"])).body.data.id,
		);
		const base = ["requests:read", reviewed("read")];
		const without = await lucid.user({ permissions: base });
		const withThem = await lucid.user({
			permissions: [
				...base,
				reviewed("delete-request"),
				reviewed("unpublish-request"),
			],
		});

		expect((await openRequest(without.session, "delete", id)).status).toBe(403);
		expect(
			(await openRequest(without.session, "unpublish", id, ["production"]))
				.status,
		).toBe(403);
		expect((await openRequest(withThem.session, "delete", id)).status).toBe(
			201,
		);
		expect(
			(await openRequest(withThem.session, "unpublish", id, ["production"]))
				.status,
		).toBe(201);
	});

	test("approving needs review and the permission for what the request does", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const base = ["requests:read", reviewed("read")];
		const creator = await lucid.user({
			permissions: [...base, reviewed("create")],
		});
		const reviewOnly = await lucid.user({
			permissions: [...base, reviewed("review")],
		});
		const reviewer = await lucid.user({
			permissions: [...base, reviewed("review"), reviewed("create")],
		});
		const requested = await requestCreate(admin, "Needs review");
		expect(requested.status).toBe(201);
		const { requestId } = requested.body.data;

		expect((await approve(creator.session, requestId)).status).toBe(403);
		expect((await approve(reviewOnly.session, requestId)).status).toBe(403);
		expect((await approve(reviewer.session, requestId)).status).toBe(204);
	});

	test("a reviewer can't review requests in collections they can't review", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const reviewer = await lucid.user({
			permissions: [
				"requests:read",
				reviewed("read"),
				reviewed("create"),
				story("read"),
				story("review"),
			],
		});
		const requested = await requestCreate(admin, "Other reviewers");
		expect(requested.status).toBe(201);

		expect(
			(await approve(reviewer.session, requested.body.data.requestId)).status,
		).toBe(403);
	});

	test("publishing to an environment needs publish", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Going out"));
		const { session } = await lucid.user({
			permissions: [story("read"), story("publish")],
		});

		await publishDocument(session, STORY_KEY, id, "staging");

		expect(
			(await readDocument(admin, STORY_KEY, id, "staging")).fields.title,
		).toBe("Going out");
	});
});
