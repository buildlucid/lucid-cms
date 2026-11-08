import type {
	CodeValue,
	Collection,
	EmailFieldValue,
	LinkValue,
	MediaFieldValue,
	RefResourceMap,
	RelationFieldValue,
	RichTextFieldValue,
	UserFieldValue,
} from "@lucidcms/types";
import type { ReadonlyData } from "../../types/utils.js";

/** A field that holds document data: every field type except tabs, sections and collapsibles. */
export type EditorFieldConfig = Exclude<
	Collection["fields"][number],
	{ type: "tab" | "section" | "collapsible" }
>;

export type EditorFieldType = EditorFieldConfig["type"];

/** Field types that hold one value, rather than repeater items. */
export type ValueFieldType = Exclude<EditorFieldType, "repeater">;

/** The value each field type holds in one locale. */
export type FieldValueByType = {
	text: string | null;
	textarea: string | null;
	select: string | null;
	color: string | null;
	datetime: string | null;
	number: number | null;
	range: number[];
	checkbox: boolean | null;
	json: Record<string, unknown> | unknown[] | null;
	code: CodeValue;
	link: LinkValue;
	"rich-text": RichTextFieldValue | null;
	media: MediaFieldValue;
	relation: RelationFieldValue[];
	user: UserFieldValue;
	email: EmailFieldValue;
};

/** The display data linked field types keep for each item they hold. */
export type FieldRefByType = {
	media: RefResourceMap["media"];
	relation: RefResourceMap["documents"];
	user: RefResourceMap["users"];
	email: RefResourceMap["emails"];
};

type FieldConfigByType<TType extends EditorFieldType> = ReadonlyData<
	Extract<EditorFieldConfig, { type: TType }>
>;

/** A stored field value, as the document list shows it. */
export type FieldState<TType extends EditorFieldType = EditorFieldType> = {
	[Type in TType]: {
		readonly key: string;
		readonly type: Type;
		readonly config: FieldConfigByType<Type>;
		/** The value in the current content locale, or undefined when it has none. Repeaters have no value. */
		readonly value: Type extends ValueFieldType
			? ReadonlyData<FieldValueByType[Type]> | undefined
			: undefined;
	};
}[TType];

type EditorFieldValue<TType extends EditorFieldType> =
	TType extends ValueFieldType
		? {
				/** The value in the current content locale, or undefined when it has none. */
				readonly value: ReadonlyData<FieldValueByType[TType]> | undefined;
				/** Writes the value in the current content locale. Does nothing when `readOnly`. */
				setValue: (value: ReadonlyData<FieldValueByType[TType]>) => void;
			} & (TType extends keyof FieldRefByType
				? {
						/** Linked item display data in value order. Missing items load on demand. */
						readonly refs: readonly FieldRefByType[TType][];
					}
				: unknown)
		: {
				/** Repeaters hold items rather than a value. */
				readonly value?: undefined;
				/** The repeater's items, in order. */
				readonly groups: readonly {
					readonly ref: string;
					readonly fields: FieldScope;
				}[];
			};

/**
 * Live field state in the content locale. Narrow `type` for typed `value` and `setValue`; retained
 * handles stay current.
 */
export type EditorField<TType extends EditorFieldType = EditorFieldType> = {
	[Type in TType]: {
		readonly key: string;
		readonly type: Type;
		readonly config: FieldConfigByType<Type>;
		/** For the control that edits the field, so its label and the preview's focus find it. */
		readonly id: string;
		/** The label in the admin's language. */
		readonly label: string;
		readonly description: string | undefined;
		readonly required: boolean;
		/** The document can't be edited, or you can't change this field. */
		readonly readOnly: boolean;
		/** Validation messages for the current content locale. */
		readonly errors: readonly string[];
	} & EditorFieldValue<Type>;
}[TType];

/** Fields at one level: a repeater item, a brick's top level, or the document's own fields. */
export type FieldScope = {
	/** Returns a visible field matching the requested type, or undefined. */
	get(key: string): EditorField | undefined;
	get<TType extends EditorFieldType>(
		key: string,
		type: TType,
	): EditorField<TType> | undefined;
};

/** A brick in the open document. */
export type EditorBrick = {
	readonly key: string;
	readonly ref: string;
	readonly kind: "fixed" | "builder" | "embedded";
	readonly config: ReadonlyData<Collection["fixedBricks"][number]>;
	/** The brick's top-level fields. */
	readonly fields: FieldScope;
};

/** The open document, as `useDocumentEditor` returns it. */
export type DocumentEditor = {
	readonly collectionKey: string;
	/** Undefined until a new document is first saved. */
	readonly documentId: number | undefined;
	readonly locale: {
		/** The content locale fields show and write. */
		readonly current: string;
		readonly default: string;
	};
	/** The collection's route, read from unsaved edits in the current locale. */
	readonly route:
		| {
				readonly field: string;
				readonly path: string | undefined;
		  }
		| undefined;
	/** The document can't be edited, eg. another tab holds it or it's an older version. */
	readonly readOnly: boolean;
	/** The document's own fields, outside bricks. */
	readonly fields: FieldScope;
	/** Records the writes `write` makes as one undo step. */
	batch: (write: () => void) => void;
};
