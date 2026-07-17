import type { FieldError, InternalDocumentField } from "@types";
import {
	type Accessor,
	type Component,
	createMemo,
	Index,
	Show,
} from "solid-js";
import { DynamicField } from "@/components/Groups/Builder/CustomFields";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";

interface SectionFieldProps {
	fieldConfig: CollectionFieldConfigByType<"section">;
	fields: InternalDocumentField[];
	fieldsByKey?: Accessor<Map<string, InternalDocumentField>>;
	fieldErrors: FieldError[];
	conditionScopes?: Accessor<FieldConditionScope[]>;
	groupRef?: string;
	groupPath?: string;
	repeaterKey?: string;
	repeaterDepth?: number;
	pathPrefix?: Array<string | number>;
}

export const SectionField: Component<SectionFieldProps> = (props) => {
	// -------------------------------
	// Memos
	const fieldConfig = createMemo(() => props.fieldConfig);
	const label = createMemo(() =>
		helpers.getLocaleValue({
			value: fieldConfig().details?.label,
		}),
	);
	const summary = createMemo(() =>
		helpers.getLocaleValue({
			value: fieldConfig().details?.summary,
		}),
	);

	// -------------------------------
	// Render
	return (
		<div class="w-full">
			<Show when={label() || summary()}>
				<div class="mb-2">
					<Show when={label()}>
						<h3 class="text-sm font-medium text-title">{label()}</h3>
					</Show>
					<Show when={summary()}>
						<p class="text-sm text-unfocused mt-0.5">{summary()}</p>
					</Show>
				</div>
			</Show>
			<div class="w-full border border-border rounded-md p-3 md:p-4 grid grid-cols-12 gap-4">
				<Index each={fieldConfig().fields}>
					{(config) => (
						<DynamicField
							fieldConfig={config()}
							fields={props.fields}
							fieldsByKey={props.fieldsByKey}
							fieldErrors={props.fieldErrors}
							conditionScopes={props.conditionScopes}
							groupRef={props.groupRef}
							groupPath={props.groupPath}
							repeaterKey={props.repeaterKey}
							repeaterDepth={props.repeaterDepth}
							pathPrefix={props.pathPrefix}
						/>
					)}
				</Index>
			</div>
		</div>
	);
};
