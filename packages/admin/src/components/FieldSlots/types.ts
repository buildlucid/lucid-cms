import type { Component } from "solid-js";
import type {
	EditorField,
	FieldScope,
	ValueFieldType,
} from "../../extensions/editor/types.js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { BrickSlotMatch } from "../BrickSlots/types.js";
import type { fieldSlotPolicies } from "./constants.js";

export type FieldSlot = keyof typeof fieldSlotPolicies;

export type FieldSlotMatch = Omit<BrickSlotMatch, "kind"> & {
	field?: string;
	/** Matches every field of a type, eg. `"color"` for a brand palette. */
	fieldType?: ValueFieldType;
	kind?: BrickSlotMatch["kind"] | "collection-fields";
};

/**
 * Field slot props with sibling access. `field.input` replaces the input unless it renders
 * nothing; before/after slots surround it. `TType` narrows matched field types.
 */
export type FieldSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
	TType extends ValueFieldType = ValueFieldType,
> = {
	readonly slot: FieldSlot;
	readonly field: EditorField<TType>;
	/** The field's siblings: the same repeater item, or the brick's top level. */
	readonly fields: FieldScope;
	readonly options: TOptions;
};

export type FieldSlotComponent<
	TOptions extends AdminOptions | undefined = undefined,
	TType extends ValueFieldType = ValueFieldType,
> = Component<FieldSlotProps<TOptions, TType>>;
