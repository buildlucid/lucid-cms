import type { FieldError, InternalDocumentField } from "@types";
import type { Accessor, Component } from "solid-js";
import type { CollectionFieldConfig } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";

export interface DynamicFieldProps {
	fieldConfig: CollectionFieldConfig;
	fields: InternalDocumentField[];
	fieldsByKey?: Accessor<Map<string, InternalDocumentField>>;
	fieldErrors: FieldError[];
	activeTab?: Accessor<string | undefined>;
	conditionScopes?: Accessor<FieldConditionScope[]>;
	groupRef?: string;
	groupPath?: string;
	repeaterKey?: string;
	repeaterDepth?: number;
	pathPrefix?: Array<string | number>;
}

export type DynamicFieldRenderer = Component<DynamicFieldProps>;
