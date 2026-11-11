import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { RESTRICTED_STORY_KEY } from "#shared/collections/restricted-story";
import {
	type BrickInput,
	createDocument,
	type DocumentInput,
	readDocument,
	saveDocument,
} from "#shared/documents";

const DOCUMENTS = `/api/v1/documents/${RESTRICTED_STORY_KEY}`;
const access = (action: string) =>
	`documents:${RESTRICTED_STORY_KEY}:${action}`;

const READ_NOTES = access("fields:notes:read");
const READ_CREDITS = access("fields:credits:read");
const UPDATE_PRICE = access("fields:price:update");
const READ_PANEL = access("bricks:restricted-panel:read");
const UPDATE_NOTE_LOCKED = access(
	"bricks:restricted-note:fields:note_locked:update",
);

/** A story with every restricted part filled in, from one word. */
const restricted = (
	word: string,
): Required<DocumentInput> & {
	bricks: BrickInput[];
} => ({
	fields: [
		{ key: "title", type: "text", value: word },
		{ key: "notes", type: "text", value: `${word} notes` },
		{ key: "price", type: "number", value: word.length },
		{
			key: "credits",
			type: "repeater",
			groups: [
				{
					ref: "credit-0",
					order: 0,
					fields: [
						{ key: "credit_name", type: "text", value: `${word} credit` },
					],
				},
			],
		},
	],
	bricks: [
		{
			ref: "panel",
			key: "restricted-panel",
			order: 0,
			type: "builder",
			fields: [{ key: "panel_text", type: "text", value: `${word} panel` }],
		},
		{
			ref: "note",
			key: "restricted-note",
			order: 1,
			type: "builder",
			fields: [
				{ key: "note_text", type: "text", value: `${word} note` },
				{ key: "note_locked", type: "text", value: `${word} locked` },
			],
		},
	],
});

/** Keys of a collection's fields and builder bricks as a user's config shows them. */
const configKeys = async (session: Session) => {
	const collection = await session.request<{
		data: {
			fields: Array<{ key: string }>;
			builderBricks?: Array<{ key: string }>;
		};
	}>({ path: `/api/v1/collections/${RESTRICTED_STORY_KEY}` });
	expect(collection.status).toBe(200);
	return {
		fields: collection.body.data.fields.map((field) => field.key),
		bricks: (collection.body.data.builderBricks ?? []).map(
			(brick) => brick.key,
		),
	};
};

describe("field access", () => {
	requires("harness:outbox", `collection:${RESTRICTED_STORY_KEY}`);

	test("hides fields and bricks from the config of users who can't read them", async ({
		lucid,
	}) => {
		const reader = await lucid.user({ permissions: [access("read")] });
		const fullReader = await lucid.user({
			permissions: [access("read"), READ_NOTES, READ_CREDITS, READ_PANEL],
		});

		expect(await configKeys(reader.session)).toEqual({
			fields: ["title", "price"],
			bricks: ["restricted-note"],
		});
		expect(await configKeys(fullReader.session)).toEqual({
			fields: ["title", "notes", "price", "credits"],
			bricks: ["restricted-panel", "restricted-note"],
		});
	});

	test("hides fields and bricks from documents for users who can't read them", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(
			admin,
			RESTRICTED_STORY_KEY,
			restricted("Hidden"),
		);
		const reader = await lucid.user({ permissions: [access("read")] });

		const read = await readDocument(reader.session, RESTRICTED_STORY_KEY, id);
		const listed = await reader.session.request<{
			data: Array<{ id: number; fields?: Array<{ key: string }> }>;
		}>({
			path: `${DOCUMENTS}/latest`,
			query: { "filter[id]": id, include: "bricks" },
		});

		expect(read.fields).toEqual({ title: "Hidden", price: 6 });
		expect(read.bricks).toEqual([
			{
				key: "restricted-note",
				fields: { note_text: "Hidden note", note_locked: "Hidden locked" },
			},
		]);
		expect(JSON.stringify(listed.body)).not.toContain("Hidden notes");
		expect(JSON.stringify(listed.body)).not.toContain("Hidden credit");
		expect(JSON.stringify(listed.body)).not.toContain("Hidden panel");
	});

	test("refuses filters and sorts on fields the user can't read", async ({
		lucid,
	}) => {
		const reader = await lucid.user({ permissions: [access("read")] });
		const fullReader = await lucid.user({
			permissions: [access("read"), READ_NOTES],
		});
		const filter = { "filter[fields.notes]": "Hidden notes" };
		const sort = { sort: "fields.notes" };

		for (const query of [filter, sort]) {
			const refused = await reader.session.request({
				path: `${DOCUMENTS}/latest`,
				query,
			});
			const allowed = await fullReader.session.request({
				path: `${DOCUMENTS}/latest`,
				query,
			});
			expect(refused.status, JSON.stringify(query)).toBe(400);
			expect(allowed.status, JSON.stringify(query)).toBe(200);
		}
	});

	test("a save from someone who can't see or change a field keeps its stored value", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(
			admin,
			RESTRICTED_STORY_KEY,
			restricted("Stored"),
		);
		const editor = await lucid.user({
			permissions: [access("read"), access("update")],
		});

		//* they send everything as someone who could change it all would
		await saveDocument(
			editor.session,
			RESTRICTED_STORY_KEY,
			id,
			restricted("Edited"),
		);

		const saved = await readDocument(admin, RESTRICTED_STORY_KEY, id);
		expect(saved.fields).toEqual({
			title: "Edited",
			notes: "Stored notes",
			price: 6,
			credits: [{ credit_name: "Stored credit" }],
		});
		expect(saved.bricks).toEqual([
			{ key: "restricted-panel", fields: { panel_text: "Stored panel" } },
			{
				key: "restricted-note",
				fields: { note_text: "Edited note", note_locked: "Stored locked" },
			},
		]);
	});

	test("a save without the hidden brick doesn't remove it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(
			admin,
			RESTRICTED_STORY_KEY,
			restricted("Kept"),
		);
		const editor = await lucid.user({
			permissions: [access("read"), access("update")],
		});
		const visible = restricted("Trimmed");

		//* what they saw: no panel brick and no hidden fields
		await saveDocument(editor.session, RESTRICTED_STORY_KEY, id, {
			fields: visible.fields.filter((field) =>
				["title", "price"].includes(field.key),
			),
			bricks: visible.bricks
				.filter((brick) => brick.key === "restricted-note")
				.map((brick) => ({ ...brick, order: 0 })),
		});

		const saved = await readDocument(admin, RESTRICTED_STORY_KEY, id);
		expect(saved.fields).toMatchObject({
			title: "Trimmed",
			notes: "Kept notes",
			credits: [{ credit_name: "Kept credit" }],
		});
		expect(saved.bricks.map((brick) => brick.key)).toEqual([
			"restricted-panel",
			"restricted-note",
		]);
	});

	test("users with a field's update permission can change it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(
			admin,
			RESTRICTED_STORY_KEY,
			restricted("Before"),
		);
		const editor = await lucid.user({
			permissions: [
				access("read"),
				access("update"),
				UPDATE_PRICE,
				UPDATE_NOTE_LOCKED,
			],
		});

		await saveDocument(
			editor.session,
			RESTRICTED_STORY_KEY,
			id,
			restricted("Afterwards"),
		);

		const saved = await readDocument(admin, RESTRICTED_STORY_KEY, id);
		expect(saved.fields).toMatchObject({ price: 10, notes: "Before notes" });
		expect(saved.bricks[1]?.fields).toEqual({
			note_text: "Afterwards note",
			note_locked: "Afterwards locked",
		});
	});
});
