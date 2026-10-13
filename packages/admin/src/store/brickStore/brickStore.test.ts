import { describe, expect, test } from "vitest";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import { createBrickStore } from "./brickStore";

const titleConfig: CollectionLeafFieldConfig = {
	type: "text",
	key: "title",
	details: { label: { type: "lucid.literal", value: "Title" } },
	localized: true,
};

/** A store holding one builder brick with a localized title and a repeater of links. */
const createStore = () => {
	const store = createBrickStore();
	store.set("collectionLocalized", true);
	store.set("bricks", [
		{
			key: "collection-pseudo-brick",
			ref: "collection-pseudo-brick",
			type: "collection-fields",
			open: false,
			order: -1,
			fields: [],
		},
		{
			key: "hero",
			ref: "hero",
			type: "builder",
			open: true,
			order: 0,
			fields: [
				{ key: "title", type: "text", translations: { en: "Original" } },
				{
					key: "links",
					type: "repeater",
					groups: [
						{
							ref: "link-1",
							order: 0,
							open: true,
							fields: [{ key: "label", type: "text", value: "Docs" }],
						},
					],
				},
			],
		},
	]);
	store.get.captureInitialSnapshot();
	return store;
};

const setTitle = (store: ReturnType<typeof createStore>, value: string) =>
	store.get.setFieldValue({
		brickIndex: 1,
		key: "title",
		fieldConfig: titleConfig,
		value,
		contentLocale: "en",
	});

const title = (store: ReturnType<typeof createStore>) =>
	store.get.bricks[1]?.fields[0]?.translations?.en;

test("comparison content, dirty state and locks are independent of the editable pane", () => {
	const left = createBrickStore();
	const right = createBrickStore("comparison-");
	const brick = {
		key: "hero",
		ref: "hero",
		type: "builder" as const,
		open: true,
		order: 0,
		fields: [{ key: "title", type: "text" as const, value: "Original" }],
	};
	left.set("bricks", [structuredClone(brick)]);
	right.set("bricks", [structuredClone(brick)]);
	left.get.captureInitialSnapshot();
	right.get.captureInitialSnapshot();
	right.set("locked", true);
	left.set("bricks", 0, "fields", 0, "value", "Changed");
	expect(left.getDocumentMutated()).toBe(true);
	expect(right.getDocumentMutated()).toBe(false);
	expect(right.get.bricks[0]?.fields[0]?.value).toBe("Original");
	expect(left.get.locked).toBe(false);
	right.get.reset();
	expect(left.get.bricks[0]?.fields[0]?.value).toBe("Changed");
});

describe("undo and redo", () => {
	test("a field edit steps back to the value it replaced, in its language, and forward again", () => {
		const store = createStore();
		setTitle(store, "Changed");
		expect(store.edits.canUndo()).toBe(true);
		expect(store.getDocumentMutated()).toBe(true);

		const undone = store.edits.undo();
		expect(undone).toMatchObject({
			kind: "field",
			target: { brickRef: "hero", key: "title", locale: "en" },
		});
		expect(title(store)).toBe("Original");
		expect(store.getDocumentMutated()).toBe(false);
		expect(store.edits.canRedo()).toBe(true);

		store.edits.redo();
		expect(title(store)).toBe("Changed");
		expect(store.edits.canRedo()).toBe(false);
	});

	test("undoing an edit clears its stale validation error and counts as an edit for autosave", () => {
		const store = createStore();
		setTitle(store, "Changed");
		store.set("brickErrors", [
			{
				ref: "hero",
				key: "hero",
				order: 0,
				fields: [
					{
						key: "title",
						localeCode: "en",
						message: { type: "lucid.literal", value: "Too long" },
					},
				],
			},
		]);
		const counter = store.get.autoSaveCounter;

		store.edits.undo();
		expect(store.get.brickErrors).toEqual([]);
		expect(store.get.autoSaveCounter).toBe(counter + 1);
	});

	test("removing a brick steps back to it in its place, keeping groups open as they are now", () => {
		const store = createStore();
		store.get.removeBrick(1);
		expect(store.get.bricks).toHaveLength(1);

		store.edits.undo();
		expect(store.get.bricks[1]).toMatchObject({
			ref: "hero",
			type: "builder",
			order: 0,
		});
		expect(title(store)).toBe("Original");
		expect(store.get.bricks[1]?.fields[1]?.groups?.[0]?.ref).toBe("link-1");

		store.edits.redo();
		expect(store.get.bricks).toHaveLength(1);
	});

	test("a repeater item added and removed again comes back through undo", () => {
		const store = createStore();
		store.get.addRepeaterGroup({
			brickIndex: 1,
			fieldConfig: [],
			key: "links",
			locales: ["en"],
		});
		const groups = () => store.get.bricks[1]?.fields[1]?.groups ?? [];
		expect(groups()).toHaveLength(2);
		store.get.removeRepeaterGroup({
			brickIndex: 1,
			repeaterKey: "links",
			targetRef: "link-1",
		});
		expect(groups()).toHaveLength(1);

		store.edits.undo();
		expect(groups().map((group) => group.ref)).toEqual([
			"link-1",
			groups()[1]?.ref,
		]);
		store.edits.undo();
		expect(groups()).toHaveLength(1);
		expect(store.edits.canUndo()).toBe(false);
	});

	test("the agent's content applies as one step carrying its run", () => {
		const store = createStore();
		store.get.applyContent({
			content: {
				fields: [],
				bricks: [
					{
						id: -1,
						ref: "hero",
						key: "hero",
						order: 0,
						type: "builder",
						open: false,
						fields: [
							{ key: "title", type: "text", translations: { en: "Rewritten" } },
							{ key: "links", type: "repeater", groups: [] },
						],
					},
				],
			},
			refs: {},
			runId: "run-1",
		});
		expect(title(store)).toBe("Rewritten");
		expect(store.edits.peekUndo()).toMatchObject({
			kind: "bricks",
			source: { type: "agent", runId: "run-1" },
		});

		store.edits.undo();
		expect(title(store)).toBe("Original");
		expect(store.get.bricks[1]?.fields[1]?.groups).toHaveLength(1);
	});

	test("edits made in a batch undo as one step, and none when they were reverted", () => {
		const store = createStore();
		store.edits.beginBatch();
		setTitle(store, "Draft");
		store.get.addRepeaterGroup({
			brickIndex: 1,
			fieldConfig: [],
			key: "links",
			locales: ["en"],
		});
		store.edits.endBatch();
		expect(store.get.bricks[1]?.fields[1]?.groups).toHaveLength(2);

		store.edits.undo();
		expect(title(store)).toBe("Original");
		expect(store.get.bricks[1]?.fields[1]?.groups).toHaveLength(1);
		expect(store.edits.canUndo()).toBe(false);

		store.edits.beginBatch();
		setTitle(store, "Draft");
		setTitle(store, "Original");
		store.edits.endBatch();
		expect(store.edits.canUndo()).toBe(false);
	});

	test("a batch that only opened or closed repeater items records nothing", () => {
		const store = createStore();
		store.edits.beginBatch();
		store.get.toggleGroupOpen({
			brickIndex: 1,
			repeaterKey: "links",
			ref: "link-1",
			parentRepeaterKey: undefined,
			parentRef: undefined,
		});
		store.edits.endBatch();

		expect(store.edits.canUndo()).toBe(false);
	});

	test("the agent's content applied during a batch stays its own step, and the batch carries on", () => {
		const store = createStore();
		store.edits.beginBatch();
		setTitle(store, "Draft");
		store.get.applyContent({
			content: {
				fields: [],
				bricks: [
					{
						id: 1,
						ref: "hero",
						key: "hero",
						order: 0,
						type: "builder",
						open: false,
						fields: [
							{ key: "title", type: "text", translations: { en: "Draft" } },
							{ key: "links", type: "repeater", groups: [] },
						],
					},
				],
			},
			refs: {},
			runId: "run-1",
		});
		setTitle(store, "Final");
		store.edits.endBatch();

		expect(store.edits.undo()).toMatchObject({ source: { type: "user" } });
		expect(title(store)).toBe("Draft");
		expect(store.edits.undo()).toMatchObject({
			source: { type: "agent", runId: "run-1" },
		});
		expect(store.edits.undo()).toMatchObject({ source: { type: "user" } });
		expect(title(store)).toBe("Original");
	});

	test("a reset ends a batch left open, so later edits are recorded", () => {
		const store = createStore();
		store.edits.beginBatch();
		store.get.reset();
		store.set("collectionLocalized", true);
		store.set("bricks", createStore().get.bricks);

		setTitle(store, "Changed");
		expect(store.edits.canUndo()).toBe(true);
	});

	test("redoing the agent's step pauses autosave again until the person reviews it", () => {
		const store = createStore();
		store.get.applyContent({
			content: { fields: [], bricks: [] },
			refs: {},
			runId: "run-1",
		});
		store.edits.undo();
		store.set("agentEdited", false);

		store.edits.redo();
		expect(store.get.agentEdited).toBe(true);
	});

	test("redoing the agent's step after it was saved keeps autosave on", () => {
		const store = createStore();
		store.get.applyContent({
			content: { fields: [], bricks: [] },
			refs: {},
			runId: "run-1",
		});
		store.get.captureInitialSnapshot();
		store.set("agentEdited", false);
		store.edits.undo();

		store.edits.redo();
		expect(store.get.agentEdited).toBe(false);
	});

	test("saved content syncing back keeps the steps, while loading a document or locking the pane leaves nothing to undo", () => {
		const store = createStore();
		setTitle(store, "Changed");
		store.get.syncBricks({
			fields: [],
			bricks: [
				{
					id: 1,
					ref: "hero",
					key: "hero",
					order: 0,
					type: "builder",
					open: false,
					fields: [
						{ key: "title", type: "text", translations: { en: "Changed" } },
					],
				},
			],
		});
		expect(store.edits.canUndo()).toBe(true);

		store.get.setBricks();
		expect(store.edits.canUndo()).toBe(false);

		store.set("bricks", createStore().get.bricks);
		setTitle(store, "Changed");
		store.set("locked", true);
		expect(store.edits.undo()).toBeUndefined();
		expect(title(store)).toBe("Changed");
	});
});
