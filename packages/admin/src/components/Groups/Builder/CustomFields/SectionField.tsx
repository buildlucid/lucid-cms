import type { FieldError, InternalDocumentField } from "@types";
import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createMemo,
	Index,
	Show,
} from "solid-js";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import type { FieldConditionScope } from "@/utils/field-condition-helpers";
import helpers from "@/utils/helpers";
import {
	countFieldErrorsForKeys,
	getStructuralFieldKeys,
} from "@/utils/structural-field-helpers";
import { DynamicField } from "./DynamicField";

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
	const structuralFieldKeys = createMemo(() =>
		getStructuralFieldKeys(fieldConfig().fields),
	);
	const errorCount = createMemo(() =>
		countFieldErrorsForKeys(props.fieldErrors, structuralFieldKeys()),
	);
	const hasHeader = createMemo(
		() => Boolean(label() || summary()) || errorCount() > 0,
	);

	// -------------------------------
	// Render
	return (
		<div
			class={classNames(
				"w-full overflow-hidden rounded-md border border-border bg-card-base",
				{
					"border-error-base/50": errorCount() > 0,
				},
			)}
			aria-invalid={errorCount() > 0}
		>
			<Show when={hasHeader()}>
				<div
					class={classNames(
						"flex items-start justify-between gap-3 bg-input-base px-3 py-2.5",
						{
							"bg-linear-to-r from-error-base/10 to-input-base":
								errorCount() > 0,
						},
					)}
				>
					<div class="min-w-0">
						<Show when={label()}>
							<h3 class="text-sm font-medium text-subtitle">{label()}</h3>
						</Show>
						<Show when={summary()}>
							<p class="text-sm text-unfocused mt-0.5">{summary()}</p>
						</Show>
					</div>
					<FieldErrorBadge count={errorCount()} />
				</div>
			</Show>
			<div
				class={classNames(
					"w-full bg-card-base p-3 md:p-4 grid grid-cols-12 gap-4",
					{
						"border-t border-border": hasHeader(),
					},
				)}
			>
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
