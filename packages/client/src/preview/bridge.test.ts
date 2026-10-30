// @vitest-environment happy-dom

import {
	createPreviewMessage,
	encodePreviewFieldTarget,
	previewProtocol,
} from "@lucidcms/preview-protocol";
import { afterEach, describe, expect, test, vi } from "vitest";
import { installPreviewBridge } from "./bridge.js";
import { getPreviewPageKey } from "./context.js";

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe("client preview bridge handshake", () => {
	test.each([
		["same-origin", window.location.origin],
		["cross-origin", "https://admin.example"],
	])(
		"sends targets only after connecting to the exact %s parent",
		(_configuration, parentOrigin) => {
			const postMessage = vi
				.spyOn(window.parent, "postMessage")
				.mockImplementation(() => undefined);
			const cleanup = installPreviewBridge(window);
			const button = document.createElement("button");
			button.setAttribute(
				"data-lucid-preview-field",
				encodePreviewFieldTarget({
					collectionKey: "page",
					documentId: 1,
					path: ["title"],
				}) ?? "",
			);
			document.body.append(button);

			const beforeConnect = new MouseEvent("click", {
				altKey: true,
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			button.dispatchEvent(beforeConnect);
			expect(beforeConnect.defaultPrevented).toBe(false);

			window.dispatchEvent(
				new MessageEvent("message", {
					source: window.parent,
					origin: parentOrigin,
					data: createPreviewMessage({
						type: previewProtocol.messages.connect,
					}),
				}),
			);
			const connectedClick = new MouseEvent("click", {
				altKey: true,
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			button.dispatchEvent(connectedClick);

			expect(connectedClick.defaultPrevented).toBe(true);
			expect(postMessage).toHaveBeenCalledWith(
				createPreviewMessage({
					type: previewProtocol.messages.focusField,
					target: { collectionKey: "page", documentId: 1, path: ["title"] },
				}),
				parentOrigin,
			);

			cleanup();
			postMessage.mockClear();
			button.dispatchEvent(
				new MouseEvent("click", {
					altKey: true,
					bubbles: true,
					cancelable: true,
					button: 0,
				}),
			);
			expect(postMessage).not.toHaveBeenCalled();
		},
	);
});

describe("client preview bridge scroll", () => {
	test("reports a restore still in progress instead of the current position", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
			() => undefined,
		);
		const postMessage = vi
			.spyOn(window.parent, "postMessage")
			.mockImplementation(() => undefined);
		const cleanup = installPreviewBridge(window);
		const parentOrigin = "https://admin.example";
		const state = { pageKey: getPreviewPageKey(window), x: 0, y: 800 };
		for (const data of [
			createPreviewMessage({ type: previewProtocol.messages.connect }),
			createPreviewMessage({
				type: previewProtocol.messages.restoreScroll,
				state,
			}),
			createPreviewMessage({
				type: previewProtocol.messages.captureScroll,
				requestId: "capture-1",
			}),
		]) {
			window.dispatchEvent(
				new MessageEvent("message", {
					source: window.parent,
					origin: parentOrigin,
					data,
				}),
			);
		}

		expect(postMessage).toHaveBeenLastCalledWith(
			createPreviewMessage({
				type: previewProtocol.messages.scrollState,
				requestId: "capture-1",
				state,
			}),
			parentOrigin,
		);
		cleanup();
	});
});
