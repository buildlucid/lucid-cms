import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	createDocument,
	type FieldInput,
	readDocument,
} from "#shared/documents";
import { uploadMedia } from "#shared/media";

const story = (action: string) => `documents:${STORY_KEY}:${action}`;
const EDITOR = [story("read"), story("update")];

const title = (value: string): FieldInput => ({
	key: "title",
	type: "text",
	value,
});
const relation = (pageId: number): FieldInput => ({
	key: "relation",
	type: "relation",
	value: [{ id: pageId, collectionKey: "page" }],
});
const media = (mediaId: number): FieldInput => ({
	key: "media",
	type: "media",
	value: [mediaId],
});

type SaveResponse = {
	errors?: { fields?: Array<{ key: string }> };
};

/** Saves a story as a session, returning the response so a test can check a refusal. */
const save = (session: Session, id: number, fields: FieldInput[]) =>
	session.request<SaveResponse>({
		method: "POST",
		path: `/api/v1/documents/${STORY_KEY}/${id}`,
		body: { fields },
	});

/** The fields a refused save names, so a test can tell a refused link from a malformed one. */
const refusedFields = (response: { body: SaveResponse }) =>
	(response.body.errors?.fields ?? []).map((field) => field.key);

describe("linking to what you can't read", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`);

	test("a save can't newly link a document from a collection the user can't read", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pageId = await createDocument(admin, "page", {
			fields: [title("Out of reach")],
		});
		const id = await createDocument(admin, STORY_KEY, {
			fields: [title("Unlinked")],
		});
		const editor = await lucid.user({ permissions: EDITOR });
		const pageReader = await lucid.user({
			permissions: [...EDITOR, "documents:page:read"],
		});

		const refused = await save(editor.session, id, [
			title("Linked"),
			relation(pageId),
		]);
		//* to them the page doesn't exist, so it is refused as not found
		expect(refused.status).toBe(400);
		expect(refusedFields(refused)).toEqual(["relation"]);
		expect((await readDocument(admin, STORY_KEY, id)).fields.relation).toEqual(
			[],
		);

		const allowed = await save(pageReader.session, id, [
			title("Linked"),
			relation(pageId),
		]);
		expect(allowed.status).toBe(200);
	});

	test("a save keeps links the user can't read when they were already there", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pageId = await createDocument(admin, "page", {
			fields: [title("Already linked")],
		});
		const id = await createDocument(admin, STORY_KEY, {
			fields: [title("Before"), relation(pageId)],
		});
		const editor = await lucid.user({ permissions: EDITOR });

		const saved = await save(editor.session, id, [
			title("After"),
			relation(pageId),
		]);

		expect(saved.status).toBe(200);
		expect((await readDocument(admin, STORY_KEY, id)).fields).toMatchObject({
			title: "After",
			relation: [{ id: pageId, collectionKey: "page" }],
		});
	});

	test("a reader sees what a document already links to without reading the linked collection", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const pageId = await createDocument(admin, "page", {
			fields: [title("Linked page")],
		});
		const id = await createDocument(admin, STORY_KEY, {
			fields: [title("Linking"), relation(pageId)],
		});
		const reader = await lucid.user({ permissions: [story("read")] });

		const read = await reader.session.request<{
			refs?: { documents?: Array<{ id: number }> };
		}>({
			path: `/api/v1/documents/${STORY_KEY}/${id}/latest`,
			query: { include: "bricks,refs" },
		});

		//* agreed design: browsing needs the target's read permission, but seeing a link doesn't
		expect(read.status).toBe(200);
		expect(read.body.refs?.documents?.map((document) => document.id)).toEqual([
			pageId,
		]);
		expect(
			(await reader.session.request({ path: "/api/v1/documents/page/latest" }))
				.status,
		).toBe(403);
	});
});

describe("linking media you can't read", () => {
	requires("harness:outbox", `collection:${STORY_KEY}`, "feature:mediaStorage");

	test("a save can't newly link library media without media:read, but can link your own uploads", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const libraryMedia = await uploadMedia(admin, { title: "Library file" });
		const id = await createDocument(admin, STORY_KEY, {
			fields: [title("Media")],
		});
		const editor = await lucid.user({
			permissions: [...EDITOR, "media:create", "media:update"],
		});
		const ownUpload = await uploadMedia(editor.session, { title: "Mine" });

		const refused = await save(editor.session, id, [
			title("Media"),
			media(libraryMedia),
		]);
		const allowed = await save(editor.session, id, [
			title("Media"),
			media(ownUpload),
		]);

		expect(refused.status).toBe(400);
		expect(refusedFields(refused)).toEqual(["media"]);
		expect(allowed.status, JSON.stringify(allowed.body)).toBe(200);
		expect((await readDocument(admin, STORY_KEY, id)).fields.media).toEqual([
			ownUpload,
		]);
	});
});
