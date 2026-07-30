import type { FieldError } from "@types";
import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import type { CollectionFieldConfigByType } from "@/types/collection-config";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";
import {
	countFieldErrorsForKeys,
	getStructuralFieldKeys,
} from "@/utils/structural-field-helpers";

export const TabField: Component<{
	tab: CollectionFieldConfigByType<"tab">;
	setActiveTab: (key: string) => void;
	getActiveTab: () => string | undefined;
	fieldErrors: FieldError[];
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// ----------------------------------------
	// Memos
	const structuralFieldKeys = createMemo(() =>
		getStructuralFieldKeys(props.tab.fields),
	);
	const errorCount = createMemo(() =>
		countFieldErrorsForKeys(props.fieldErrors, structuralFieldKeys()),
	);
	const triggerId = createMemo(() =>
		getPreviewStructureId({
			brickIndex: fieldRenderState.brickIndex(),
			type: "tab",
			key: props.tab.key,
			pathPrefix: [],
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<button
			id={triggerId()}
			data-preview-focus-open={props.getActiveTab() === props.tab.key}
			class={classNames(
				"inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-sm font-medium text-body transition-colors duration-200 hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 ring-inset",
				{
					"bg-input-base text-subtitle shadow-xs":
						props.getActiveTab() === props.tab.key,
					"border-transparent focus-visible:ring-primary-base":
						errorCount() === 0,
					"border-error-base/50 bg-error-base/5 focus-visible:ring-error-base!":
						errorCount() > 0,
				},
			)}
			onClick={() => props.setActiveTab(props.tab.key)}
			type="button"
		>
			{helpers.getLocaleValue({
				value: props.tab.details?.label,
			})}
			<FieldErrorBadge count={errorCount()} compact />
		</button>
	);
};
