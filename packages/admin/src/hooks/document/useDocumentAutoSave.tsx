import { debounce } from "@solid-primitives/scheduled";
import type { CollectionResponse, DocumentResponse } from "@types";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import type api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";

const AUTO_SAVE_DEBOUNCE_MS = 800;

export function useDocumentAutoSave(props: {
	updateSingleVersionMutation: ReturnType<
		typeof api.documents.useUpdateSingleVersion
	>;
	document: Accessor<DocumentResponse | undefined>;
	collection: Accessor<CollectionResponse | undefined>;
	hasAutoSavePermission: Accessor<boolean | undefined>;
	autoSaveUserEnabled: Accessor<boolean>;
}) {
	let debounceProgressRaf: number | undefined;
	let debounceProgressStart = 0;
	const [isDebouncePending, setIsDebouncePending] = createSignal(false);
	const [debounceProgress, setDebounceProgress] = createSignal(0);

	const clearDebounceProgress = () => {
		if (debounceProgressRaf) {
			cancelAnimationFrame(debounceProgressRaf);
			debounceProgressRaf = undefined;
		}
		setIsDebouncePending(false);
		setDebounceProgress(0);
	};

	const tickDebounceProgress = (timestamp: number) => {
		if (!isDebouncePending()) {
			debounceProgressRaf = undefined;
			return;
		}

		const elapsed = timestamp - debounceProgressStart;
		const progress = Math.min(elapsed / AUTO_SAVE_DEBOUNCE_MS, 1);
		setDebounceProgress(progress);

		if (progress < 1) {
			debounceProgressRaf = requestAnimationFrame(tickDebounceProgress);
			return;
		}

		debounceProgressRaf = undefined;
	};

	const startDebounceProgress = () => {
		debounceProgressStart = performance.now();
		setIsDebouncePending(true);
		setDebounceProgress(0);

		if (debounceProgressRaf) cancelAnimationFrame(debounceProgressRaf);
		debounceProgressRaf = requestAnimationFrame(tickDebounceProgress);
	};

	const rawDebouncedAutoSave = debounce(() => {
		clearDebounceProgress();

		const collectionKey = props.collection()?.key;
		const documentId = props.document()?.id;
		const versionId = props.document()?.versionId;

		if (!collectionKey || !documentId || !versionId) return;

		props.updateSingleVersionMutation.action.mutate({
			collectionKey: collectionKey,
			documentId: documentId,
			versionId: versionId,
			body: {
				bricks: brickHelpers.getUpsertBricks(),
				fields: brickHelpers.getCollectionPseudoBrickFields(),
			},
		});
	}, AUTO_SAVE_DEBOUNCE_MS);

	const debouncedAutoSave = Object.assign(
		() => {
			startDebounceProgress();
			rawDebouncedAutoSave();
		},
		{
			clear: () => {
				clearDebounceProgress();
				rawDebouncedAutoSave.clear();
			},
		},
	);

	createEffect(() => {
		// Wait until initial snapshot is captured after store reset/refetch.
		// Without this guard, mount-time editor sync events can bump autoSaveCounter
		// and trigger autosave loops before baseline state exists.
		if (brickStore.get.initialSnapshot === null) return;

		if (!brickStore.getDocumentMutated()) return;
		if (brickStore.get.autoSaveCounter === 0) return;
		if (!props.hasAutoSavePermission()) return;
		if (!props.autoSaveUserEnabled()) return;

		if (brickStore.get.skipAutoSave) {
			brickStore.set("skipAutoSave", false);
			return;
		}

		debouncedAutoSave();
	});

	onCleanup(() => {
		debouncedAutoSave.clear();
	});

	return {
		debouncedAutoSave,
		isDebouncePending,
		debounceProgress,
	};
}

export type UseDocumentAutoSave = ReturnType<typeof useDocumentAutoSave>;
