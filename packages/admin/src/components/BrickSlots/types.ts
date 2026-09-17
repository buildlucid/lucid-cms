import type { Component } from "solid-js";
import type {
	BrickState,
	EditorContext,
} from "../../extensions/editor/types.js";
import type { brickSlotKeys } from "./constants.js";

export type BrickSlot = (typeof brickSlotKeys)[keyof typeof brickSlotKeys];

export type BrickSlotMatch = {
	collection?: string;
	brick?: string;
	kind?: "fixed" | "builder" | "embedded";
};

/** A read-only view of this brick instance and its unsaved fields. */
export type BrickSlotProps = {
	readonly slot: BrickSlot;
	readonly brick: BrickState;
	readonly context: EditorContext;
};

export type BrickSlotComponent = Component<BrickSlotProps>;
