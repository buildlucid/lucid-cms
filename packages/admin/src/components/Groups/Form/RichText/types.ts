import type {
	DocumentRef,
	FieldError,
	MediaRef,
	RichTextFieldErrorReference,
} from "@types";
import type { CollectionBrickConfig } from "@/types/collection-config";

export type RichTextMediaType = "image" | "audio" | "video";

export type RichTextVariableSelection = {
	collectionKey: string;
	documentId: number;
	fieldKey: string;
	document: DocumentRef;
};

export interface RichTextOptions {
	headings?: boolean;
	underline?: boolean;
	strikethrough?: boolean;
	links?: {
		external?: boolean;
		internal?: boolean | string[];
	};
	media?: boolean | RichTextMediaType[];
	bricks?: boolean | string[];
	variables?: boolean | string[];
	appearance?: "default" | "seamless";
	fullscreen?: boolean;
	documentCollectionKeys?: string[];
	embeddedBrickConfigs?: CollectionBrickConfig[];
	locale?: string;
	references?: {
		media?: (id: number) => NonNullable<MediaRef> | undefined;
		document?: (
			collectionKey: string,
			documentId: number,
		) => DocumentRef | undefined;
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
			allowedTypes: RichTextMediaType[];
			onSelect: (id: number) => void;
		}) => void;
		uploadMedia?: (props: {
			allowedTypes: RichTextMediaType[];
			onUpload: (id: number) => void;
		}) => void;
		selectDocument?: (props: {
			collectionKeys: string[];
			current?: DocumentRef;
			onSelect: (document: DocumentRef) => void;
		}) => void;
		selectVariable?: (props: {
			current?: Omit<RichTextVariableSelection, "document">;
			onSelect: (selection: RichTextVariableSelection) => void;
		}) => void;
		selectEmbeddedBrick?: (props: { onSelect: (ref: string) => void }) => void;
		editEmbeddedBrick?: (ref: string) => void;
	};
}
