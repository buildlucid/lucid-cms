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

export interface UseChatScrollOptions {
	/** Whether older messages can be loaded above. */
	hasEarlier: Accessor<boolean>;
	loadEarlier: () => Promise<unknown>;
}

/**
 * Scrolling for a chat that grows at the bottom and pages in history at the top.
 * While the reader is at the end, new output keeps them there; scrolling up
 * stops that until they return to the end. Nearing the top loads older messages
 * without moving what is on screen.
 *
 * Attach `setViewport` to the scrolling element, `setContent` to the element
 * inside it that grows, and `setSentinel` to an element at the top of the content.
 * Messages must carry a `data-chat-message` attribute so the position can be
 * kept while older ones load.
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

	// ----------------------------------------
	// Functions
	const distanceFromEnd = (element: HTMLElement) =>
		element.scrollHeight - element.clientHeight - element.scrollTop;
	const firstMessage = () =>
		content()?.querySelector<HTMLElement>("[data-chat-message]") ?? undefined;

	/** Jumps to the latest output and follows it again. */
	const scrollToEnd = (behavior: ScrollBehavior = "instant") => {
		setFollowing(true);
		const element = viewport();
		element?.scrollTo({ top: element.scrollHeight, behavior });
	};
	const onScroll = () => {
		const element = viewport();
		if (!element) return;
		const top = element.scrollTop;
		const distance = distanceFromEnd(element);
		//* only scrolling up leaves the end; shrinking content can lower scrollTop without the reader moving
		if (distance <= endThreshold) setFollowing(true);
		else if (top < lastTop) setFollowing(false);
		lastTop = top;
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
		onCleanup(() => {
			cancelAnimationFrame(frame);
			element.removeEventListener("scroll", onScroll);
		});
	});
	//* new output, a finished widget or a smaller viewport keeps the end in view while following
	createEffect(() => {
		const element = content();
		const scroller = viewport();
		if (!element || !scroller) return;
		const observer = new ResizeObserver(() => {
			if (following()) scroller.scrollTop = scroller.scrollHeight;
		});
		observer.observe(element);
		observer.observe(scroller);
		onCleanup(() => observer.disconnect());
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
		setViewport,
		setContent,
		setSentinel,
		/** True while new output keeps the end in view. */
		following,
		loadingEarlier,
		scrollToEnd,
	};
};

export default useChatScroll;
