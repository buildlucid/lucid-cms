import type z from "zod";
import type writeSingle from "../../../services/documents/write-single.js";
import type {
	documentDataSchema,
	documentEditableDataSchema,
	documentEditTokenSchema,
	documentPatchSchema,
} from "./authoring-values-schema.js";

/** Pass a token returned by getEditable to reject a write if that document has changed. */
export type DocumentEditToken = z.infer<typeof documentEditTokenSchema>;
/** Partial document values. Arrays set their items, merging those that keep their ref; JSON and rich text replace the whole field. */
export type DocumentData = z.infer<typeof documentDataSchema>;
/** Complete stored values returned for editing, including refs for nested items. */
export type DocumentEditableData = z.infer<typeof documentEditableDataSchema>;
/** Operations run in order and validate the resulting document together. */
export type DocumentPatch = z.infer<typeof documentPatchSchema>;

/**
 * Each collection's generated write types by collection key, which `lucidcms typegen` merges in:
 * `data`, `editable` and `patch`.
 */
// oxlint-disable-next-line typescript/no-empty-object-type -- generated collection types extend this map
export interface CollectionWrites {}

type CollectionWrite<
	K extends string,
	TName extends string,
	TFallback,
> = K extends keyof CollectionWrites
	? CollectionWrites[K] extends Record<TName, infer TValue>
		? TValue
		: TFallback
	: TFallback;

export type CollectionDocumentData<K extends string = string> = CollectionWrite<
	K,
	"data",
	DocumentData
>;
export type CollectionDocumentEditable<K extends string = string> =
	CollectionWrite<K, "editable", DocumentEditableData>;
export type CollectionDocumentPatch<K extends string = string> =
	CollectionWrite<K, "patch", DocumentPatch>;

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
