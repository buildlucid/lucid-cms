import type { ContentRoute, DocumentRef, MediaRef } from "@types";
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
	routes?: ContentRoute[];
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
			routes: ContentRoute[];
			current?: DocumentRef;
			onSelect: (document: DocumentRef, route: ContentRoute) => void;
		}) => void;
		selectVariable?: (props: {
			current?: Omit<RichTextVariableSelection, "document">;
			onSelect: (selection: RichTextVariableSelection) => void;
		}) => void;
		selectEmbeddedBrick?: (props: { onSelect: (ref: string) => void }) => void;
		editEmbeddedBrick?: (ref: string) => void;
	};
}
