import type { Collection } from "@types";

export type CollectionFieldConfig = Collection["fields"][number];

export type CollectionFieldType = CollectionFieldConfig["type"];

export type CollectionFieldConfigByType<TType extends CollectionFieldType> =
	Extract<CollectionFieldConfig, { type: TType }>;

export type CollectionStructuralFieldConfig = Extract<
	CollectionFieldConfig,
	{ type: "section" | "collapsible" }
>;

export type CollectionNonTabFieldConfig = Exclude<
	CollectionFieldConfig,
	{ type: "tab" }
>;

/** Field configs that hold document data - structural containers excluded. */
export type CollectionDataFieldConfig = Exclude<
	CollectionFieldConfig,
	{ type: "tab" | "section" | "collapsible" }
>;

export type CollectionLeafFieldConfig = Exclude<
	CollectionFieldConfig,
	{ type: "repeater" | "tab" | "section" | "collapsible" }
>;

export type CollectionBrickConfig = Collection["fixedBricks"][number];
