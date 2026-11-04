// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from "vitest";
import type {
	PreviewEditing,
	PreviewFieldPath,
	PreviewFieldTarget,
	PreviewHover,
} from "../protocol/index.js";
import { previewOverlayTagName } from "./constants.js";
import { installPreviewEditing } from "./editing.js";

const page = { collectionKey: "page", documentId: 42 };
const brickTarget = (ref: string): PreviewFieldTarget => ({
	...page,
	brick: { type: "builder", key: "features", ref },
	path: [],
});
const itemTarget = (index: number): PreviewFieldTarget => ({
	...page,
	brick: { type: "builder", key: "features", ref: "a" },
	path: ["items", index],
});
const titleTarget = (index: number): PreviewFieldTarget => ({
	...itemTarget(index),
	path: ["items", index, "title"],
});

const editingFor = (
	structure = true,
	errors: PreviewFieldPath[] = [],
): PreviewEditing => ({
	...page,
	structure,
	repeaters: [{ brick: "features", path: ["items"] }],
	errors,
});

//* the markup `@lucidcms/client`'s `previewAttributes` writes
const markup = (target: PreviewFieldTarget) =>
	`1:${encodeURIComponent(JSON.stringify(target))}`;

const mark = <TElement extends Element>(
	element: TElement,
	target: PreviewFieldTarget | string,
	rect?: { x: number; y: number; width: number; height: number },
) => {
	element.setAttribute(
		"data-lucid-preview-field",
		typeof target === "string" ? target : markup(target),
	);
	if (rect) {
		element.getBoundingClientRect = () =>
			({
				...rect,
				top: rect.y,
				left: rect.x,
				right: rect.x + rect.width,
				bottom: rect.y + rect.height,
			}) as DOMRect;
	}
	return element;
};

/** Two feature-grid bricks, the first with two marked items holding marked titles, laid out top to bottom. */
const renderPage = () => {
	const first = mark(document.createElement("section"), brickTarget("a"), {
		x: 0,
		y: 0,
		width: 800,
		height: 400,
	});
	const list = mark(
		document.createElement("div"),
		{ ...brickTarget("a"), path: ["items"] },
		{ x: 40, y: 100, width: 720, height: 200 },
	);
	const items = [0, 1].map((index) => {
		const card = mark(document.createElement("article"), itemTarget(index), {
			x: 40 + index * 380,
			y: 100,
			width: 340,
			height: 200,
		});
		const link = document.createElement("a");
		link.href = "/next";
		const title = mark(document.createElement("h3"), titleTarget(index), {
			x: 60 + index * 380,
			y: 120,
			width: 300,
			height: 30,
		});
		link.append(title);
		card.append(link);
		list.append(card);
		return { card, title };
	});
	first.append(list);
	const second = mark(document.createElement("section"), brickTarget("b"), {
		x: 0,
		y: 400,
		width: 800,
		height: 400,
	});
	document.body.append(first, second);
	return { first, second, list, items };
};

const click = (element: Element, init: MouseEventInit = {}) => {
	const event = new MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		composed: true,
		button: 0,
		...init,
	});
	element.dispatchEvent(event);
	return event;
};
const pointer = (type: string, element: Element, init: PointerEventInit = {}) =>
	element.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			composed: true,
			button: 0,
			...init,
		}),
	);
const frame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

//* cleaned up after each test, so one failing early can't leave listeners for the next
const installed: Array<() => void> = [];

const install = (connected = true) => {
	const sendFocus = vi.fn(() => connected);
	const sendHover = vi.fn<(hover: PreviewHover) => void>();
	const sendDeselect = vi.fn();
	const sendMove = vi.fn();
	const editing = installPreviewEditing({
		targetWindow: window,
		isConnected: () => connected,
		sendFocus,
		sendDeselect,
		sendHover,
		sendMove,
	});
	installed.push(editing.cleanup);
	return { editing, sendFocus, sendHover, sendMove };
};

const layer = () =>
	document.querySelector(previewOverlayTagName)?.shadowRoot ?? null;
/** Moves the pointer to the middle of an element, then waits for the layer to draw. */
const hover = async (element: Element) => {
	const rect = element.getBoundingClientRect();
	pointer("pointermove", element, {
		clientX: rect.x + rect.width / 2,
		clientY: rect.y + rect.height / 2,
	});
	await frame();
	await frame();
};

/** Records where elements are animated to, standing in for happy-dom's animations, which reject when cancelled. */
const trackShifts = () => {
	const shifts = new Map<Element, Keyframe | undefined>();
	vi.spyOn(Element.prototype, "animate").mockImplementation(function (
		this: Element,
		keyframes,
	) {
		shifts.set(this, Array.isArray(keyframes) ? keyframes.at(-1) : undefined);
		return {
			cancel: () => undefined,
			playState: "finished",
			addEventListener: () => undefined,
		} as unknown as Animation;
	});
	return shifts;
};

afterEach(() => {
	for (const cleanup of installed.splice(0)) cleanup();
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("preview editing", () => {
	test("outside edit mode, plain clicks pass and Alt-click opens the nearest marked element", () => {
		const { editing, sendFocus } = install();
		const { items } = renderPage();
		const title = items[0]?.title;
		if (!title) throw new Error("missing title");

		expect(click(title).defaultPrevented).toBe(false);
		expect(click(title, { altKey: true }).defaultPrevented).toBe(true);
		expect(sendFocus).toHaveBeenCalledWith(titleTarget(0));
		editing.cleanup();
		expect(click(title, { altKey: true }).defaultPrevented).toBe(false);
	});

	test("doesn't stop clicks the builder couldn't be told about", () => {
		const { editing } = install(false);
		const { items } = renderPage();
		expect(
			click(items[0]?.title ?? document.body, { altKey: true })
				.defaultPrevented,
		).toBe(false);
		editing.cleanup();
	});

	test("in edit mode, clicks open the edited document's fields, items and bricks", () => {
		const { editing, sendFocus } = install();
		const { items, second } = renderPage();
		const other = mark(document.createElement("a"), {
			collectionKey: "menu",
			documentId: 1,
			path: ["label"],
		});
		document.body.append(other);
		editing.setEditing(editingFor());

		expect(click(items[1]?.title ?? document.body).defaultPrevented).toBe(true);
		expect(sendFocus).toHaveBeenLastCalledWith(titleTarget(1));
		click(items[1]?.card ?? document.body);
		expect(sendFocus).toHaveBeenLastCalledWith(itemTarget(1));
		click(second);
		expect(sendFocus).toHaveBeenLastCalledWith(brickTarget("b"));

		sendFocus.mockClear();
		expect(click(other).defaultPrevented).toBe(false);
		expect(
			click(items[0]?.title ?? document.body, { metaKey: true })
				.defaultPrevented,
		).toBe(false);
		expect(sendFocus).not.toHaveBeenCalled();
		editing.cleanup();
		expect(layer()).toBeNull();
	});

	test("tells the builder which brick, item and repeater the pointer is over", async () => {
		const { editing, sendHover } = install();
		const { items, list } = renderPage();
		editing.setEditing(editingFor());
		const last = () => sendHover.mock.lastCall?.[0];

		await hover(items[0]?.title ?? document.body);
		expect(last()).toMatchObject({
			brick: {
				target: brickTarget("a"),
				previous: null,
				next: brickTarget("b"),
			},
			item: {
				target: itemTarget(0),
				rect: { x: 40, y: 100, width: 340, height: 200 },
				previous: null,
				next: itemTarget(1),
				horizontal: true,
			},
			repeater: null,
			pointer: { x: 210, y: 135 },
		});

		await hover(list);
		expect(last()?.repeater?.target).toEqual({
			...brickTarget("a"),
			path: ["items"],
		});

		//* leaving the page keeps what was under the pointer, so the builder can keep its controls
		document.dispatchEvent(
			new PointerEvent("pointerout", { bubbles: true, relatedTarget: null }),
		);
		await frame();
		await frame();
		expect(last()).toMatchObject({
			brick: { target: brickTarget("a") },
			pointer: null,
		});
		editing.cleanup();
	});

	test("follows an item a morph kept but moved, by its new marker", async () => {
		const { editing, sendHover } = install();
		const { items } = renderPage();
		editing.setEditing(editingFor());
		const card = items[0]?.card ?? document.body;

		await hover(card);
		card.setAttribute("data-lucid-preview-field", markup(itemTarget(1)));
		await frame();
		await frame();
		expect(sendHover.mock.lastCall?.[0].item?.target).toEqual(itemTarget(1));
		editing.cleanup();
	});

	test("shows a dragged brick faint where it would land, the brick it passes making room, and moves it there on drop", async () => {
		const shifts = trackShifts();
		const { editing, sendMove } = install();
		const { first, second } = renderPage();
		editing.setEditing(editingFor());

		editing.drag(brickTarget("a"), 20, 700);
		await frame();
		expect(layer()?.querySelector<HTMLElement>(".landing")?.hidden).toBe(false);
		expect(shifts.get(first)).toEqual({
			translate: "0px 400px",
			opacity: "0.4",
		});
		expect(shifts.get(second)).toEqual({
			translate: "0px -400px",
			opacity: "1",
		});
		editing.endDrag(true);
		expect(sendMove).toHaveBeenCalledWith(
			brickTarget("a"),
			"after",
			brickTarget("b"),
		);
		//* it stays there at full strength until the page re-renders with the move
		expect(shifts.get(first)).toEqual({
			translate: "0px 400px",
			opacity: "1",
		});

		//* dropping next to itself, or cancelling, leaves it be
		sendMove.mockClear();
		editing.drag(brickTarget("b"), 20, 50);
		editing.drag(brickTarget("b"), 20, second.getBoundingClientRect().y + 10);
		editing.endDrag(true);
		editing.drag(brickTarget("b"), 20, 50);
		editing.endDrag(false);
		expect(sendMove).not.toHaveBeenCalled();
		editing.cleanup();
	});

	test("outlines fields, and items holding them, in red when they have errors", async () => {
		const { editing } = install();
		const { items } = renderPage();
		editing.setEditing(
			editingFor(true, [
				{ brick: brickTarget("a").brick, path: ["items", 1, "title"] },
			]),
		);
		const fill = () => layer()?.querySelector<HTMLElement>(".fill");

		await hover(items[0]?.title ?? document.body);
		expect(fill()?.classList.contains("fill--invalid")).toBe(false);
		await hover(items[1]?.card ?? document.body);
		expect(fill()?.classList.contains("fill--invalid")).toBe(true);
		click(items[1]?.title ?? document.body);
		await frame();
		expect(
			layer()
				?.querySelector<HTMLElement>(".selected")
				?.classList.contains("selected--invalid"),
		).toBe(true);
	});

	test("moves the selection's item with Alt and the arrow keys, only when structure changes are allowed", () => {
		const { editing, sendMove } = install();
		const { items } = renderPage();
		editing.setEditing(editingFor(false));
		const press = () =>
			window.dispatchEvent(
				new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true }),
			);

		click(items[0]?.title ?? document.body);
		press();
		editing.drag(brickTarget("a"), 20, 700);
		editing.endDrag(true);
		expect(sendMove).not.toHaveBeenCalled();

		editing.setEditing(editingFor());
		click(items[0]?.title ?? document.body);
		press();
		expect(sendMove).toHaveBeenCalledWith(
			itemTarget(0),
			"after",
			itemTarget(1),
		);
		editing.cleanup();
	});

	test("highlights wait for an element the builder just added", async () => {
		const { editing } = install();
		renderPage();
		editing.setEditing(editingFor());
		const ring = () => layer()?.querySelector<HTMLElement>(".selected");

		editing.highlight(brickTarget("c"));
		await frame();
		expect(ring()?.hidden).toBe(true);

		document.body.append(
			mark(document.createElement("section"), brickTarget("c"), {
				x: 0,
				y: 800,
				width: 800,
				height: 300,
			}),
		);
		await frame();
		await frame();
		expect(ring()?.hidden).toBe(false);
		editing.cleanup();
	});

	test("drops a waiting highlight once the user selects something else", async () => {
		const { editing } = install();
		renderPage();
		editing.setEditing(editingFor());
		const ring = () => layer()?.querySelector<HTMLElement>(".selected");

		editing.highlight(brickTarget("c"));
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		document.body.append(
			mark(document.createElement("section"), brickTarget("c"), {
				x: 0,
				y: 800,
				width: 800,
				height: 300,
			}),
		);
		await frame();
		await frame();
		expect(ring()?.hidden).toBe(true);
		editing.cleanup();
	});

	test("Alt shows every marked element, only outside edit mode", () => {
		const { editing } = install();
		renderPage();
		document.body.append(mark(document.createElement("p"), "1:not-json"));
		const hints = () => layer()?.querySelectorAll(".hint").length ?? 0;

		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		expect(hints()).toBe(7);
		window.dispatchEvent(new KeyboardEvent("keyup", { key: "Alt" }));
		expect(hints()).toBe(0);

		editing.setEditing(editingFor());
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Alt" }));
		expect(hints()).toBe(0);
		editing.cleanup();
	});
});
