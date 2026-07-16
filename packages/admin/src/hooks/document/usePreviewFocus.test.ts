import type { Collection, InternalDocumentField } from "@types";
import { createRoot } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import brickStore, { type BrickData } from "@/store/brickStore";
import {
	getPreviewFieldId,
	getPreviewStructureId,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import { resolvePreviewFieldTarget, usePreviewFocus } from "./usePreviewFocus";

const { revealMock, spawnToast } = vi.hoisted(() => ({
	revealMock: vi.fn(async (): Promise<(() => void) | null> => () => undefined),
	spawnToast: vi.fn(),
}));
vi.mock("@/utils/spawn-toast", () => ({ default: spawnToast }));
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

const createFocus = (options?: {
	hasUnsavedContent?: boolean;
	hasUnsavedBuilderStructure?: boolean;
}) =>
	usePreviewFocus({
		collection: () => collection,
		collectionKey: () => "page",
		documentId: () => 1,
		hasUnsavedContent: () => options?.hasUnsavedContent ?? false,
		hasUnsavedBuilderStructure: () =>
			options?.hasUnsavedBuilderStructure ?? false,
	});

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
				path: ["sections", 1, "heading"],
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

	test("finds a builder brick by its public key and order", () => {
		const result = resolvePreviewFieldTarget({
			target: {
				collectionKey: "page",
				documentId: 1,
				brick: { type: "builder", key: "content", order: 0 },
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
				brick: { type: "builder", key: "content", order: 4 },
				path: ["title"],
			},
			{ path: ["sections", 0, "missing"] },
			{ path: ["sections", "not-an-index", "heading"] },
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
	test("delegates the resolved reveal sequence", async () => {
		brickStore.set("bricks", structuredClone(bricks));

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void focus
					.requestTarget({
						collectionKey: "page",
						documentId: 1,
						path: ["sections", 0, "heading"],
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

	test("targets a newly saved brick without depending on its local ref", async () => {
		brickStore.set("bricks", structuredClone(bricks));

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const focus = createFocus();
				void focus
					.requestTarget({
						collectionKey: "page",
						documentId: 1,
						brick: { type: "builder", key: "content", order: 0 },
						path: ["title"],
					})
					.then(() => {
						expect(revealMock).toHaveBeenCalledWith(
							expect.objectContaining({
								structureIds: [
									getPreviewStructureId({
										brickIndex: 1,
										type: "brick",
									}),
								],
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

	test("rejects cross-document and unsafe dirty positional targets", async () => {
		brickStore.set("bricks", structuredClone(bricks));

		await new Promise<void>((resolve) => {
			createRoot((dispose) => {
				const crossDocument = createFocus();
				const dirtyRepeater = createFocus({ hasUnsavedContent: true });
				const dirtyBricks = createFocus({
					hasUnsavedBuilderStructure: true,
				});

				void Promise.all([
					crossDocument.requestTarget({
						collectionKey: "article",
						documentId: 2,
						path: ["title"],
					}),
					dirtyRepeater.requestTarget({
						collectionKey: "page",
						documentId: 1,
						path: ["sections", 0, "heading"],
					}),
					dirtyBricks.requestTarget({
						collectionKey: "page",
						documentId: 1,
						brick: { type: "builder", key: "content", order: 0 },
						path: ["title"],
					}),
				]).then(() => {
					expect(revealMock).not.toHaveBeenCalled();
					expect(spawnToast).toHaveBeenCalledTimes(3);
					dispose();
					resolve();
				});
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
