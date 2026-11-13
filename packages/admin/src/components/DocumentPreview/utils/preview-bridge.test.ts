import { afterEach, describe, expect, test, vi } from "vitest";
import { createPreviewMessage } from "@/preview/protocol";
import { createPreviewBridge } from "./preview-bridge";

const origin = "https://site.example";
const cleanups: Array<() => void> = [];

const setup = (options?: Parameters<typeof createPreviewBridge>[0]) => {
	//* the test environment doesn't load frames, so this one stands in for an attached frame and its window
	const posted = vi.fn();
	const frameWindow = { postMessage: posted };
	const frame = document.createElement("iframe");
	Object.defineProperties(frame, {
		src: { value: `${origin}/page` },
		contentWindow: { value: frameWindow },
		isConnected: { value: true },
	});
	const bridge = createPreviewBridge(options);
	bridge.setFrame(frame);
	cleanups.push(bridge.cleanup);
	const receive = (message: Parameters<typeof createPreviewMessage>[0]) =>
		window.dispatchEvent(
			new MessageEvent("message", {
				source: frameWindow as unknown as Window,
				origin,
				data: createPreviewMessage(message),
			}),
		);
	return { bridge, posted, receive };
};

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("preview bridge", () => {
	test("brings pages that loaded before the latest revision up to date", () => {
		vi.useFakeTimers({ now: 1000 });
		const { bridge, posted, receive } = setup();
		const ready = (loadedAt: number) =>
			receive({ type: "ready", updates: true, loadedAt });
		const update = createPreviewMessage({ type: "update", revision: 2 });

		bridge.expectLoad(1);
		ready(1001);
		vi.setSystemTime(2000);
		bridge.show(2);
		expect(posted).toHaveBeenLastCalledWith(update, origin);
		posted.mockClear();

		//* a page that started loading before revision 2 was written, eg. by navigating or from the back/forward cache
		receive({ type: "unload" });
		ready(1500);
		expect(posted).toHaveBeenCalledWith(update, origin);
		posted.mockClear();

		receive({ type: "unload" });
		ready(2500);
		expect(posted).not.toHaveBeenCalledWith(update, origin);
		vi.useRealTimers();
	});

	test("holds a highlight asked for while the page loads until it's ready", () => {
		const { bridge, posted, receive } = setup();
		const target = { collectionKey: "page", documentId: 1, path: ["title"] };

		bridge.expectLoad(0);
		bridge.highlight(target);
		expect(posted).not.toHaveBeenCalled();
		receive({ type: "ready", updates: true, loadedAt: Date.now() });
		expect(posted).toHaveBeenCalledWith(
			createPreviewMessage({ type: "highlight", target }),
			origin,
		);
	});

	test("reads the page's markup once it's running, and says when it changes", async () => {
		const onPageChange = vi.fn();
		const { bridge, posted, receive } = setup({ onPageChange });

		//* asked while the page loads, it's sent once the page is ready
		bridge.expectLoad(0);
		const markup = bridge.captureMarkup();
		expect(posted).not.toHaveBeenCalled();
		receive({ type: "ready", updates: true, loadedAt: Date.now() });
		expect(onPageChange).toHaveBeenCalledTimes(1);
		const request = posted.mock.calls.find(
			([message]) => message.type === "captureMarkup",
		)?.[0];
		expect(request).toMatchObject({ type: "captureMarkup" });
		receive({ type: "markup", requestId: "other", html: "<html></html>" });
		receive({
			type: "markup",
			requestId: request.requestId,
			html: "<html><title>Home</title></html>",
		});
		expect(await markup).toBe("<html><title>Home</title></html>");

		receive({ type: "rendered" });
		expect(onPageChange).toHaveBeenCalledTimes(2);
	});
});
