import type { Collection, InternalDocumentField } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { ReadonlyData } from "../../types/utils.js";
import type { brickSlotKeys } from "./constants.js";

export type BrickSlot = (typeof brickSlotKeys)[keyof typeof brickSlotKeys];

export type BrickSlotMatch = {
	collection?: string;
	brick?: string;
	kind?: "fixed" | "builder" | "embedded";
};

/** Experimental read-only view of the active brick and its unsaved fields. */
export type BrickSlotProps = {
	readonly brick: ReadonlyData<Collection["fixedBricks"][number]>;
	readonly fields: ReadonlyData<InternalDocumentField[]>;
	readonly contentLocale: string;
};

export type BrickSlotComponent = Component<BrickSlotProps>;
