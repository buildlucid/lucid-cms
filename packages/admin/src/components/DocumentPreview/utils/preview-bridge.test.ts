import { afterEach, describe, expect, test, vi } from "vitest";
import { createPreviewMessage, previewProtocol } from "@/preview/protocol";
import { createPreviewBridge } from "./preview-bridge";

const origin = "https://site.example";
const cleanups: Array<() => void> = [];

const setup = () => {
	//* the test environment doesn't load frames, so this one stands in for an attached frame and its window
	const posted = vi.fn();
	const frameWindow = { postMessage: posted };
	const frame = document.createElement("iframe");
	Object.defineProperties(frame, {
		src: { value: `${origin}/page` },
		contentWindow: { value: frameWindow },
		isConnected: { value: true },
	});
	const bridge = createPreviewBridge();
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
	test("knows which revision the page shows through loads, updates and navigation", () => {
		vi.useFakeTimers({ now: 1000 });
		const { bridge, posted, receive } = setup();
		const ready = (loadedAt: number) =>
			receive({
				type: previewProtocol.messages.ready,
				updates: true,
				loadedAt,
			});

		bridge.expectLoad(1);
		ready(1001);
		expect(bridge.isShowing(1)).toBe(true);

		vi.setSystemTime(2000);
		bridge.show(2);
		expect(bridge.isShowing(2)).toBe(false);
		receive({ type: previewProtocol.messages.rendered, revision: 2 });
		expect(bridge.isShowing(2)).toBe(true);

		//* a page that started loading before revision 2 was written, eg. by navigating or from the back/forward cache, is brought up to date
		receive({ type: previewProtocol.messages.unload });
		ready(1500);
		expect(bridge.isShowing(2)).toBe(false);
		expect(posted).toHaveBeenLastCalledWith(
			createPreviewMessage({
				type: previewProtocol.messages.update,
				revision: 2,
			}),
			origin,
		);

		receive({ type: previewProtocol.messages.unload });
		ready(2500);
		expect(bridge.isShowing(2)).toBe(true);
		vi.useRealTimers();
	});
});
