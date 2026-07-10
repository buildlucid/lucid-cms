import { debounce } from "@solid-primitives/scheduled";
import { onCleanup } from "solid-js";
import type { Params as DocumentOrderUpdate } from "@/services/api/documents/useUpdateOrder";

export const DOCUMENT_ORDER_SAVE_DEBOUNCE_MS = 500;

export function useDocumentOrderSave(props: {
	save: (update: DocumentOrderUpdate) => Promise<unknown>;
	onSaved: () => void | Promise<void>;
}) {
	let pendingUpdates: DocumentOrderUpdate[] = [];
	let saveInProgress = false;
	let debounceElapsedWhileSaving = false;

	const savePendingUpdates = async () => {
		if (saveInProgress) {
			debounceElapsedWhileSaving = true;
			return;
		}

		const updates = pendingUpdates;
		pendingUpdates = [];
		if (updates.length === 0) return;

		saveInProgress = true;
		try {
			//* preserve each move so rapid reorders of different documents are saved
			for (const update of updates) {
				await props.save(update);
			}
		} catch {
			pendingUpdates = [];
			debouncedSave.clear();
			debounceElapsedWhileSaving = false;
			return;
		} finally {
			saveInProgress = false;
		}

		if (debounceElapsedWhileSaving) {
			debounceElapsedWhileSaving = false;
			void savePendingUpdates();
			return;
		}

		if (pendingUpdates.length === 0) {
			await props.onSaved();
		}
	};

	const debouncedSave = debounce(
		() => void savePendingUpdates(),
		DOCUMENT_ORDER_SAVE_DEBOUNCE_MS,
	);

	const queue = (update: DocumentOrderUpdate) => {
		pendingUpdates.push(update);
		debouncedSave();
	};

	onCleanup(() => {
		pendingUpdates = [];
		debouncedSave.clear();
	});

	return {
		queue,
	};
}
