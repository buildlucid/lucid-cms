import { describe, expect, test } from "vitest";
import {
	createPreviewMessage,
	isPreviewChildMessage,
	isPreviewParentMessage,
	previewProtocol,
} from "./index.js";

const target = { collectionKey: "page", documentId: 1, path: ["title"] };

describe("direction-specific message validation", () => {
	test("accepts current child messages and rejects parent or unknown messages", () => {
		expect(
			isPreviewChildMessage(
				createPreviewMessage({ type: previewProtocol.messages.ready }),
			),
		).toBe(true);
		expect(
			isPreviewChildMessage(
				createPreviewMessage({
					type: previewProtocol.messages.focusField,
					target,
				}),
			),
		).toBe(true);
		expect(
			isPreviewChildMessage(
				createPreviewMessage({ type: previewProtocol.messages.connect }),
			),
		).toBe(false);
		expect(
			isPreviewChildMessage({
				scope: previewProtocol.scope,
				version: 2,
				type: previewProtocol.messages.ready,
			}),
		).toBe(false);
		expect(
			isPreviewChildMessage({
				...createPreviewMessage({ type: previewProtocol.messages.ready }),
				extra: "x",
			}),
		).toBe(false);
	});

	test("accepts current parent messages and validates their payloads", () => {
		expect(
			isPreviewParentMessage(
				createPreviewMessage({ type: previewProtocol.messages.connect }),
			),
		).toBe(true);
		expect(
			isPreviewParentMessage(
				createPreviewMessage({
					type: previewProtocol.messages.captureScroll,
					requestId: "capture-1",
				}),
			),
		).toBe(true);
		expect(
			isPreviewParentMessage(
				createPreviewMessage({
					type: previewProtocol.messages.restoreScroll,
					state: { pageKey: "https://example.com/", x: 0, y: 10 },
				}),
			),
		).toBe(true);
		expect(
			isPreviewParentMessage({
				scope: previewProtocol.scope,
				version: previewProtocol.version,
				type: previewProtocol.messages.captureScroll,
				requestId: "",
			}),
		).toBe(false);
	});
});
