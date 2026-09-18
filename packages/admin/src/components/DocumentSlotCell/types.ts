import type {
	Collection,
	InternalCollectionDocument,
	Refs,
	ResolvedAdminCopy,
} from "@lucidcms/types";
import type { Component } from "solid-js";
import type { EditorFieldState } from "../../extensions/editor/types.js";
import type { documentSlotKeys } from "./constants.js";

export type DocumentSlot =
	(typeof documentSlotKeys)[keyof typeof documentSlotKeys];

export type DocumentSlotPlacement =
	| {
			slot: typeof documentSlotKeys.columnAddition;
			match?: { collection?: string };
			column: { label: string | ResolvedAdminCopy };
	  }
	| {
			slot: typeof documentSlotKeys.columnOverride;
			match: { collection?: string; field: string };
	  };

/** Listing data only: extensions do not fetch full documents for every row. */
export type DocumentSlotProps = {
	readonly document: Readonly<InternalCollectionDocument>;
	readonly collection: Readonly<Collection>;
	readonly contentLocale: string;
	readonly refs: Readonly<Refs> | undefined;
} & (
	| { readonly slot: typeof documentSlotKeys.columnAddition }
	| {
			readonly slot: typeof documentSlotKeys.columnOverride;
			readonly field: EditorFieldState;
	  }
);
export type DocumentSlotComponent = Component<DocumentSlotProps>;
