import type { Component } from "solid-js";
import type {
	BrickState,
	EditorContext,
} from "../../extensions/editor/types.js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { brickSlotPolicies } from "./constants.js";

export type BrickSlot = keyof typeof brickSlotPolicies;

/** Side panels share a 12-column grid with the standard brick content. */
export type BrickSlotPlacement =
	| { slot: "brick.header" | "brick.beforeFields" | "brick.afterFields" }
	| {
			/** Start and end follow the interface direction. */
			slot: "brick.start" | "brick.end";
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
export type BrickSlotProps<
	TOptions extends AdminOptions | undefined = undefined,
> = {
	readonly slot: BrickSlot;
	readonly open: boolean;
	readonly brick: BrickState;
	readonly context: EditorContext;
	readonly options: TOptions;
};

export type BrickSlotComponent<
	TOptions extends AdminOptions | undefined = undefined,
> = Component<BrickSlotProps<TOptions>>;
