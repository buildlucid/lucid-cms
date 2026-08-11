import type {
	Collection,
	DocumentRef,
	FieldError,
	MediaRef,
	MediaType,
	RichTextFieldErrorReference,
	RichTextUserVariableField,
	UserRef,
} from "@types";
import type { CollectionBrickConfig } from "@/types/collection-config";

export type RichTextVariableReference =
	| {
			source: "document";
			collectionKey: string;
			documentId: number;
			fieldKey: string;
	  }
	| {
			source: "user";
			userId: number;
			fieldKey: RichTextUserVariableField;
	  };

export type RichTextVariableSelection =
	| (Extract<RichTextVariableReference, { source: "document" }> & {
			document: DocumentRef;
	  })
	| (Extract<RichTextVariableReference, { source: "user" }> & {
			user: NonNullable<UserRef>;
	  });

export interface RichTextOptions {
	headings?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	links?: {
		external?: boolean;
		internal?: boolean | string[];
	};
	media?: boolean | MediaType[];
	documents?: boolean | string[];
	bricks?: boolean | string[];
	variables?: {
		document?: boolean | string[];
		user?: RichTextUserVariableField[];
	};
	appearance?: "default" | "seamless";
	fullscreen?: boolean;
	internalLinkCollectionKeys?: string[];
	documentNodeCollectionKeys?: string[];
	documentCollections?: Collection[];
	embeddedBrickConfigs?: CollectionBrickConfig[];
	locale?: string;
	references?: {
		media?: (id: number) => NonNullable<MediaRef> | undefined;
		document?: (
			collectionKey: string,
			documentId: number,
		) => DocumentRef | undefined;
		user?: (id: number) => NonNullable<UserRef> | undefined;
		embeddedBrick?: (ref: string) => { ref: string; key: string } | undefined;
	};
	validation?: {
		getReferenceErrors?: (
			reference: RichTextFieldErrorReference,
		) => FieldError[];
	};
	callbacks?: {
		selectMedia?: (props: {
			currentId?: number;
			onSelect: (id: number) => void;
		}) => void;
		uploadMedia?: (props: { onUpload: (id: number) => void }) => void;
		selectDocument?: (props: {
			collectionKeys: string[];
			current?: DocumentRef;
			onSelect: (document: DocumentRef) => void;
		}) => void;
		selectVariable?: (props: {
			current?: RichTextVariableReference;
			onSelect: (selection: RichTextVariableSelection) => void;
		}) => void;
		selectEmbeddedBrick?: (props: { onSelect: (ref: string) => void }) => void;
		editEmbeddedBrick?: (ref: string) => void;
	};
}
