import { createMemo, createSignal, onCleanup } from "solid-js";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";

const DEFAULT_WIDTH = 440;
const MIN_WIDTH = 360;
const MIN_PREVIEW_WIDTH = 520;
const KEY_STEP = 16;
const LARGE_KEY_STEP = 64;

const clampWidth = (width: number, max: number) =>
	Math.round(Math.min(max, Math.max(MIN_WIDTH, width)));

/**
 * Resizes the fields column per frame and saves its width locally after dragging. Supports arrows,
 * Shift, Home and End; Enter or double-click resets. Clamps to available space while preserving
 * the saved preference.
 */
export const useBuilderSplit = () => {
	// ----------------------------------------
	// State & Hooks
	const interfaceDirection = useInterfaceDirection();
	const [width, setWidth] = createSignal(
		userPreferencesStore.getBuilderFieldsWidth() ?? DEFAULT_WIDTH,
	);
	const [available, setAvailable] = createSignal(0);
	const [dragging, setDragging] = createSignal(false);
	let stopDrag: (() => void) | undefined;

	// ----------------------------------------
	// Memos
	const max = createMemo(() =>
		Math.max(MIN_WIDTH, available() - MIN_PREVIEW_WIDTH),
	);
	const size = createMemo(() =>
		available() === 0 ? width() : clampWidth(width(), max()),
	);

	// ----------------------------------------
	// Functions
	const commit = (next: number) => {
		const clamped = clampWidth(next, max());
		setWidth(clamped);
		userPreferencesStore.setBuilderFieldsWidth(clamped);
	};
	/** Measures the row the fields and preview share. */
	const observe = (element: HTMLElement) => {
		const observer = new ResizeObserver(() =>
			setAvailable(element.clientWidth),
		);
		observer.observe(element);
		onCleanup(() => observer.disconnect());
	};
	const onPointerDown = (event: PointerEvent) => {
		if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) {
			return;
		}
		event.preventDefault();
		const handle = event.currentTarget;
		const startX = event.clientX;
		const startWidth = size();
		//* right to left, the fields sit on the right, so dragging left widens them
		const direction = interfaceDirection.isRTL() ? -1 : 1;
		let pointerX = startX;
		let frame = 0;
		const widthAt = (x: number) =>
			clampWidth(startWidth + (x - startX) * direction, max());

		const move = (moveEvent: PointerEvent) => {
			pointerX = moveEvent.clientX;
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				setWidth(widthAt(pointerX));
			});
		};
		const end = () => {
			cancelAnimationFrame(frame);
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", end);
			handle.removeEventListener("pointercancel", end);
			handle.removeEventListener("lostpointercapture", end);
			stopDrag = undefined;
			setDragging(false);
			document.body.style.removeProperty("cursor");
			document.body.style.removeProperty("user-select");
			commit(widthAt(pointerX));
		};

		handle.setPointerCapture(event.pointerId);
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", end);
		handle.addEventListener("pointercancel", end);
		handle.addEventListener("lostpointercapture", end);
		stopDrag = end;
		setDragging(true);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};
	const onKeyDown = (event: KeyboardEvent) => {
		const step = event.shiftKey ? LARGE_KEY_STEP : KEY_STEP;
		const widen = interfaceDirection.isRTL() ? "ArrowLeft" : "ArrowRight";
		const narrow = interfaceDirection.isRTL() ? "ArrowRight" : "ArrowLeft";

		let next: number | undefined;
		if (event.key === widen) next = size() + step;
		else if (event.key === narrow) next = size() - step;
		else if (event.key === "Home") next = MIN_WIDTH;
		else if (event.key === "End") next = max();
		else if (event.key === "Enter") next = DEFAULT_WIDTH;
		if (next === undefined) return;

		event.preventDefault();
		commit(next);
	};

	return {
		size,
		min: MIN_WIDTH,
		max,
		dragging,
		observe,
		onPointerDown,
		onKeyDown,
		reset: () => commit(DEFAULT_WIDTH),
		/** Ends a drag in progress, eg. when its handle unmounts before the pointer is released. */
		endDrag: () => stopDrag?.(),
	};
};

export type UseBuilderSplit = ReturnType<typeof useBuilderSplit>;
