import { createStore } from "solid-js/store";
import type {
	AiModalsStoreState,
	AnyModalState,
	ModalRegistry,
	ModalState,
	ModalType,
} from "./types";

export type {
	AiImageSource,
	CustomFieldGenerationDocument,
	CustomFieldGenerationFieldType,
	CustomFieldGenerationGuidance,
	CustomFieldGenerationTarget,
	MediaAltGenerationTarget,
	MediaImageGenerationFileMeta,
	MediaImageGenerationTarget,
	ModalRegistry,
	ModalState,
	ModalType,
} from "./types";

const [get, set] = createStore<AiModalsStoreState>({
	current: null,
	isLoading: false,
	isApplying: false,
});

function open<K extends ModalType>(
	type: K,
	config: {
		data: ModalRegistry[K]["data"];
	},
): void {
	set("current", {
		type,
		data: config.data,
	} as AnyModalState);
}

function close(): void {
	set("current", null);
	set("isLoading", false);
	set("isApplying", false);
}

function reset(): void {
	close();
}

function isOpen<K extends ModalType>(type: K): boolean {
	return get.current?.type === type;
}

function getModal<K extends ModalType>(type: K): ModalState<K> | undefined {
	if (get.current?.type === type) {
		return get.current as ModalState<K>;
	}
	return undefined;
}

function setLoading(isLoading: boolean): void {
	set("isLoading", isLoading);
}

function setApplying(isApplying: boolean): void {
	set("isApplying", isApplying);
}

const aiModalsStore = {
	get,
	set,
	open,
	close,
	reset,
	isOpen,
	getModal,
	setLoading,
	setApplying,
};

export default aiModalsStore;
