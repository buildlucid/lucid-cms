import { getPreviewPageKey } from "./context.js";
import {
	isPreviewBridgeMessage,
	type PreviewScrollState,
	previewBridgeProtocol,
} from "./messages.js";

const createMessage = <TMessage extends object>(message: TMessage) => ({
	scope: previewBridgeProtocol.scope,
	version: previewBridgeProtocol.version,
	...message,
});

const installScrollRestoration = (targetWindow: Window) => {
	let frameId: number | undefined;
	let pendingLoad: (() => void) | undefined;

	const cancel = () => {
		if (frameId !== undefined) targetWindow.cancelAnimationFrame(frameId);
		if (pendingLoad) targetWindow.removeEventListener("load", pendingLoad);
		frameId = undefined;
		pendingLoad = undefined;
	};

	const restore = (state: PreviewScrollState) => {
		cancel();
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

	return { cancel, restore };
};

/** Installs the child side of Lucid's builder preview bridge. */
export const installPreviewBridge = (targetWindow: Window): (() => void) => {
	const scrollRestoration = installScrollRestoration(targetWindow);

	const onMessage = (event: MessageEvent<unknown>) => {
		if (
			event.source !== targetWindow.parent ||
			!isPreviewBridgeMessage(event.data)
		) {
			return;
		}

		if (event.data.type === previewBridgeProtocol.messages.captureScroll) {
			const state: PreviewScrollState = {
				pageKey: getPreviewPageKey(targetWindow),
				x: targetWindow.scrollX,
				y: targetWindow.scrollY,
			};
			targetWindow.parent.postMessage(
				createMessage({
					type: previewBridgeProtocol.messages.scrollState,
					requestId: event.data.requestId,
					state,
				}),
				event.origin,
			);
			return;
		}

		if (
			event.data.type === previewBridgeProtocol.messages.restoreScroll &&
			event.data.state.pageKey === getPreviewPageKey(targetWindow)
		) {
			scrollRestoration.restore(event.data.state);
		}
	};

	targetWindow.addEventListener("message", onMessage);
	targetWindow.parent.postMessage(
		createMessage({ type: previewBridgeProtocol.messages.ready }),
		"*",
	);

	return () => {
		targetWindow.removeEventListener("message", onMessage);
		scrollRestoration.cancel();
	};
};
