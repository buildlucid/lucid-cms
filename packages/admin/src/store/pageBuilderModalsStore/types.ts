import type {
	DocumentRef,
	LinkResValue,
	Media,
	MediaFieldConfig,
	MediaRef,
	MediaType,
	RelationFieldValue,
	RichTextUserVariableField,
	UserRef,
} from "@types";
import type {
	RichTextVariableReference,
	RichTextVariableSelection,
} from "@/components/RichText/types";

export type MediaDimensionValidation = NonNullable<
	NonNullable<MediaFieldConfig["validation"]>["width"]
>;

// ------------------------------------
// Modal Configuration Registry
// Define new modal types here - the rest is inferred automatically
// ------------------------------------

export type ModalRegistry = {
	mediaSelect: {
		data: {
			zIndex?: number;
			extensions?: string;
			type?: string;
			types?: MediaType[];
			width?: MediaDimensionValidation;
			height?: MediaDimensionValidation;
			multiple?: boolean;
			selected?: number[];
			selectedRefs?: Array<NonNullable<MediaRef>>;
		};
		result: {
			value: number[];
			refs: Array<NonNullable<MediaRef>>;
		};
	};
	mediaUpload: {
		data: {
			zIndex?: number;
			extensions?: string;
			type?: string;
			types?: MediaType[];
		};
		result: Media;
	};
	documentSelect: {
		data: {
			collectionKeys: string[];
			multiple?: boolean;
			selected?: RelationFieldValue[];
			selectedRefs?: Array<DocumentRef>;
			excludeDocument?: RelationFieldValue;
			zIndex?: number;
		};
		result: {
			value: RelationFieldValue[];
			refs: DocumentRef[];
		};
	};
	richTextVariableSelect: {
		data: {
			zIndex?: number;
			collectionKeys: string[];
			userFields: RichTextUserVariableField[];
			selected?: RichTextVariableReference;
			selectedDocumentRef?: DocumentRef;
			selectedUserRef?: NonNullable<UserRef>;
		};
		result: RichTextVariableSelection;
	};
	embeddedBrickEdit: {
		data: {
			brickRef: string;
			zIndex?: number;
		};
		result: undefined;
	};
	userSelect: {
		data: {
			multiple?: boolean;
			selected?: number[];
			selectedRefs?: Array<NonNullable<UserRef>>;
		};
		result: {
			value: number[];
			refs: Array<NonNullable<UserRef>>;
		};
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

export type ModalType = keyof ModalRegistry;

export type ModalState<K extends ModalType> = {
	type: K;
	data: ModalRegistry[K]["data"];
	onCallback: (result: ModalRegistry[K]["result"]) => void;
};

// Discriminated union of all possible modal states
export type AnyModalState = {
	[K in ModalType]: ModalState<K>;
}[ModalType];

export type PageBuilderModalsStoreState = {
	current: AnyModalState | null;
	/** Embedded-brick editing remains mounted while one of its fields opens a picker. */
	parent: AnyModalState | null;
};
