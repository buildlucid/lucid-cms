import type { Collection } from "@types";

export type CollectionFieldConfig = Collection["fields"][number];

export type CollectionFieldType = CollectionFieldConfig["type"];

export type CollectionFieldConfigByType<TType extends CollectionFieldType> =
	Extract<CollectionFieldConfig, { type: TType }>;

export type CollectionNonTabFieldConfig = Exclude<
	CollectionFieldConfig,
	{ type: "tab" }
>;

export type CollectionLeafFieldConfig = Exclude<
	CollectionFieldConfig,
	{ type: "repeater" | "tab" }
>;

export type CollectionBrickConfig = Collection["fixedBricks"][number];
