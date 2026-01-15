import type {
	DocumentResponse,
	LinkResValue,
	MediaResponse,
} from "@lucidcms/core/types";
import { createStore } from "solid-js/store";

// ------------------------------------
// Modal Configuration Registry
// Define new modal types here - the rest is inferred automatically
// ------------------------------------

type ModalRegistry = {
	mediaSelect: {
		data: {
			extensions?: string;
			type?: string;
			selected?: number;
		};
		result: MediaResponse;
	};
	mediaUpload: {
		data: {
			extensions?: string;
			type?: string;
		};
		result: MediaResponse;
	};
	documentSelect: {
		data: {
			collectionKey: string;
			selected?: number;
		};
		result: DocumentResponse;
	};
	linkSelect: {
		data: {
			selectedLink: LinkResValue;
		};
		result: LinkResValue;
	};
};

// ------------------------------------
// Derived Types (automatically inferred from registry)
// ------------------------------------

type ModalType = keyof ModalRegistry;

type ModalState<K extends ModalType> = {
	type: K;
	data: ModalRegistry[K]["data"];
	onCallback: (result: ModalRegistry[K]["result"]) => void;
};

// Discriminated union of all possible modal states
type AnyModalState = {
	[K in ModalType]: ModalState<K>;
}[ModalType];

type PageBuilderModalsStoreState = {
	current: AnyModalState | null;
};

// ------------------------------------
// Store Implementation
// ------------------------------------

const [get, set] = createStore<PageBuilderModalsStoreState>({
	current: null,
});

/**
 * Opens a modal with the specified type and configuration.
 * Fully type-safe - data and callback types are inferred from the modal type.
 *
 * @example
 * pageBuilderModalsStore.open("mediaSelect", {
 *   data: { extensions: "jpg,png", selected: 123 },
 *   onCallback: (media) => console.log(media.url), // media is MediaResponse
 * });
 */
function open<K extends ModalType>(
	type: K,
	config: {
		data: ModalRegistry[K]["data"];
		onCallback: (result: ModalRegistry[K]["result"]) => void;
	},
): void {
	set("current", {
		type,
		data: config.data,
		onCallback: config.onCallback,
	} as AnyModalState);
}

/**
 * Closes the currently open modal.
 */
function close(): void {
	set("current", null);
}

/**
 * Type guard to check if a specific modal type is currently open.
 * Narrows the type of the current modal state.
 *
 * @example
 * if (pageBuilderModalsStore.isOpen("mediaSelect")) {
 *   const { extensions } = pageBuilderModalsStore.get.current.data; // typed correctly
 * }
 */
function isOpen<K extends ModalType>(type: K): boolean {
	return get.current?.type === type;
}

/**
 * Gets the current modal state if it matches the specified type.
 * Returns undefined if no modal is open or if it's a different type.
 */
function getModal<K extends ModalType>(type: K): ModalState<K> | undefined {
	if (get.current?.type === type) {
		return get.current as ModalState<K>;
	}
	return undefined;
}

/**
 * Triggers the callback for the current modal and closes it.
 * This is a convenience method for modal implementations.
 */
function triggerAndClose<K extends ModalType>(
	type: K,
	result: ModalRegistry[K]["result"],
): void {
	const modal = getModal(type);
	if (modal) {
		modal.onCallback(result);
		close();
	}
}

const pageBuilderModalsStore = {
	get,
	set,
	open,
	close,
	isOpen,
	getModal,
	triggerAndClose,
};

export default pageBuilderModalsStore;

// ------------------------------------
// Type Exports for Component Props
// ------------------------------------

export type { ModalRegistry, ModalType, ModalState };
