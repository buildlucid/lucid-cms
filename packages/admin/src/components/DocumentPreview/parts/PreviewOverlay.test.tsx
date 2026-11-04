import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { PreviewRepeaterCapacity } from "@/hooks/usePreviewStructure/usePreviewStructure";
import type { PreviewHover, PreviewHoverBlock } from "@/preview/protocol";
import { PreviewOverlay } from "./PreviewOverlay";

const { spawnToast } = vi.hoisted(() => ({ spawnToast: vi.fn() }));
vi.mock("@/utils/spawn-toast", () => ({ default: spawnToast }));

const page = { collectionKey: "page", documentId: 1 };
const brick = (ref: string, y: number): PreviewHoverBlock => ({
	key: ref.charCodeAt(0),
	target: { ...page, brick: { type: "builder", key: "hero", ref }, path: [] },
	rect: { x: 0, y, width: 800, height: 300 },
	previous: null,
	next: null,
	horizontal: false,
});
const hoverOver = (
	block: PreviewHoverBlock,
	pointer: { x: number; y: number } | null,
): PreviewHover => ({
	brick: block,
	item: null,
	repeater: null,
	pointer,
	inset: 0,
	scrolling: false,
});

const cleanups: Array<() => void> = [];

const setup = (
	initial: PreviewHover | null,
	capacity: PreviewRepeaterCapacity | null = null,
) => {
	const [hover, setHover] = createSignal(initial);
	const [structure, setStructure] = createSignal(true);
	const props = {
		capacity: vi.fn(() => capacity),
		onOpen: vi.fn(),
		onChange: vi.fn(() => 7),
		onUndo: vi.fn(),
		onDrag: vi.fn(),
		onDragEnd: vi.fn(),
	};
	const container = document.createElement("div");
	document.body.append(container);
	cleanups.push(
		render(
			() => (
				<PreviewOverlay
					hover={hover()}
					scale={0.5}
					width={600}
					structure={structure()}
					details={{
						bricks: [{ key: "hero", label: "Hero", addable: true }],
						fields: [],
					}}
					errors={[]}
					{...props}
				/>
			),
			container,
		),
	);
	const grip = () =>
		container.querySelector<HTMLElement>('[title^="Drag to move"]');
	const options = () =>
		container.querySelector<HTMLButtonElement>('[aria-label^="Options for"]');
	return { ...props, setHover, setStructure, container, grip, options };
};

const pointer = (type: string, target: Element, x = 0, y = 0) =>
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			button: 0,
			clientX: x,
			clientY: y,
			pointerId: 1,
			pointerType: "mouse",
		}),
	);

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	document.body.replaceChildren();
	spawnToast.mockClear();
});

describe("preview edit controls", () => {
	test("put a brick's handle above it at the preview's zoom", () => {
		const { grip } = setup(hoverOver(brick("a", 400), { x: 10, y: 410 }));
		const handle = grip()?.parentElement;

		expect(grip()?.getAttribute("title")).toBe("Drag to move Hero");
		//* 400px down at half zoom, above its outline 2px out, less the handle's height and gap
		expect(handle?.style.translate).toBe(`4px ${200 - 2 - 32 - 6}px`);
	});

	test("hand drags to the page in its own pixels, and drop them there", () => {
		const { grip, onDrag, onDragEnd } = setup(
			hoverOver(brick("a", 400), { x: 10, y: 410 }),
		);
		const button = grip();
		if (!button) throw new Error("missing grip");

		pointer("pointerdown", button, 20, 170);
		pointer("pointermove", button, 20, 300);
		pointer("pointerup", button, 20, 300);

		expect(onDrag).toHaveBeenLastCalledWith(brick("a", 400).target, {
			x: 40,
			y: 600,
		});
		expect(onDragEnd).toHaveBeenCalledWith(true);
	});

	test("cancel a drag when changes stop being allowed, eg. the builder locks", () => {
		const { grip, setStructure, onDragEnd } = setup(
			hoverOver(brick("a", 400), { x: 10, y: 410 }),
		);
		const button = grip();
		if (!button) throw new Error("missing grip");

		pointer("pointerdown", button, 20, 170);
		pointer("pointermove", button, 20, 300);
		setStructure(false);

		expect(onDragEnd).toHaveBeenCalledWith(false);
		expect(grip()).toBeNull();
	});

	test("keep a handle while the pointer crosses the gap to it, then move on", async () => {
		const { setHover, grip } = setup(
			hoverOver(brick("b", 400), { x: 10, y: 410 }),
		);
		//* happy-dom lays nothing out, so every control sits at the overlay's corner
		setHover(hoverOver(brick("a", 0), { x: 2, y: 2 }));
		expect(grip()?.getAttribute("title")).toContain("Hero");
		expect(grip()?.parentElement?.style.translate).toBe(
			`4px ${200 - 2 - 32 - 6}px`,
		);

		setHover(hoverOver(brick("a", 0), { x: 400, y: 100 }));
		expect(grip()?.parentElement?.style.translate).toBe("4px 4px");
	});

	test("remove from the options menu, offering to undo it", async () => {
		const { options, onChange, onUndo } = setup(
			hoverOver(brick("a", 400), { x: 10, y: 410 }),
		);
		const button = options();
		if (!button) throw new Error("missing options");
		pointer("pointerdown", button);
		await Promise.resolve();

		const remove = [...document.querySelectorAll("[role='menuitem']")].find(
			(item) => item.textContent === "Remove",
		);
		if (!remove) throw new Error("missing menu");
		remove.dispatchEvent(
			new PointerEvent("pointerup", { bubbles: true, pointerType: "mouse" }),
		);
		remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(onChange).toHaveBeenCalledWith(brick("a", 400).target, {
			action: "remove",
		});
		spawnToast.mock.lastCall?.[0].action.onClick();
		expect(onUndo).toHaveBeenCalledWith(7);
	});

	test("show a repeater's limit on its add button, greyed out once full", () => {
		const repeater = {
			key: 9,
			target: { ...page, path: ["links"] },
			rect: { x: 0, y: 0, width: 400, height: 200 },
		};
		const { container, onChange } = setup(
			{ ...hoverOver(brick("a", 0), { x: 10, y: 10 }), repeater },
			{ count: 3, max: 3, canAdd: false },
		);
		const add = container.querySelector<HTMLButtonElement>(
			'[title$="more than 3 items"]',
		);

		expect(add?.textContent).toBe("Add item3/3");
		expect(add?.disabled).toBe(true);
		add?.click();
		expect(onChange).not.toHaveBeenCalled();
	});
});
