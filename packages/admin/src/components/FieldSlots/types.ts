import type { Component } from "solid-js";
import type {
	EditorFieldState,
	FieldContext,
} from "../../extensions/editor/types.js";
import type { BrickSlotMatch } from "../BrickSlots/types.js";
import type { fieldSlotKeys } from "./constants.js";

export type FieldSlot = (typeof fieldSlotKeys)[keyof typeof fieldSlotKeys];

export type FieldSlotMatch = Omit<BrickSlotMatch, "kind"> & {
	field?: string;
	kind?: BrickSlotMatch["kind"] | "collection-fields";
};

/** A read-only view of one field instance and its surrounding editor scope. */
export type FieldSlotProps = {
	readonly slot: FieldSlot;
	readonly field: EditorFieldState;
	readonly context: FieldContext;
};

export type FieldSlotComponent = Component<FieldSlotProps>;
