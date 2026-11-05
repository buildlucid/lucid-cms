import { describe, expect, test } from "vitest";
import {
	createPreviewMessage,
	isPreviewPageMessage,
	isPreviewBuilderMessage,
	previewProtocol,
} from "./index.js";

const target = { collectionKey: "page", documentId: 1, path: ["title"] };
const brickTarget = {
	collectionKey: "page",
	documentId: 1,
	brick: { type: "builder", key: "hero", ref: "hero-1" },
	path: [],
} as const;

describe("direction-specific message validation", () => {
	test("accepts the page's messages and rejects the builder's or unknown ones", () => {
		expect(
			isPreviewPageMessage(
				createPreviewMessage({
					type: "ready",
					updates: true,
					loadedAt: 0,
				}),
			),
		).toBe(true);
		expect(isPreviewPageMessage(createPreviewMessage({ type: "unload" }))).toBe(
			true,
		);
		expect(
			isPreviewPageMessage(
				createPreviewMessage({
					type: "navigationLocked",
					href: "https://site.example/about",
				}),
			),
		).toBe(true);
		expect(
			isPreviewPageMessage(
				createPreviewMessage({ type: "navigationLocked", href: null }),
			),
		).toBe(true);
		expect(
			isPreviewPageMessage(
				createPreviewMessage({
					type: "navigationLocked",
					href: "javascript:alert(1)",
				}),
			),
		).toBe(false);
		expect(
			isPreviewPageMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "ready",
			}),
		).toBe(false);
		expect(
			isPreviewPageMessage(
				createPreviewMessage({
					type: "focus",
					target,
				}),
			),
		).toBe(true);
		expect(
			isPreviewPageMessage(createPreviewMessage({ type: "connect" })),
		).toBe(false);
		expect(
			isPreviewPageMessage({
				scope: previewProtocol.scope,
				version: 2,
				type: "ready",
				updates: false,
				loadedAt: 0,
			}),
		).toBe(false);
		expect(
			isPreviewPageMessage({
				...createPreviewMessage({
					type: "ready",
					updates: false,
					loadedAt: 0,
				}),
				extra: "x",
			}),
		).toBe(false);
	});

	test("accepts the builder's messages and validates their payloads", () => {
		expect(
			isPreviewBuilderMessage(createPreviewMessage({ type: "connect" })),
		).toBe(true);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "captureScroll",
					requestId: "capture-1",
				}),
			),
		).toBe(true);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "restoreScroll",
					state: { pageKey: "https://example.com/", x: 0, y: 10 },
				}),
			),
		).toBe(true);
		expect(
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "captureScroll",
				requestId: "",
			}),
		).toBe(false);
	});

	test("accepts updates with a whole, non-negative revision", () => {
		const update = (revision: unknown) =>
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "update",
				revision,
			});

		expect(update(0)).toBe(true);
		expect(update(12)).toBe(true);
		expect(update(-1)).toBe(false);
		expect(update(1.5)).toBe(false);
		expect(update("1")).toBe(false);
	});

	test("accepts edit mode for one document with its repeaters and errors, or off", () => {
		const editMode = (editing: unknown) =>
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "editMode",
				editing,
			});
		const editing = {
			collectionKey: "page",
			documentId: 1,
			editable: true,
			repeaters: [{ brick: "hero", path: ["links"] }, { path: ["faq"] }],
			errors: [
				{
					brick: { type: "builder", key: "hero", ref: "a" },
					path: ["links", { ref: "a" }],
				},
				{ path: ["title"] },
			],
			theme: "light",
		};

		expect(editMode(editing)).toBe(true);
		expect(editMode(null)).toBe(true);
		expect(editMode({ ...editing, editable: undefined })).toBe(false);
		expect(editMode({ ...editing, documentId: 0 })).toBe(false);
		expect(editMode({ ...editing, repeaters: [{ path: [] }] })).toBe(false);
		expect(editMode({ ...editing, errors: [{ path: [-1] }] })).toBe(false);
		expect(editMode({ ...editing, errors: undefined })).toBe(false);
		expect(editMode({ ...editing, bricks: [] })).toBe(false);
		expect(editMode({ ...editing, theme: "sepia" })).toBe(false);
	});

	test("accepts moves of builder bricks and repeater items next to a sibling", () => {
		const move = (target: unknown, anchor: unknown, place = "after") =>
			isPreviewPageMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "move",
				target,
				place,
				anchor,
			});
		const item = (index: number) => ({
			...brickTarget,
			path: ["items", { ref: `item-${index}` }],
		});
		const other = {
			...brickTarget,
			brick: { ...brickTarget.brick, ref: "hero-2" },
		};

		expect(move(brickTarget, other)).toBe(true);
		expect(move(item(0), item(2), "before")).toBe(true);
		expect(move(item(0), item(2), "inside")).toBe(false);
		expect(
			move(item(0), { ...other, path: ["items", { ref: "item-1" }] }),
		).toBe(false);
		expect(move(item(0), other)).toBe(false);
		expect(move(target, { ...target, path: ["subtitle"] })).toBe(false);
		expect(
			move(
				{ ...brickTarget, brick: { ...brickTarget.brick, type: "fixed" } },
				{ ...other, brick: { ...other.brick, type: "fixed" } },
			),
		).toBe(false);
	});

	test("accepts what the pointer is over, with finite positions", () => {
		const hover = (value: unknown) =>
			isPreviewPageMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "hover",
				hover: value,
			});
		const rect = { x: 0, y: 10, width: 200, height: 80 };
		const value = {
			brick: {
				key: 1,
				target: brickTarget,
				rect,
				previous: null,
				next: { ...brickTarget, brick: { ...brickTarget.brick, ref: "b" } },
				horizontal: false,
			},
			item: null,
			repeater: { key: 2, target: { ...brickTarget, path: ["items"] }, rect },
			selected: { key: 3, target, rect },
			pointer: { x: 12, y: 40 },
			inset: 0,
			scrolling: false,
		};

		expect(hover(value)).toBe(true);
		expect(
			hover({ ...value, brick: null, repeater: null, pointer: null }),
		).toBe(true);
		expect(
			hover({
				...value,
				brick: { ...value.brick, rect: { ...rect, x: Number.NaN } },
			}),
		).toBe(false);
		expect(
			hover({
				...value,
				repeater: { ...value.repeater, rect: { ...rect, width: -1 } },
			}),
		).toBe(false);
		expect(hover({ ...value, selected: null })).toBe(true);
		expect(hover({ ...value, selected: undefined })).toBe(false);
		expect(hover({ ...value, pointer: { x: 1 } })).toBe(false);
		expect(hover({ ...value, brick: { ...value.brick, key: -1 } })).toBe(false);
	});

	test("accepts drags of bricks and items to a finite point", () => {
		const drag = (dragged: unknown, x: unknown) =>
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "drag",
				target: dragged,
				x,
				y: 20,
			});

		expect(drag(brickTarget, 10)).toBe(true);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "zoom",
					zooming: true,
				}),
			),
		).toBe(true);
		const dragged = (value: unknown, landing: unknown) =>
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "dragged",
				target: value,
				landing,
			});
		const other = { ...brickTarget, brick: { ...brickTarget.brick, ref: "b" } };
		expect(dragged(brickTarget, { anchor: other, place: "after" })).toBe(true);
		expect(dragged(brickTarget, null)).toBe(true);
		expect(dragged(null, null)).toBe(true);
		expect(dragged(null, { anchor: other, place: "after" })).toBe(false);
		expect(dragged(target, null)).toBe(false);
		expect(
			dragged(
				{ ...brickTarget, path: ["items", { ref: "item-0" }] },
				{
					anchor: { ...brickTarget, path: ["items", { ref: "item-2" }] },
					place: "after",
				},
			),
		).toBe(true);
		expect(dragged(brickTarget, { anchor: target, place: "after" })).toBe(
			false,
		);
		expect(drag(brickTarget, Infinity)).toBe(false);
		expect(drag(target, 10)).toBe(false);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "dragEnd",
					drop: true,
				}),
			),
		).toBe(true);
	});

	test("accepts editing a field's text on the page, but not a brick's or item's", () => {
		const fromPage = (message: Record<string, unknown>) =>
			isPreviewPageMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				...message,
			});
		const item = { ...brickTarget, path: ["items", { ref: "item-0" }] };

		expect(fromPage({ type: "edit", target, text: "Welcome" })).toBe(true);
		expect(fromPage({ type: "edit", target, text: "" })).toBe(true);
		expect(fromPage({ type: "edit", target, text: null })).toBe(true);
		expect(fromPage({ type: "edit", target: item, text: null })).toBe(false);
		expect(fromPage({ type: "edit", target: brickTarget, text: null })).toBe(
			false,
		);
		expect(fromPage({ type: "edit", target, text: "a".repeat(65537) })).toBe(
			false,
		);
		expect(fromPage({ type: "inlineInput", target, value: "" })).toBe(true);
		expect(fromPage({ type: "inlineInput", target, value: 1 })).toBe(false);
		expect(fromPage({ type: "inlineEnd", target, cancelled: true })).toBe(true);
		expect(fromPage({ type: "inlineEnd", target })).toBe(false);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "inlineStart",
					target,
					multiline: false,
					clear: true,
				}),
			),
		).toBe(true);
		expect(
			isPreviewBuilderMessage(
				createPreviewMessage({
					type: "editSelected",
					target,
				}),
			),
		).toBe(true);
		expect(
			isPreviewBuilderMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: "inlineStart",
				target: item,
				multiline: false,
				clear: false,
			}),
		).toBe(false);
	});
});
