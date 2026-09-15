import type {
	InternalDocumentField,
	Locale,
	Media,
	MediaTranslation,
} from "@types";
import type { Accessor } from "solid-js";
import type { RichTextOptions } from "@/components/RichText/RichText";

export type AiImageSource = {
	file?: File | null;
	url?: string | null;
	filename?: string;
	mimeType?: "image/webp" | "image/png" | "image/jpeg";
};

type MediaContext = {
	id?: string | number;
	name?: MediaTranslation[];
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
		type: "builder" | "fixed" | "embedded";
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
	preview?: {
		richTextOptions?: Accessor<RichTextOptions>;
	};
	setValue: (value: unknown, _localeCode?: string) => void | Promise<void>;
	disabled?: Accessor<boolean>;
}

export type ModalRegistry = {
	customFieldGeneration: {
		data: {
			target: CustomFieldGenerationTarget;
			targetId: string;
			zIndex?: number;
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

export type ModalType = keyof ModalRegistry;

export type ModalState<K extends ModalType> = {
	type: K;
	data: ModalRegistry[K]["data"];
};

export type AnyModalState = {
	[K in ModalType]: ModalState<K>;
}[ModalType];

export type AiModalsStoreState = {
	current: AnyModalState | null;
	isLoading: boolean;
	isApplying: boolean;
};
