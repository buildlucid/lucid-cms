import type { Collection, InternalDocumentField } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { ReadonlyData } from "../../types/utils.js";
import type { BrickSlotMatch } from "../BrickSlots/types.js";
import type { fieldSlotKeys } from "./constants.js";

export type FieldSlot = (typeof fieldSlotKeys)[keyof typeof fieldSlotKeys];

export type FieldSlotMatch = Omit<BrickSlotMatch, "kind"> & {
	field?: string;
	kind?: BrickSlotMatch["kind"] | "collection-fields";
};

/** Experimental read-only view of one input field in the active content locale. */
export type FieldSlotProps = {
	readonly field: ReadonlyData<
		Exclude<
			Collection["fields"][number],
			{ type: "tab" | "section" | "collapsible" | "repeater" }
		>
	>;
	readonly value: ReadonlyData<InternalDocumentField["value"]>;
	readonly contentLocale: string;
};

export type FieldSlotComponent = Component<FieldSlotProps>;
