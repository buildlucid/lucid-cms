import {
	createPreviewMessage,
	isPreviewChildMessage,
	type PreviewFieldTarget,
	type PreviewScrollState,
	previewProtocol,
} from "@lucidcms/preview-protocol";

const CAPTURE_TIMEOUT_MS = 150;
const RESTORE_TIMEOUT_MS = 5000;
//* how long a loaded page has to announce its runtime before it's treated as having none
const READY_GRACE_MS = 1500;
export const previewQueryParam = "preview";
export const previewContextQueryParam = "previewContext";

type PendingCapture = {
	requestId: string;
	resolve: (state: PreviewScrollState | null) => void;
	timeout: number;
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
 * Connects preview scrolling, field focus and content updates. Reloads pages without update
 * handlers and queues updates during navigation.
 */
export const createPreviewBridge = (options?: {
	onFocusField?: (target: PreviewFieldTarget) => void;
	/** Runs when the bridge reloads the frame, eg. to show a loading state. */
	onReload?: () => void;
}) => {
	let frame: HTMLIFrameElement | null = null;
	let page: FramePage = { state: "loading" };
	let pendingRevision: number | null = null;
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
			const pageUrl = new URL(url);
			pageUrl.searchParams.delete(previewQueryParam);
			pageUrl.searchParams.delete(previewContextQueryParam);
			return pageUrl.toString();
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
			for (const name of [previewQueryParam, previewContextQueryParam]) {
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
					type: previewProtocol.messages.captureScroll,
					requestId,
				}),
				frameOrigin,
			);
		});
	};

	/** Marks the frame as loading a page, so updates wait for it. */
	const expectLoad = () => {
		clearReadyGrace();
		page = { state: "loading" };
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

	/** Shows a revision: pages that re-render themselves get an update, others reload, and loading pages are waited for. */
	const show = (revision: number) => {
		if (page.state === "loading") {
			pendingRevision = revision;
			return;
		}

		const frameOrigin = getFrameOrigin();
		const frameWindow = frame?.contentWindow;
		if (page.state === "ready" && page.updates && frameOrigin && frameWindow) {
			frameWindow.postMessage(
				createPreviewMessage({
					type: previewProtocol.messages.update,
					revision,
				}),
				frameOrigin,
			);
			return;
		}
		void reload();
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
			showPending();
		}, READY_GRACE_MS);
	};

	/** Handles validated messages from the active preview iframe. */
	const onMessage = (event: MessageEvent<unknown>) => {
		const frameOrigin = getFrameOrigin();
		if (
			!frameOrigin ||
			event.source !== frame?.contentWindow ||
			event.origin !== frameOrigin ||
			!isPreviewChildMessage(event.data)
		) {
			return;
		}

		if (
			event.data.type === previewProtocol.messages.scrollState &&
			event.data.requestId === pendingCapture?.requestId
		) {
			clearCapture(event.data.state);
			return;
		}

		if (event.data.type === previewProtocol.messages.focusField) {
			options?.onFocusField?.(event.data.target);
			return;
		}

		if (event.data.type === previewProtocol.messages.unload) {
			expectLoad();
			return;
		}

		if (event.data.type === previewProtocol.messages.ready) {
			clearReadyGrace();
			page = { state: "ready", updates: event.data.updates };
			frame?.contentWindow?.postMessage(
				createPreviewMessage({ type: previewProtocol.messages.connect }),
				event.origin,
			);
			if (pendingRestore) {
				frame?.contentWindow?.postMessage(
					createPreviewMessage({
						type: previewProtocol.messages.restoreScroll,
						state: pendingRestore,
					}),
					event.origin,
				);
				queueScrollRestore(null);
			}
			showPending();
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
		/** Prepares for the frame loading a new preview URL, dropping updates meant for the old one. */
		expectLoad: () => {
			pendingRevision = null;
			expectLoad();
		},
		/** Removes listeners, timeouts, and iframe references. */
		cleanup: () => {
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
