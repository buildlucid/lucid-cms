import type z from "zod";
import type writeSingle from "../../../services/documents/write-single.js";
import type {
	documentActorSchema,
	documentDataSchema,
	documentEditableDataSchema,
	documentEditTokenSchema,
	documentPatchSchema,
} from "./authoring-values-schema.js";

/** A user with collection permissions, or a trusted system operation. */
export type DocumentActor = z.infer<typeof documentActorSchema>;
/** Pass a token returned by getEditable to reject a write if that document has changed. */
export type DocumentEditToken = z.infer<typeof documentEditTokenSchema>;
/** Partial document values. Arrays replace their contents; JSON and rich text replace the whole field. */
export type DocumentData = z.infer<typeof documentDataSchema>;
/** Complete stored values returned for editing, including refs for nested items. */
export type DocumentEditableData = z.infer<typeof documentEditableDataSchema>;
/** Operations run in order and validate the resulting document together. */
export type DocumentPatch = z.infer<typeof documentPatchSchema>;

// biome-ignore lint/suspicious/noEmptyInterface: generated collection types extend this map
export interface CollectionDocumentDataByCollection {}
// biome-ignore lint/suspicious/noEmptyInterface: generated collection types extend this map
export interface CollectionDocumentEditableByCollection {}
// biome-ignore lint/suspicious/noEmptyInterface: generated collection types extend this map
export interface CollectionDocumentPatchByCollection {}

export type CollectionDocumentData<K extends string = string> =
	K extends keyof CollectionDocumentDataByCollection
		? CollectionDocumentDataByCollection[K]
		: DocumentData;
export type CollectionDocumentEditable<K extends string = string> =
	K extends keyof CollectionDocumentEditableByCollection
		? CollectionDocumentEditableByCollection[K]
		: DocumentEditableData;
export type CollectionDocumentPatch<K extends string = string> =
	K extends keyof CollectionDocumentPatchByCollection
		? CollectionDocumentPatchByCollection[K]
		: DocumentPatch;

/** Identifies the saved content without fetching a rendered document. */
export type DocumentWriteResult = NonNullable<
	Awaited<ReturnType<typeof writeSingle>>["data"]
>;

/** Stored authoring values, with references for addressing nested items. Reading does not reserve the document. */
export type DocumentEditable<K extends string = string> = Omit<
	DocumentWriteResult,
	"changed"
> & {
	data: CollectionDocumentEditable<K>;
};
