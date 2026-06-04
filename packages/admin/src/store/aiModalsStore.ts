import type { Locale, Media } from "@types";
import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";

type ImageSource = {
	file?: File | null;
	url?: string | null;
	filename?: string;
};

type MediaContext = {
	id?: string | number;
	name?: Media["title"];
	alt?: Media["alt"];
};

type AltSetter = (
	value: Media["alt"] | ((_previous: Media["alt"]) => Media["alt"]),
) => void | Promise<void>;

export interface MediaAltGenerationTarget {
	image: Accessor<ImageSource | null>;
	media: Accessor<MediaContext>;
	locales: Accessor<Locale[]>;
	setAlt: AltSetter;
	disabled?: Accessor<boolean>;
}

type ModalRegistry = {
	mediaAltGeneration: {
		data: {
			target: MediaAltGenerationTarget;
			targetId: string;
		};
	};
};

type ModalType = keyof ModalRegistry;

type ModalState<K extends ModalType> = {
	type: K;
	data: ModalRegistry[K]["data"];
};

type AnyModalState = {
	[K in ModalType]: ModalState<K>;
}[ModalType];

type AiModalsStoreState = {
	current: AnyModalState | null;
	isLoading: boolean;
	isApplying: boolean;
};

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

export type { ModalRegistry, ModalState, ModalType };
