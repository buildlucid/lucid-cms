import {
	createPreviewMessage,
	isPreviewChildMessage,
	type PreviewFieldTarget,
	type PreviewScrollState,
	previewProtocol,
} from "@lucidcms/preview-protocol";

const CAPTURE_TIMEOUT_MS = 150;
const RESTORE_TIMEOUT_MS = 5000;
const previewQueryParam = "preview";

type PendingCapture = {
	requestId: string;
	resolve: (state: PreviewScrollState | null) => void;
	timeout: number;
};

/** Creates the admin-side bridge for preview scroll restoration. */
export const createPreviewBridge = (options?: {
	onFocusField?: (target: PreviewFieldTarget) => void;
}) => {
	let frame: HTMLIFrameElement | null = null;
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
	/** Creates the page key expected by the destination preview runtime. */
	const getPageKey = (url: string): string | null => {
		try {
			const pageUrl = new URL(url);
			pageUrl.searchParams.delete(previewQueryParam);
			return pageUrl.toString();
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

		if (event.data.type === previewProtocol.messages.ready) {
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
		}
	};

	window.addEventListener("message", onMessage);

	return {
		/** Sets the iframe used by the bridge. */
		setFrame: (element: HTMLIFrameElement) => {
			frame = element;
		},
		/** Requests the current scroll position from the preview iframe. */
		captureScroll: (): Promise<PreviewScrollState | null> => {
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
		},
		queueScrollRestore,
		/** Removes listeners, timeouts, and iframe references. */
		cleanup: () => {
			window.removeEventListener("message", onMessage);
			clearCapture();
			queueScrollRestore(null);
			frame = null;
		},
	};
};
