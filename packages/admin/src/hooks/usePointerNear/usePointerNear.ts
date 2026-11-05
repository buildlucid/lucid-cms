import { type Accessor, createMemo, createSignal, onCleanup } from "solid-js";

type Point = { x: number; y: number };

//* how close the pointer comes before, eg., an edge's reveal bar shows
const NEAR_DISTANCE = 96;

/** Checks whether the pointer is within `distance` pixels of an element. */
export const usePointerNear = (options: {
	element: () => HTMLElement | undefined;
	/** In pixels. @default 96 */
	distance?: number;
	/** Ignores the pointer, as if it were far away, while false. @default true */
	enabled?: Accessor<boolean>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const [documentPointer, setDocumentPointer] = createSignal<Point | null>(
		null,
	);

	// ----------------------------------------
	// Functions
	const onPointerMove = (event: PointerEvent) => {
		if (event.pointerType === "touch") return;
		setDocumentPointer({ x: event.clientX, y: event.clientY });
	};
	//* leaving for a frame or out of the window, the document stops seeing it
	const onPointerOut = (event: PointerEvent) => {
		if (event.relatedTarget === null) setDocumentPointer(null);
	};

	// ----------------------------------------
	// Effects
	window.addEventListener("pointermove", onPointerMove, { passive: true });
	window.addEventListener("pointerout", onPointerOut, { passive: true });
	onCleanup(() => {
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerout", onPointerOut);
	});

	return createMemo(() => {
		if (options.enabled?.() === false) return false;
		const point = documentPointer();
		const element = options.element();
		if (!point || !element) return false;
		const rect = element.getBoundingClientRect();
		const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
		const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
		return Math.hypot(dx, dy) <= (options.distance ?? NEAR_DISTANCE);
	});
};
