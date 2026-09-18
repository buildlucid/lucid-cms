import type { Component } from "solid-js";
import type {
	BrickState,
	EditorContext,
} from "../../extensions/editor/types.js";
import type { brickSlotKeys } from "./constants.js";

export type BrickSlot = (typeof brickSlotKeys)[keyof typeof brickSlotKeys];

/** Side panels share a 12-column grid with the standard brick content. */
export type BrickSlotPlacement =
	| {
			slot:
				| typeof brickSlotKeys.header
				| typeof brickSlotKeys.beforeFields
				| typeof brickSlotKeys.afterFields;
	  }
	| {
			slot: typeof brickSlotKeys.left | typeof brickSlotKeys.right;
			/** Columns occupied by the panel. Defaults to 6; fields use the remainder. */
			width?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
			/** Keep the panel below the editor toolbar while scrolling. Disabled when stacked. */
			sticky?: boolean;
	  };

export type BrickSlotMatch = {
	collection?: string;
	brick?: string;
	kind?: "fixed" | "builder" | "embedded";
};

/** A read-only view of this brick instance and its unsaved fields. */
export type BrickSlotProps = {
	readonly slot: BrickSlot;
	readonly open: boolean;
	readonly brick: BrickState;
	readonly context: EditorContext;
};

export type BrickSlotComponent = Component<BrickSlotProps>;
