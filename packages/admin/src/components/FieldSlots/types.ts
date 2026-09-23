import type { Component } from "solid-js";
import type {
	EditorFieldState,
	FieldContext,
} from "../../extensions/editor/types.js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { BrickSlotMatch } from "../BrickSlots/types.js";
import type { fieldSlotPolicies } from "./constants.js";

export type FieldSlot = keyof typeof fieldSlotPolicies;

export type FieldSlotMatch = Omit<BrickSlotMatch, "kind"> & {
	field?: string;
	kind?: BrickSlotMatch["kind"] | "collection-fields";
};

/** A read-only view of one field instance and its surrounding editor scope. */
export type FieldSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: FieldSlot;
	readonly field: EditorFieldState;
	readonly context: FieldContext;
	readonly options: TOptions;
};

export type FieldSlotComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<FieldSlotProps<TOptions>>;
