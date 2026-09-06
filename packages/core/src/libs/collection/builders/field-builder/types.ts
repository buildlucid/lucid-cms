import type { FieldConfig, FieldTypes } from "../../custom-fields/types.js";

export interface FieldBuilderMeta {
	fieldKeys: string[];
	repeaterDepth: Record<string, number>;
}

export type FieldSnapshot<T extends FieldTypes = FieldTypes> = {
	readonly key: string;
	readonly type: T;
	readonly config: Readonly<FieldConfig<T>>;
	readonly treeParent: string | null;
	readonly tabParent: string | null;
	readonly structuralParent: string | null;
};
