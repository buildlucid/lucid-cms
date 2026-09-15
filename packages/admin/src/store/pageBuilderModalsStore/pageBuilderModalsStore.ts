import { createStore } from "solid-js/store";
import type {
	AnyModalState,
	ModalRegistry,
	ModalState,
	ModalType,
	PageBuilderModalsStoreState,
} from "./types";

export type { MediaDimensionValidation } from "./types";

// ------------------------------------
// Store Implementation
// ------------------------------------

const [get, set] = createStore<PageBuilderModalsStoreState>({
	current: null,
	parent: null,
});

/**
 * Opens a modal with the specified type and configuration.
 * Fully type-safe - data and callback types are inferred from the modal type.
 *
 * @example
 * pageBuilderModalsStore.open("mediaSelect", {
 *   data: { extensions: "jpg,png", selected: 123 },
 *   onCallback: (media) => console.log(media.url), // media is Media
 * });
 */
function open<K extends ModalType>(
	type: K,
	config: {
		data: ModalRegistry[K]["data"];
		onCallback: (result: ModalRegistry[K]["result"]) => void;
	},
): void {
	const next = {
		type,
		data: config.data,
		onCallback: config.onCallback,
	} as AnyModalState;
	const embeddedParent =
		get.current?.type === "embeddedBrickEdit" ? get.current : get.parent;
	set({
		current: next,
		parent: embeddedParent ?? null,
	});
}

/**
 * Closes the current modal when it still matches the optional caller type.
 */
function close(type?: ModalType): void {
	if (type && get.current?.type !== type) return;
	if (get.parent) {
		set({ current: get.parent, parent: null });
		return;
	}
	set("current", null);
}

/**
 * Resets the store to its initial state.
 * Should be called when navigating away from the page builder.
 */
function reset(): void {
	set({ current: null, parent: null });
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
	return get.current?.type === type || get.parent?.type === type;
}

/**
 * Gets the current modal state if it matches the specified type.
 * Returns undefined if no modal is open or if it's a different type.
 */
function getModal<K extends ModalType>(type: K): ModalState<K> | undefined {
	if (get.current?.type === type) {
		return get.current as ModalState<K>;
	}
	if (get.parent?.type === type) {
		return get.parent as ModalState<K>;
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
	const modal =
		get.current?.type === type ? (get.current as ModalState<K>) : undefined;
	if (modal) {
		modal.onCallback(result);
		close(type);
	}
}

const pageBuilderModalsStore = {
	get,
	set,
	open,
	close,
	reset,
	isOpen,
	getModal,
	triggerAndClose,
};

export default pageBuilderModalsStore;
