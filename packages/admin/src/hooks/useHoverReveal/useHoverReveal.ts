import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";

//* resting on it waits a moment, so passing the pointer across doesn't flash it open
const REVEAL_DELAY = 80;
const CONCEAL_DELAY = 250;
//* an open menu renders outside the element and a select's list outside the page, so leaving for either keeps it open, as does keyboard focus inside
const HOLD_OPEN_SELECTOR =
	"[aria-haspopup][aria-expanded='true'], :focus-visible, select:focus";

/**
 * Reveals controls on sustained hover or focus and hides them after both leave. Attach `handlers`
 * to the container and reveal edge.
 */
export const useHoverReveal = (options: {
	/** The element holding what's revealed. */
	element: () => HTMLElement | undefined;
	/** Hides it and ignores the pointer while false. @default true */
	enabled?: Accessor<boolean>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const [revealed, setRevealed] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const enabled = () => options.enabled?.() ?? true;

	// ----------------------------------------
	// Functions
	const reveal = () => {
		clearTimeout(timer);
		setRevealed(true);
	};
	const conceal = () => {
		clearTimeout(timer);
		setRevealed(false);
	};
	const revealSoon = () => {
		clearTimeout(timer);
		timer = setTimeout(() => setRevealed(true), REVEAL_DELAY);
	};
	const concealSoon = () => {
		if (options.element()?.querySelector(HOLD_OPEN_SELECTOR)) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			//* it can slide in under a resting pointer without an event, which the hover state still sees
			if (options.element()?.matches(":hover")) return;
			setRevealed(false);
		}, CONCEAL_DELAY);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!enabled()) conceal();
	});
	onCleanup(() => clearTimeout(timer));

	return {
		revealed,
		reveal,
		conceal,
		handlers: {
			onPointerEnter: () => {
				if (!enabled()) return;
				if (revealed()) reveal();
				else revealSoon();
			},
			//* a tap ends by leaving, so touch keeps it open until focus moves elsewhere
			onPointerLeave: (event: PointerEvent) => {
				if (!enabled() || event.pointerType === "touch") return;
				concealSoon();
			},
			onFocusIn: () => {
				if (enabled()) reveal();
			},
			onFocusOut: (event: FocusEvent) => {
				if (!enabled()) return;
				if (
					event.relatedTarget instanceof Node &&
					options.element()?.contains(event.relatedTarget)
				) {
					return;
				}
				concealSoon();
			},
		},
	};
};
