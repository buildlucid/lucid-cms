import { previewParams } from "@lucidcms/client/contract";
import { withoutPreviewParams } from "@/preview/links";
import {
	createPreviewMessage,
	handlePreviewMessage,
	isPreviewPageMessage,
	isSamePreviewTarget,
	type PreviewBuilderMessages,
	type PreviewEditing,
	type PreviewTarget,
	type PreviewHover,
	type PreviewDragged,
	type PreviewPlace,
	type PreviewMessageHandlers,
	type PreviewMessagePayload,
	type PreviewPageMessages,
	type PreviewScrollState,
} from "@/preview/protocol";

const CAPTURE_TIMEOUT_MS = 150;
const RESTORE_TIMEOUT_MS = 5000;
//* how long a loaded page has to announce its runtime before it's treated as having none
const READY_GRACE_MS = 1500;
//* revisions remembered for matching pages that loaded during a run of edits
const SHOWN_HISTORY = 20;

type PendingCapture = {
	requestId: string;
	resolve: (state: PreviewScrollState | null) => void;
	timeout: number;
};

const reportedStatic = new Set<string>();

/** Tells whoever builds the site, once per page, why a page without Lucid's preview script reloads on every change. */
const reportStatic = (pageKey: string | null) => {
	if (pageKey === null || reportedStatic.has(pageKey)) return;
	reportedStatic.add(pageKey);
	console.info(
		`Lucid preview: ${pageKey} didn't start Lucid's preview script, so it reloads after every change. Call setupPreview() from @lucidcms/client/preview on the page to update it in place.`,
	);
};

/**
 * What the bridge knows about the page in the frame: still loading, running
 * the preview runtime (which may re-render itself on updates), or without one.
 */
type FramePage =
	| { state: "loading" }
	| { state: "ready"; updates: boolean }
	| { state: "static" };

/**
 * Connects preview scrolling, field focus, editing and content updates. Reloads pages without
 * update handlers, and queues updates during navigation and while a field is typed into.
 */
export const createPreviewBridge = (options?: {
	onFocusField?: (target: PreviewTarget) => void;
	/** Runs when the page asks to move a brick or item, after a drag or keyboard move. */
	onMove?: (
		target: PreviewTarget,
		place: PreviewPlace,
		anchor: PreviewTarget,
	) => void;
	/** Runs with what the pointer is over on the page, or null when the page goes or edit mode ends. */
	onHover?: (hover: PreviewHover | null) => void;
	/** Runs when the user clears the page's selection, or makes their own. */
	onDeselect?: () => void;
	/** Runs when the bridge reloads the frame, eg. to show a loading state. */
	onReload?: () => void;
	/** Runs when a link on the page is clicked, which the preview doesn't follow, with where it goes when that's on the previewed site. */
	onNavigationLocked?: (href: string | null) => void;
	/** Runs when the page asks to edit a selected field, with the text its element shows when that's all it holds. */
	onEdit?: (target: PreviewTarget, text: string | null) => void;
	/** Runs with the text typed into a field on the page so far. */
	onInlineInput?: (target: PreviewTarget, value: string) => void;
	/** Runs when typing on the page ends, kept or `cancelled`, including when the page goes. */
	onInlineEnd?: (target: PreviewTarget, cancelled: boolean) => void;
}) => {
	let frame: HTMLIFrameElement | null = null;
	let page: FramePage = { state: "loading" };
	let editing: PreviewEditing | null = null;
	//* a brick or item dragged in the builder's fields, shown on every page the frame loads until it's dropped
	let dragged: PreviewDragged | null = null;
	//* the field being typed into on the page, which updates wait for so a re-render can't move its caret
	let typing: PreviewTarget | null = null;
	//* what the builder asked the page to point out while it loaded
	let highlighted: PreviewTarget | null = null;
	let pendingRevision: number | null = null;
	//* the newest revision shown, and when recent ones were, to tell which one a loading page shows
	let latestRevision = 0;
	let shownAt: Array<{ revision: number; at: number }> = [];
	let readyGrace: number | undefined;
	let requestSequence = 0;
	let pendingCapture: PendingCapture | null = null;
	let pendingRestore: PreviewScrollState | null = null;
	let restoreTimeout: number | undefined;

	/** Resolves the current preview iframe origin. */
	const getFrameOrigin = (): string | null => {
		if (!frame?.isConnected) return null;
		try {
			return new URL(frame.src, window.location.href).origin;
		} catch {
			return null;
		}
	};

	/** Completes and clears the pending scroll capture. */
	const clearCapture = (state: PreviewScrollState | null = null) => {
		if (!pendingCapture) return;
		window.clearTimeout(pendingCapture.timeout);
		pendingCapture.resolve(state);
		pendingCapture = null;
	};

	/** Clears the pending scroll restoration timeout. */
	const clearRestoreTimeout = () => {
		if (restoreTimeout !== undefined) {
			window.clearTimeout(restoreTimeout);
			restoreTimeout = undefined;
		}
	};
	const clearReadyGrace = () => {
		window.clearTimeout(readyGrace);
		readyGrace = undefined;
	};
	/** Creates the page key expected by the destination preview runtime. */
	const getPageKey = (url: string): string | null => {
		try {
			return withoutPreviewParams(new URL(url)).toString();
		} catch {
			return null;
		}
	};
	/** The URL of a page the frame navigated to, with the frame's preview parameters. */
	const getPreviewUrl = (pageKey: string, frameUrl: string): string => {
		try {
			const url = new URL(pageKey);
			const source = new URL(frameUrl);
			if (url.origin !== source.origin) return frameUrl;
			for (const name of Object.values(previewParams)) {
				const value = source.searchParams.get(name);
				if (value !== null) url.searchParams.set(name, value);
			}
			return url.toString();
		} catch {
			return frameUrl;
		}
	};

	/** The frame's current URL when it shares the admin's origin. Other pages only report where they are through their runtime. */
	const getSameOriginLocation = (): string | null => {
		try {
			const href = frame?.contentWindow?.location.href;
			return href && href !== "about:blank" ? href : null;
		} catch {
			return null;
		}
	};

	/** Queues a scroll position for the next preview load. */
	const queueScrollRestore = (
		state: PreviewScrollState | null,
		targetUrl?: string,
	) => {
		clearRestoreTimeout();
		const pageKey = targetUrl ? getPageKey(targetUrl) : null;
		pendingRestore = state && pageKey ? { ...state, pageKey } : state;
		if (state) {
			restoreTimeout = window.setTimeout(() => {
				pendingRestore = null;
				restoreTimeout = undefined;
			}, RESTORE_TIMEOUT_MS);
		}
	};

	/** Requests the current scroll position from the preview iframe. */
	const captureScroll = (): Promise<PreviewScrollState | null> => {
		//* Reuse the pending position during overlapping refreshes to avoid capturing a partially loaded page.
		if (pendingRestore) return Promise.resolve(pendingRestore);

		const frameOrigin = getFrameOrigin();
		const frameWindow = frame?.contentWindow;
		if (!frameOrigin || !frameWindow) return Promise.resolve(null);

		clearCapture();
		requestSequence += 1;
		const requestId = `preview-scroll-${requestSequence}`;
		return new Promise((resolve) => {
			pendingCapture = {
				requestId,
				resolve,
				timeout: window.setTimeout(() => clearCapture(), CAPTURE_TIMEOUT_MS),
			};
			frameWindow.postMessage(
				createPreviewMessage({
					type: "captureScroll",
					requestId,
				}),
				frameOrigin,
			);
		});
	};

	/** Ends typing on the page, keeping what was typed or not, eg. once the page goes. */
	const endTyping = (cancelled: boolean) => {
		const target = typing;
		if (!target) return;
		typing = null;
		options?.onInlineEnd?.(target, cancelled);
	};

	/** Marks the frame as loading a page, so updates wait for it. */
	const expectLoad = () => {
		endTyping(false);
		clearReadyGrace();
		page = { state: "loading" };
		options?.onHover?.(null);
	};

	/** Reloads the page the frame shows, keeping its scroll position when its runtime reports one. */
	const reload = async () => {
		if (!frame) return;
		const hadRuntime = page.state === "ready";
		expectLoad();
		const scrollState = hadRuntime ? await captureScroll() : null;
		if (!frame) return;

		//* the frame's src stays the first page, even after its page navigates
		const url = scrollState
			? getPreviewUrl(scrollState.pageKey, frame.src)
			: (getSameOriginLocation() ?? frame.src);
		queueScrollRestore(scrollState, url);
		options?.onReload?.();
		//* assigning the same URL navigates the frame again
		frame.src = url;
	};

	/** Notes a revision as written and shown, keeping the last few to match loading pages against. */
	const noteShown = (revision: number) => {
		latestRevision = revision;
		shownAt = [
			...shownAt.slice(-(SHOWN_HISTORY - 1)),
			{ revision, at: Date.now() },
		];
	};
	/** The newest revision written before a page started loading, which it shows, or null when there's none known. */
	const revisionLoadedAt = (loadedAt: number) =>
		shownAt.findLast((entry) => entry.at <= loadedAt)?.revision ?? null;

	/** Shows a revision: pages that re-render themselves get an update, others reload, and loading pages are waited for. */
	const show = (revision: number) => {
		noteShown(revision);
		if (page.state === "loading" || typing) {
			pendingRevision = revision;
			return;
		}
		if (page.state === "ready" && page.updates && getFrameOrigin()) {
			postToRuntime({ type: "update", revision });
			return;
		}
		void reload();
	};

	/** Sends a message to a page whose runtime has announced itself, dropping it otherwise. */
	const postToRuntime = (
		message: PreviewMessagePayload<PreviewBuilderMessages>,
	) => {
		const frameOrigin = getFrameOrigin();
		const frameWindow = frame?.contentWindow;
		if (page.state !== "ready" || !frameOrigin || !frameWindow) return;
		frameWindow.postMessage(createPreviewMessage(message), frameOrigin);
	};

	/** Shows the revision that arrived while the page loaded. */
	const showPending = () => {
		if (pendingRevision === null) return;
		const revision = pendingRevision;
		pendingRevision = null;
		show(revision);
	};

	/** Gives a loaded page a moment to announce its runtime before treating it as having none. */
	const onFrameLoad = () => {
		if (page.state !== "loading") return;
		clearReadyGrace();
		readyGrace = window.setTimeout(() => {
			readyGrace = undefined;
			if (page.state !== "loading") return;
			page = { state: "static" };
			if (frame) reportStatic(getPageKey(frame.src));
			showPending();
		}, READY_GRACE_MS);
	};

	const messageHandlers: PreviewMessageHandlers<PreviewPageMessages> = {
		ready: (message) => {
			clearReadyGrace();
			//* a page that just loaded, by navigating or from the back/forward cache, shows what was written before it started loading. Later readies only say whether it re-renders itself.
			const loaded = page.state !== "ready";
			page = { state: "ready", updates: message.updates };
			postToRuntime({ type: "connect" });
			if (pendingRestore) {
				postToRuntime({ type: "restoreScroll", state: pendingRestore });
				queueScrollRestore(null);
			}
			//* each page starts without edit mode
			if (editing) postToRuntime({ type: "editMode", editing });
			if (dragged) postToRuntime({ type: "dragged", ...dragged });
			if (highlighted)
				postToRuntime({ type: "highlight", target: highlighted });
			highlighted = null;
			//* pages that loaded before the latest revision are brought up to date
			if (
				loaded &&
				pendingRevision === null &&
				revisionLoadedAt(message.loadedAt) !== latestRevision
			) {
				show(latestRevision);
			} else {
				showPending();
			}
		},
		unload: () => expectLoad(),
		scrollState: (message) => {
			if (message.requestId === pendingCapture?.requestId) {
				clearCapture(message.state);
			}
		},
		focus: (message) => {
			options?.onDeselect?.();
			options?.onFocusField?.(message.target);
		},
		deselect: () => options?.onDeselect?.(),
		move: (message) =>
			options?.onMove?.(message.target, message.place, message.anchor),
		hover: (message) => {
			if (editing) options?.onHover?.(message.hover);
		},
		navigationLocked: (message) => {
			//* only links within the previewed site can go to one of its documents
			const href =
				message.href && new URL(message.href).origin === getFrameOrigin()
					? message.href
					: null;
			options?.onNavigationLocked?.(href);
		},
		edit: (message) => {
			if (editing?.editable && !typing) {
				options?.onEdit?.(message.target, message.text);
			}
		},
		inlineInput: (message) => {
			if (typing && isSamePreviewTarget(typing, message.target)) {
				options?.onInlineInput?.(message.target, message.value);
			}
		},
		inlineEnd: (message) => {
			if (!typing || !isSamePreviewTarget(typing, message.target)) return;
			endTyping(message.cancelled);
			showPending();
		},
	};

	/** Handles validated messages from the active preview iframe. */
	const onMessage = (event: MessageEvent<unknown>) => {
		const frameOrigin = getFrameOrigin();
		if (
			frameOrigin &&
			event.source === frame?.contentWindow &&
			event.origin === frameOrigin &&
			isPreviewPageMessage(event.data)
		) {
			handlePreviewMessage(event.data, messageHandlers);
		}
	};

	window.addEventListener("message", onMessage);

	return {
		/** Sets the iframe used by the bridge. */
		setFrame: (element: HTMLIFrameElement) => {
			frame?.removeEventListener("load", onFrameLoad);
			frame = element;
			frame.addEventListener("load", onFrameLoad);
		},
		captureScroll,
		queueScrollRestore,
		show,
		/** Turns edit mode on for a document, or off with null, now and on every page the frame loads. */
		setEditing: (next: PreviewEditing | null) => {
			editing = next;
			postToRuntime({ type: "editMode", editing });
			if (!next) options?.onHover?.(null);
		},
		/** Points out a field, item or brick on the page, once its runtime is ready. */
		highlight: (target: PreviewTarget) => {
			if (page.state === "ready") postToRuntime({ type: "highlight", target });
			else highlighted = target;
		},
		/** Shows a fields-column drag in the preview; null ends it. */
		setDragged: (next: PreviewDragged | null) => {
			dragged = next;
			postToRuntime({
				type: "dragged",
				target: next?.target ?? null,
				landing: next?.landing ?? null,
			});
		},
		/** Tells the page the builder is zooming it out or back in, so it keeps what's dragged or selected in place. */
		setZooming: (zooming: boolean) => {
			postToRuntime({ type: "zoom", zooming });
		},
		/** Asks the page to edit its selected field, as clicking it again would. */
		editSelected: (target: PreviewTarget) => {
			postToRuntime({ type: "editSelected", target });
		},
		/**
		 * Starts typing a field's text where the page shows it, holding updates until it ends.
		 * Returns false when the page's runtime isn't there to do it.
		 */
		startInline: (
			target: PreviewTarget,
			props: { multiline: boolean; clear: boolean },
		) => {
			if (page.state !== "ready" || typing) return false;
			typing = target;
			//* keys go to the page, eg. when typing was started from the builder's controls
			frame?.focus({ preventScroll: true });
			postToRuntime({
				type: "inlineStart",
				target,
				...props,
			});
			return true;
		},
		/** Drags a brick or item to a point in the page's viewport, which shows where it would land. */
		drag: (target: PreviewTarget, point: { x: number; y: number }) => {
			postToRuntime({ type: "drag", target, ...point });
		},
		/** Ends a drag, moving what was dragged when `drop` is true. */
		endDrag: (drop: boolean) => {
			postToRuntime({ type: "dragEnd", drop });
		},
		/** Prepares for the frame loading a new preview URL at `revision`, dropping updates meant for the old one. */
		expectLoad: (revision: number) => {
			pendingRevision = null;
			shownAt = [];
			noteShown(revision);
			expectLoad();
		},
		/** Removes listeners, timeouts, and iframe references. */
		cleanup: () => {
			endTyping(false);
			window.removeEventListener("message", onMessage);
			frame?.removeEventListener("load", onFrameLoad);
			clearCapture();
			clearReadyGrace();
			queueScrollRestore(null);
			pendingRevision = null;
			frame = null;
		},
	};
};

/** The builder's side of the preview protocol, for one frame. */
export type PreviewBridge = ReturnType<typeof createPreviewBridge>;
