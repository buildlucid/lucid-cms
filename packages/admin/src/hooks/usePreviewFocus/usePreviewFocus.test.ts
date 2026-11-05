import type { Collection, InternalDocumentField } from "@types";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import brickStore, { type BrickData } from "@/store/brickStore/brickStore";
import {
	getPreviewFieldId,
	getPreviewStructureId,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import { usePreviewFocus } from "./usePreviewFocus";
import { resolvePreviewFieldTarget } from "./utils/resolve-preview-field-target";

const { findLinkedDocument, navigate, revealMock, spawnToast } = vi.hoisted(
	() => ({
		findLinkedDocument: vi.fn(),
		navigate: vi.fn(),
		revealMock: vi.fn(
			async (_options?: {
				onOpen?: (trigger: HTMLElement) => void;
			}): Promise<(() => void) | null> =>
				() =>
					undefined,
		),
		spawnToast: vi.fn(),
	}),
);
vi.mock("@/utils/spawn-toast", () => ({ default: spawnToast }));
vi.mock("@solidjs/router", () => ({ useNavigate: () => navigate }));
vi.mock("@/utils/find-linked-document", () => ({ findLinkedDocument }));
vi.mock("@/utils/preview-focus-dom", async (importOriginal) => ({
	...(await importOriginal()),
	revealPreviewField: revealMock,
}));

const collection = {
	fields: [
		{ type: "text", key: "slug" },
		{
			type: "tab",
			key: "content-tab",
			fields: [
				{
					type: "collapsible",
					key: "content-section",
					fields: [
						{
							type: "repeater",
							key: "sections",
							fields: [{ type: "text", key: "heading" }],
						},
					],
				},
			],
		},
	],
	fixedBricks: [],
	builderBricks: [
		{
			key: "content",
			fields: [{ type: "text", key: "title" }],
		},
	],
} as unknown as Collection;

const repeaterField: InternalDocumentField = {
	type: "repeater",
	key: "sections",
	groups: [
		{
			ref: "group-second",
			order: 2,
			open: false,
			fields: [{ type: "text", key: "heading", value: "Second" }],
		},
		{
			ref: "group-first",
			order: 1,
			open: false,
			fields: [{ type: "text", key: "heading", value: "First" }],
		},
	],
};

const bricks: BrickData[] = [
	{
		ref: "collection-pseudo-brick",
		key: "collection-pseudo-brick",
		order: -1,
		type: "collection-fields",
		open: true,
		fields: [{ type: "text", key: "slug", value: "/home" }, repeaterField],
	},
	{
		ref: "local-brick-ref",
		key: "content",
		order: 0,
		type: "builder",
		open: false,
		fields: [{ type: "text", key: "title", value: "Hello" }],
	},
];

const createFocus = (props?: { documentId?: () => number }) =>
	usePreviewFocus({
		collection: () => collection,
		collectionKey: () => "page",
		documentId: props?.documentId ?? (() => 1),
		locales: () => ["en"],
		ready: () => true,
		collections: () => [{ ...collection, key: "page" }],
	});
//* items are found by ref, at their place in the builder's list
const first = { ref: "group-first" };
const second = { ref: "group-second" };

afterEach(() => {
	brickStore.get.reset();
	revealMock.mockReset();
	revealMock.mockResolvedValue(() => undefined);
	spawnToast.mockClear();
});

describe("preview focus target resolution", () => {
	test("resolves a root collection field", () => {
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				path: ["slug"],
			},
			collection,
			bricks,
		});

		expect(result).toEqual({
			structureIds: [],
			fieldId: getPreviewFieldId({ brickIndex: 0, path: ["slug"] }),
		});
	});

	test("records ordered reveal controls for a repeater path", () => {
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				path: ["sections", first, "heading"],
			},
			collection,
			bricks,
		});

		expect(result).toEqual({
			structureIds: [
				getPreviewStructureId({
					brickIndex: 0,
					type: "tab",
					key: "content-tab",
					pathPrefix: [],
				}),
				getPreviewStructureId({
					brickIndex: 0,
					type: "collapsible",
					key: "content-section",
					pathPrefix: [],
				}),
				getPreviewStructureId({
					brickIndex: 0,
					type: "group",
					path: ["sections", 1],
				}),
			],
			fieldId: getPreviewFieldId({
				brickIndex: 0,
				path: ["sections", 1, "heading"],
			}),
		});
	});

	test("steps through the container keys content responses nest fields under", () => {
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				path: ["content-section", "sections", first, "heading"],
			},
			collection,
			bricks,
		});

		expect(result?.fieldId).toBe(
			getPreviewFieldId({ brickIndex: 0, path: ["sections", 1, "heading"] }),
		);
		expect(result?.structureIds).toContain(
			getPreviewStructureId({
				brickIndex: 0,
				type: "collapsible",
				key: "content-section",
				pathPrefix: [],
			}),
		);
	});

	test("opens a repeater item's group when the item itself is targeted", () => {
		const groupId = getPreviewStructureId({
			brickIndex: 0,
			type: "group",
			path: ["sections", 1],
		});
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				path: ["sections", first],
			},
			collection,
			bricks,
		});

		expect(result?.fieldId).toBe(groupId);
		expect(result?.structureIds.at(-1)).toBe(groupId);
	});

	test("finds a builder brick by its ref", () => {
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				brick: { type: "builder", key: "content", ref: "local-brick-ref" },
				path: ["title"],
			},
			collection,
			bricks,
		});

		expect(result).toMatchObject({
			structureIds: [getPreviewStructureId({ brickIndex: 1, type: "brick" })],
			fieldId: getPreviewFieldId({ brickIndex: 1, path: ["title"] }),
		});
	});

	test("rejects missing bricks, fields, and invalid paths", () => {
		for (const target of [
			{
				brick: { type: "builder", key: "content", ref: "removed-ref" },
				path: ["title"],
			},
			{ path: [] },
			{ path: ["sections", second, "missing"] },
			{ path: ["sections", { ref: "removed" }, "heading"] },
			{ path: ["sections", "not-an-item", "heading"] },
		]) {
			expect(
				resolvePreviewFieldTarget({
					target: {
						collectionKey: "page",
						documentId: 1,
						...target,
					} as never,
					collection,
					bricks,
				}),
			).toBeNull();
		}
	});
});

describe("preview focus coordination", () => {
	test("offers to open the document a link on the page goes to, but not the one being edited", async () => {
		const about = {
			collection: {
				key: "page",
				details: { labels: { singular: "Page", plural: "Pages" } },
			},
			document: { id: 5, collectionKey: "page", fields: [] },
			locale: "en",
		};
		findLinkedDocument.mockResolvedValueOnce(about);
		findLinkedDocument.mockResolvedValueOnce({
			...about,
			document: { ...about.document, id: 1 },
		});

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void (async () => {
					await focus.explainLink("http://localhost:3000/en/about");
					const offer = spawnToast.mock.lastCall?.[0];
					expect(offer).toMatchObject({ title: "This links to Page #5" });
					offer.action.onClick();
					expect(navigate).toHaveBeenCalledWith(
						"/admin/collections/page/latest/5",
					);

					await focus.explainLink("http://localhost:3000/en");
					expect(spawnToast.mock.lastCall?.[0]).toMatchObject({
						title: "Links don't open in the preview",
					});
					dispose();
					resolve();
				})();
			});
		});
	});

	test("delegates the resolved reveal sequence", async () => {
		brickStore.set("bricks", structuredClone(bricks));

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void focus
					.requestTarget({
						collectionKey: "page",
						documentId: 1,
						path: ["sections", second, "heading"],
					})
					.then(() => {
						expect(revealPreviewField).toHaveBeenCalledOnce();
						expect(revealMock).toHaveBeenCalledWith(
							expect.objectContaining({
								fieldId: getPreviewFieldId({
									brickIndex: 0,
									path: ["sections", 0, "heading"],
								}),
								structureIds: expect.arrayContaining([
									getPreviewStructureId({
										brickIndex: 0,
										type: "group",
										path: ["sections", 0],
									}),
								]),
							}),
						);
						dispose();
						resolve();
					});
			});
		});
	});

	test("opens a brick targeted without a field", async () => {
		brickStore.set("bricks", structuredClone(bricks));
		const header = getPreviewStructureId({ brickIndex: 1, type: "brick" });

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void focus
					.requestTarget({
						collectionKey: "page",
						documentId: 1,
						brick: { type: "builder", key: "content", ref: "local-brick-ref" },
						path: [],
					})
					.then(() => {
						expect(revealMock).toHaveBeenCalledWith(
							expect.objectContaining({
								structureIds: [header],
								fieldId: header,
							}),
						);
						dispose();
						resolve();
					});
			});
		});
	});

	test("notifies when a resolved field never renders", async () => {
		revealMock.mockResolvedValueOnce(null);
		brickStore.set("bricks", structuredClone(bricks));

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void focus
					.requestTarget({
						collectionKey: "page",
						documentId: 1,
						path: ["slug"],
					})
					.then(() => {
						expect(spawnToast).toHaveBeenCalledOnce();
						dispose();
						resolve();
					});
			});
		});
	});

	test("offers to open another document's field in its own editor, showing it once that loads", async () => {
		brickStore.set("bricks", structuredClone(bricks));
		const target = { collectionKey: "page", documentId: 2, path: ["slug"] };

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				void createFocus()
					.requestTarget(target)
					.then(() => {
						expect(revealMock).not.toHaveBeenCalled();
						spawnToast.mock.lastCall?.[0].action.onClick();
						expect(navigate).toHaveBeenCalledWith(
							"/admin/collections/page/latest/2",
						);
						dispose();
						resolve();
					});
			});
		});

		const dispose = createRoot((dispose) => {
			createFocus({ documentId: () => 2 });
			return dispose;
		});
		await vi.waitFor(() =>
			expect(revealMock).toHaveBeenCalledWith(
				expect.objectContaining({
					fieldId: getPreviewFieldId({ brickIndex: 0, path: ["slug"] }),
				}),
			),
		);
		dispose();
	});

	test("turns builder focus into the page location, with the containers content nests it under", () => {
		brickStore.set("bricks", structuredClone(bricks));
		const nestedCollection = structuredClone(collection);
		const [, tab] = nestedCollection.fields;
		const [section] = tab?.type === "tab" ? tab.fields : [];
		if (section?.type === "collapsible") section.output = "nested";

		createRoot((dispose) => {
			const focus = usePreviewFocus({
				collection: () => nestedCollection,
				collectionKey: () => "page",
				documentId: () => 1,
				locales: () => ["en"],
				ready: () => true,
				collections: () => [{ ...collection, key: "page" }],
			});
			const focusIn = (id: string) => {
				const wrapper = document.createElement("div");
				const input = document.createElement("input");
				wrapper.id = id;
				wrapper.append(input);
				document.body.append(wrapper);
				input.focus();
				wrapper.remove();
			};

			focusIn(
				getPreviewFieldId({ brickIndex: 0, path: ["sections", 1, "heading"] }),
			);
			expect(focus.builderTarget()).toEqual({
				collectionKey: "page",
				documentId: 1,
				path: ["content-section", "sections", first, "heading"],
			});

			focusIn(getPreviewStructureId({ brickIndex: 1, type: "brick" }));
			expect(focus.builderTarget()).toEqual({
				collectionKey: "page",
				documentId: 1,
				brick: { type: "builder", key: "content", ref: "local-brick-ref" },
				path: [],
			});
			dispose();
		});
	});

	test("closes what preview targets opened once the page selects elsewhere, keeping what the next target needs", async () => {
		brickStore.set("bricks", structuredClone(bricks));
		//* stands in for a brick or item header, which flips open on each click
		const createTrigger = (id: string) => {
			const trigger = document.createElement("div");
			trigger.id = id;
			trigger.dataset.previewFocusOpen = "false";
			trigger.addEventListener("click", () => {
				trigger.dataset.previewFocusOpen = String(
					trigger.dataset.previewFocusOpen !== "true",
				);
			});
			document.body.append(trigger);
			return trigger;
		};
		const brick = createTrigger(
			getPreviewStructureId({ brickIndex: 1, type: "brick" }),
		);
		const item = createTrigger("an-item-in-the-brick");
		revealMock.mockImplementation(async (options) => {
			for (const trigger of [brick, item]) {
				if (trigger.dataset.previewFocusOpen === "true") continue;
				trigger.click();
				options?.onOpen?.(trigger);
			}
			return () => undefined;
		});
		const brickTarget = {
			collectionKey: "page",
			documentId: 1,
			brick: {
				type: "builder" as const,
				key: "content",
				ref: "local-brick-ref",
			},
			path: [],
		};

		await new Promise<void>((resolve) => {
			createRoot(async (dispose) => {
				const focus = createFocus();
				await focus.requestTarget(brickTarget);
				expect(brick.dataset.previewFocusOpen).toBe("true");
				expect(item.dataset.previewFocusOpen).toBe("true");

				//* the brick holds the next target, so only the item closes before it's revealed
				revealMock.mockResolvedValueOnce(() => undefined);
				await focus.requestTarget(brickTarget);
				expect(brick.dataset.previewFocusOpen).toBe("true");
				expect(item.dataset.previewFocusOpen).toBe("false");

				focus.deselect();
				expect(brick.dataset.previewFocusOpen).toBe("false");
				brick.remove();
				item.remove();
				dispose();
				resolve();
			});
		});
	});

	test("does not treat UI-only group opening as content", () => {
		brickStore.set("bricks", structuredClone(bricks));
		brickStore.get.captureInitialSnapshot();

		brickStore.get.toggleGroupOpen({
			brickIndex: 0,
			repeaterKey: "sections",
			ref: "group-first",
			parentRepeaterKey: undefined,
			parentRef: undefined,
		});

		expect(brickStore.getDocumentMutated()).toBe(true);
		expect(brickStore.getDocumentContentMutated()).toBe(false);
		expect(brickStore.getBuilderBrickStructureMutated()).toBe(false);
	});
});
