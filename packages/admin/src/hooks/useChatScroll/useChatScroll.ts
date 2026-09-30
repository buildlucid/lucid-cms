import {
	type Accessor,
	createEffect,
	createSignal,
	on,
	onCleanup,
} from "solid-js";

//* how close to the end still counts as reading the latest output
const endThreshold = 32;
//* how far ahead of the top older messages start loading
const earlierMargin = "600px";
//* frames to wait for older messages to render before giving up on keeping the position
const settleFrames = 10;
const intentWindow = 600;
const clampWindow = 50;
const messageOffset = 24;
const scrollKeys = new Set([
	"ArrowUp",
	"ArrowDown",
	"PageUp",
	"PageDown",
	"Home",
	"End",
	" ",
]);

export interface UseChatScrollOptions {
	/** Whether older messages can be loaded above. */
	hasEarlier: Accessor<boolean>;
	loadEarlier: () => Promise<unknown>;
}

/**
 * Scrolling for a chat that grows at the bottom and pages in history at the top.
 * While the reader is at the end, new output keeps them there; scrolling up
 * stops that until they return to the end. The browser clamping the position
 * while content re-renders never does. Nearing the top loads older messages
 * without moving what is on screen.
 *
 * Attach `setViewport` to the scrolling element, `setContent` to the element
 * inside it that grows, and `setSentinel` to an element at the top of the content.
 * Messages must carry their id in a `data-chat-message` attribute, so the
 * position can be kept while older ones load and a message can be scrolled to.
 */
export const useChatScroll = (options: UseChatScrollOptions) => {
	// ----------------------------------------
	// State & Hooks
	const [viewport, setViewport] = createSignal<HTMLElement>();
	const [content, setContent] = createSignal<HTMLElement>();
	const [sentinel, setSentinel] = createSignal<HTMLElement>();
	const [following, setFollowing] = createSignal(true);
	const [nearTop, setNearTop] = createSignal(false);
	const [loadingEarlier, setLoadingEarlier] = createSignal(false);
	//* a load that rendered nothing waits for the reader to leave the top before trying again
	const [stalled, setStalled] = createSignal(false);
	let lastTop = 0;
	let intentAt = 0;
	let dragging = false;
	let changedAt = 0;

	// ----------------------------------------
	// Functions
	const distanceFromEnd = (element: HTMLElement) =>
		element.scrollHeight - element.clientHeight - element.scrollTop;
	//* the first one laid out, as one with nothing to show yet is hidden and has no position
	const firstMessage = () =>
		Array.from(
			content()?.querySelectorAll<HTMLElement>("[data-chat-message]") ?? [],
		).find((message) => message.offsetParent !== null);

	const reading = () => dragging || performance.now() - intentAt < intentWindow;
	const onIntent = () => {
		intentAt = performance.now();
	};
	/** Jumps to the latest output and follows it again. */
	const scrollToEnd = (behavior: ScrollBehavior = "instant") => {
		setFollowing(true);
		const element = viewport();
		element?.scrollTo({ top: element.scrollHeight, behavior });
	};
	const scrollToMessage = (id: string) => {
		const element = viewport();
		const target = content()?.querySelector<HTMLElement>(
			`[data-chat-message="${CSS.escape(id)}"]`,
		);
		if (!element || !target) return;
		const end = element.scrollHeight - element.clientHeight;
		const top = Math.min(
			end,
			element.scrollTop +
				target.getBoundingClientRect().top -
				element.getBoundingClientRect().top -
				messageOffset,
		);
		//* a message that lands at the end, such as in a chat too short to scroll, keeps following, as no scroll would turn it back on
		if (end - top > endThreshold) {
			setFollowing(false);
			//* the jump is the reader's, so its first steps near the end don't follow again
			onIntent();
		}
		element.scrollTo({ top, behavior: "smooth" });
	};
	const onKeyDown = (event: KeyboardEvent) => {
		const target = event.target;
		const typing =
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				target.closest("input, textarea, select") !== null);
		if (event.key === "Tab" || (scrollKeys.has(event.key) && !typing)) {
			onIntent();
		}
	};
	const onPointerDown = (event: PointerEvent) => {
		if (event.target === event.currentTarget) dragging = true;
	};
	const onPointerUp = () => {
		dragging = false;
	};
	const onScroll = () => {
		const element = viewport();
		if (!element) return;
		const top = element.scrollTop;
		const distance = distanceFromEnd(element);
		const up = top < lastTop;
		if (up && reading()) setFollowing(false);
		else if (distance <= endThreshold) setFollowing(true);
		else if (up && performance.now() - changedAt < clampWindow) {
			//* content that shrank and grew back within a frame clamps the position without resizing, so return to the end
			if (following()) element.scrollTop = element.scrollHeight;
		} else if (up) setFollowing(false);
		lastTop = element.scrollTop;
	};
	/**
	 * Loads older messages and keeps the first message where it was. They render
	 * some time after the request settles, so each frame checks for them and
	 * corrects the position before it paints.
	 */
	const loadEarlier = async () => {
		const element = viewport();
		const anchor = firstMessage();
		const top = anchor?.getBoundingClientRect().top;
		setLoadingEarlier(true);
		try {
			await options.loadEarlier();
		} finally {
			let frames = 0;
			const settle = () => {
				const moved = firstMessage() !== anchor;
				if (!moved && frames++ < settleFrames) {
					requestAnimationFrame(settle);
					return;
				}
				if (moved && element && anchor && top !== undefined && !following()) {
					element.scrollTop += anchor.getBoundingClientRect().top - top;
					lastTop = element.scrollTop;
				}
				setStalled(!moved);
				setLoadingEarlier(false);
			};
			requestAnimationFrame(settle);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const element = viewport();
		if (!element) return;
		//* a chat opens on its latest message, including once late content settles in the first frame
		setFollowing(true);
		element.scrollTop = element.scrollHeight;
		lastTop = element.scrollTop;
		const frame = requestAnimationFrame(() => {
			if (following()) element.scrollTop = element.scrollHeight;
		});
		element.addEventListener("scroll", onScroll, { passive: true });
		element.addEventListener("wheel", onIntent, { passive: true });
		element.addEventListener("touchmove", onIntent, { passive: true });
		window.addEventListener("keydown", onKeyDown);
		element.addEventListener("pointerdown", onPointerDown);
		window.addEventListener("pointerup", onPointerUp);
		onCleanup(() => {
			cancelAnimationFrame(frame);
			element.removeEventListener("scroll", onScroll);
			element.removeEventListener("wheel", onIntent);
			element.removeEventListener("touchmove", onIntent);
			window.removeEventListener("keydown", onKeyDown);
			element.removeEventListener("pointerdown", onPointerDown);
			window.removeEventListener("pointerup", onPointerUp);
		});
	});
	//* new output, a finished widget or a smaller viewport keeps the end in view while following
	createEffect(() => {
		const element = content();
		const scroller = viewport();
		if (!element || !scroller) return;
		const observer = new ResizeObserver(() => {
			if (following()) scroller.scrollTop = scroller.scrollHeight;
			//* content that shrinks until it no longer scrolls leaves the reader at the end without a scroll event
			else if (distanceFromEnd(scroller) <= endThreshold) setFollowing(true);
		});
		const changes = new MutationObserver(() => {
			changedAt = performance.now();
		});
		observer.observe(element);
		observer.observe(scroller);
		changes.observe(element, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		onCleanup(() => {
			observer.disconnect();
			changes.disconnect();
		});
	});
	createEffect(() => {
		const element = sentinel();
		const root = viewport();
		if (!element || !root) return;
		const observer = new IntersectionObserver(
			([entry]) => setNearTop(entry?.isIntersecting ?? false),
			{ root, rootMargin: `${earlierMargin} 0px 0px 0px` },
		);
		observer.observe(element);
		onCleanup(() => {
			observer.disconnect();
			setNearTop(false);
		});
	});
	//* keeps loading while the top stays in reach, such as when a page of history is short
	createEffect(
		on(
			[nearTop, options.hasEarlier, loadingEarlier, stalled],
			([near, more, busy, stuck]) => {
				if (!near) setStalled(false);
				else if (more && !busy && !stuck) void loadEarlier();
			},
		),
	);

	// ----------------------------------------
	// Return
	return {
		viewport,
		setViewport,
		setContent,
		setSentinel,
		/** True while new output keeps the end in view. */
		following,
		loadingEarlier,
		scrollToEnd,
		scrollToMessage,
	};
};

export default useChatScroll;
