import type {
	FieldConfig,
	FieldOptions,
	FieldTypes,
} from "../../custom-fields/types.js";
import type {
	CollectionLabelFieldOptions,
	CollectionListFieldOptions,
} from "../collection/types.js";

export interface FieldSetMeta {
	fieldKeys: string[];
	repeaterDepth: Record<string, number>;
}

export type FieldSnapshot<T extends FieldTypes = FieldTypes> = {
	readonly key: string;
	readonly type: T;
	readonly config: Readonly<FieldConfig<T>>;
	readonly treeParent: string | null;
	readonly tabParent: string | null;
	readonly structuralParent: string | null;
};

/** Fields that hold other fields. */
export type ContainerFieldType = "tab" | "repeater" | "section" | "collapsible";

/** Fields a collection can show as a list column and use as the document label. */
type LabelFieldType =
	| "text"
	| "number"
	| "select"
	| "textarea"
	| "datetime"
	| "color";
/** Fields a collection can show as a list column. */
type ListFieldType = "range" | "checkbox" | "user" | "media" | "relation";

/** Options a `field` helper takes: the field's own, plus its children or its collection list settings. */
export type FieldNodeOptions<T extends FieldTypes> = FieldOptions<T> &
	(T extends ContainerFieldType
		? {
				/** The fields inside this one. Tabs only go at the top level. */
				fields: readonly ContentFieldNode[];
			}
		: T extends LabelFieldType
			? CollectionLabelFieldOptions
			: T extends ListFieldType
				? CollectionListFieldOptions
				: unknown);

/** A field as `field.*` describes it, with any child fields nested inside its options. */
export type FieldNode<T extends FieldTypes = FieldTypes> = {
	[Type in T]: {
		readonly type: Type;
		readonly key: string;
	} & (Type extends ContainerFieldType
		? { readonly options: FieldNodeOptions<Type> }
		: //* fields with required settings, such as a relation's collection, need options
			Record<never, never> extends FieldOptions<Type>
			? { readonly options?: FieldNodeOptions<Type> }
			: { readonly options: FieldNodeOptions<Type> });
}[T];

/** Any field except a tab, which is what containers hold. */
export type ContentFieldNode = FieldNode<Exclude<FieldTypes, "tab">>;

/** Insertion point among top-level or tab fields: start, end or beside an existing field. */
export type FieldPlacement =
	| { at: "start" | "end"; tab?: string; before?: never; after?: never }
	| { before: string; at?: never; tab?: never; after?: never }
	| { after: string; at?: never; tab?: never; before?: never };
