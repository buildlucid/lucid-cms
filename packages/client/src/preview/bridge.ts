import {
	createPreviewMessage,
	isPreviewParentMessage,
	type PreviewScrollState,
	previewProtocol,
} from "@lucidcms/preview-protocol";
import { getPreviewPageKey } from "./context.js";
import { installPreviewFieldInteraction } from "./field-target.js";
import type { PreviewUpdateHandler } from "./types.js";
import { createPreviewUpdates } from "./updates.js";

/** Restores a scroll position once the page has loaded, retrying while late content grows the page. */
const installScrollRestoration = (targetWindow: Window) => {
	let frameId: number | undefined;
	let pendingLoad: (() => void) | undefined;
	let target: PreviewScrollState | null = null;

	const cancel = () => {
		if (frameId !== undefined) targetWindow.cancelAnimationFrame(frameId);
		if (pendingLoad) targetWindow.removeEventListener("load", pendingLoad);
		frameId = undefined;
		pendingLoad = undefined;
		target = null;
	};

	const restore = (state: PreviewScrollState) => {
		cancel();
		target = state;
		const start = () => {
			pendingLoad = undefined;
			let attempts = 0;
			const apply = () => {
				targetWindow.scrollTo(state.x, state.y);
				attempts += 1;
				if (
					attempts < 12 &&
					(Math.abs(targetWindow.scrollX - state.x) > 1 ||
						Math.abs(targetWindow.scrollY - state.y) > 1)
				) {
					frameId = targetWindow.requestAnimationFrame(apply);
				} else {
					frameId = undefined;
					target = null;
				}
			};
			frameId = targetWindow.requestAnimationFrame(apply);
		};

		if (targetWindow.document.readyState === "complete") {
			start();
		} else {
			pendingLoad = start;
			targetWindow.addEventListener("load", start, { once: true });
		}
	};

	return {
		cancel,
		restore,
		/** The position still being restored, so a capture mid-restore doesn't report the top of the page. */
		pending: () => target,
	};
};

/**
 * Installs the page-side bridge and update handlers. Reports handler availability and navigation
 * so the builder can reload or defer updates.
 */
export const installPreviewBridge = (
	targetWindow: Window,
	handlers: ReadonlySet<PreviewUpdateHandler>,
) => {
	const scrollRestoration = installScrollRestoration(targetWindow);
	const updates = createPreviewUpdates(targetWindow, handlers);
	let parentOrigin: string | null = null;
	let announcedUpdates = handlers.size > 0;
	let unloaded = false;

	const announce = () => {
		targetWindow.parent.postMessage(
			createPreviewMessage({
				type: previewProtocol.messages.ready,
				updates: announcedUpdates,
			}),
			parentOrigin ?? "*",
		);
	};
	const sendUnload = () => {
		if (unloaded || parentOrigin === null) return;
		unloaded = true;
		targetWindow.parent.postMessage(
			createPreviewMessage({ type: previewProtocol.messages.unload }),
			parentOrigin,
		);
	};
	//* pages restored from the back/forward cache announce themselves again
	const onPageShow = (event: PageTransitionEvent) => {
		if (!event.persisted || !unloaded) return;
		unloaded = false;
		announce();
	};

	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== targetWindow.parent ||
			!isPreviewParentMessage(event.data)
		) {
			return;
		}

		if (event.data.type === previewProtocol.messages.connect) {
			if (parentOrigin === null) parentOrigin = event.origin;
			return;
		}

		if (event.origin !== parentOrigin) return;

		if (event.data.type === previewProtocol.messages.captureScroll) {
			const pending = scrollRestoration.pending();
			const state: PreviewScrollState = {
				pageKey: getPreviewPageKey(targetWindow),
				x: pending?.x ?? targetWindow.scrollX,
				y: pending?.y ?? targetWindow.scrollY,
			};
			targetWindow.parent.postMessage(
				createPreviewMessage({
					type: previewProtocol.messages.scrollState,
					requestId: event.data.requestId,
					state,
				}),
				event.origin,
			);
			return;
		}

		if (
			event.data.type === previewProtocol.messages.restoreScroll &&
			event.data.state.pageKey === getPreviewPageKey(targetWindow)
		) {
			scrollRestoration.restore(event.data.state);
			return;
		}

		if (event.data.type === previewProtocol.messages.update) {
			updates.receive(event.data.revision);
		}
	};
	const cleanupFieldInteraction = installPreviewFieldInteraction({
		targetWindow,
		isConnected: () => parentOrigin !== null,
		sendTarget: (target) => {
			if (parentOrigin === null) return false;
			targetWindow.parent.postMessage(
				createPreviewMessage({
					type: previewProtocol.messages.focusField,
					target,
				}),
				parentOrigin,
			);
			return true;
		},
	});

	targetWindow.addEventListener("message", onMessage);
	targetWindow.addEventListener("pagehide", sendUnload);
	targetWindow.addEventListener("pageshow", onPageShow);
	announce();

	return {
		/** Announces again when handlers were added to an empty set or it emptied. */
		handlersChanged: () => {
			const hasHandlers = handlers.size > 0;
			if (hasHandlers === announcedUpdates) return;
			announcedUpdates = hasHandlers;
			announce();
		},
		cleanup: () => {
			//* the page stays without its runtime, so the builder reloads it for updates instead
			if (!unloaded && parentOrigin !== null && announcedUpdates) {
				announcedUpdates = false;
				announce();
			}
			targetWindow.removeEventListener("message", onMessage);
			targetWindow.removeEventListener("pagehide", sendUnload);
			targetWindow.removeEventListener("pageshow", onPageShow);
			cleanupFieldInteraction();
			scrollRestoration.cancel();
			updates.cancel();
			parentOrigin = null;
		},
	};
};
