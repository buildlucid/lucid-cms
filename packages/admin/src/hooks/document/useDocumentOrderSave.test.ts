import { createRoot } from "solid-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DOCUMENT_ORDER_SAVE_DEBOUNCE_MS,
	useDocumentOrderSave,
} from "./useDocumentOrderSave";

const firstUpdate = {
	collectionKey: "posts",
	id: 1,
	body: {
		previousDocumentId: 2,
		nextDocumentId: 3,
	},
};

const secondUpdate = {
	collectionKey: "posts",
	id: 4,
	body: {
		previousDocumentId: 1,
		nextDocumentId: null,
	},
};

describe("useDocumentOrderSave", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("waits for the debounce before saving", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const onSaved = vi.fn();
		let dispose: () => void = () => undefined;
		const orderSave = createRoot((rootDispose) => {
			dispose = rootDispose;
			return useDocumentOrderSave({ save, onSaved });
		});

		orderSave.queue(firstUpdate);
		await vi.advanceTimersByTimeAsync(DOCUMENT_ORDER_SAVE_DEBOUNCE_MS - 1);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith(firstUpdate);
		expect(onSaved).toHaveBeenCalledOnce();
		dispose();
	});

	it("restarts the debounce and preserves every queued reorder", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const onSaved = vi.fn();
		let dispose: () => void = () => undefined;
		const orderSave = createRoot((rootDispose) => {
			dispose = rootDispose;
			return useDocumentOrderSave({ save, onSaved });
		});

		orderSave.queue(firstUpdate);
		await vi.advanceTimersByTimeAsync(DOCUMENT_ORDER_SAVE_DEBOUNCE_MS / 2);
		orderSave.queue(secondUpdate);
		await vi.advanceTimersByTimeAsync(DOCUMENT_ORDER_SAVE_DEBOUNCE_MS - 1);
		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(save.mock.calls).toEqual([[firstUpdate], [secondUpdate]]);
		expect(onSaved).toHaveBeenCalledOnce();
		dispose();
	});

	it("cancels a pending save when its owner is disposed", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		let dispose: () => void = () => undefined;
		const orderSave = createRoot((rootDispose) => {
			dispose = rootDispose;
			return useDocumentOrderSave({ save, onSaved: vi.fn() });
		});

		orderSave.queue(firstUpdate);
		dispose();
		await vi.advanceTimersByTimeAsync(DOCUMENT_ORDER_SAVE_DEBOUNCE_MS);

		expect(save).not.toHaveBeenCalled();
	});
});
