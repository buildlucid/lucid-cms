import type {
	InternalDocumentField,
	Locale,
	Media,
	MediaTranslation,
} from "@types";
import type { Accessor } from "solid-js";
import { createStore } from "solid-js/store";

export type AiImageSource = {
	file?: File | null;
	url?: string | null;
	filename?: string;
	mimeType?: "image/webp" | "image/png" | "image/jpeg";
};

type MediaContext = {
	id?: string | number;
	name?: Media["title"];
	alt?: MediaTranslation[];
};

type AltSetter = (
	value:
		| MediaTranslation[]
		| ((_previous: MediaTranslation[]) => MediaTranslation[]),
) => void | Promise<void>;

export type MediaImageGenerationFileMeta = {
	origin: Extract<Media["origin"], "ai_generated" | "ai_modified">;
	aiGenerationRequestId: string;
};

export interface MediaAltGenerationTarget {
	image: Accessor<AiImageSource | null>;
	media: Accessor<MediaContext>;
	locales: Accessor<Locale[]>;
	setAlt: AltSetter;
	disabled?: Accessor<boolean>;
}

type FileSetter = (
	file: File,
	meta?: MediaImageGenerationFileMeta,
) => void | Promise<void>;

export interface MediaImageGenerationTarget {
	image: Accessor<AiImageSource | null>;
	setFile: FileSetter;
	disabled?: Accessor<boolean>;
}

export type CustomFieldGenerationFieldType =
	| "code"
	| "json"
	| "rich-text"
	| "text"
	| "textarea";

export type CustomFieldGenerationGuidance = {
	key: string;
	label: string;
};

export type CustomFieldGenerationDocument = {
	fields?: InternalDocumentField[];
	bricks?: Array<{
		ref: string;
		key: string;
		order: number;
		type: "builder" | "fixed";
		open?: boolean;
		fields?: InternalDocumentField[];
		id?: number | null;
	}>;
};

export interface CustomFieldGenerationTarget {
	field: Accessor<{
		key: string;
		type: CustomFieldGenerationFieldType;
		label?: string;
		localized: boolean;
		guidance: CustomFieldGenerationGuidance[];
		/** Language options for code fields. */
		languages?: string[];
	}>;
	request: Accessor<{
		collectionKey?: string;
		brickKey?: string;
		fieldKey: string;
		locale: {
			source?: string;
			target: string[];
		};
	}>;
	value: (_localeCode?: string) => unknown;
	document: Accessor<CustomFieldGenerationDocument>;
	setValue: (value: unknown, _localeCode?: string) => void | Promise<void>;
	disabled?: Accessor<boolean>;
}

type ModalRegistry = {
	customFieldGeneration: {
		data: {
			target: CustomFieldGenerationTarget;
			targetId: string;
		};
	};
	mediaAltGeneration: {
		data: {
			target: MediaAltGenerationTarget;
			targetId: string;
		};
	};
	mediaImageGeneration: {
		data: {
			target: MediaImageGenerationTarget;
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
