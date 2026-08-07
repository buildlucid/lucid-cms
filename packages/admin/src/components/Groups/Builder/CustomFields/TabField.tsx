import type { FieldError } from "@types";
import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import {
	type AnimatedTabItem,
	AnimatedTabs,
} from "@/components/Partials/AnimatedTabs";
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
	tabs: CollectionFieldConfigByType<"tab">[];
	setActiveTab: (key: string) => void;
	getActiveTab: () => string | undefined;
	fieldErrors: FieldError[];
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const fieldRenderState = useFieldRenderState();

	// ----------------------------------------
	// Memos
	const items = createMemo<AnimatedTabItem[]>(() =>
		props.tabs.map((tab) => {
			const errorCount = countFieldErrorsForKeys(
				props.fieldErrors,
				getStructuralFieldKeys(tab.fields),
			);
			return {
				key: tab.key,
				id: getPreviewStructureId({
					brickIndex: fieldRenderState.brickIndex(),
					type: "tab",
					key: tab.key,
					pathPrefix: [],
				}),
				label: (
					<>
						{helpers.getLocaleValue({ value: tab.details?.label })}
						<FieldErrorBadge count={errorCount} compact />
					</>
				),
				previewFocusOpen: props.getActiveTab() === tab.key,
				class: classNames("gap-1.5 px-2.5 py-1.5", {
					"border border-transparent": errorCount === 0,
					"border border-error-base/50 bg-error-base/5 focus-visible:ring-error-base!":
						errorCount > 0,
				}),
			};
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<AnimatedTabs
			items={items()}
			activeKey={props.getActiveTab()}
			onSelect={props.setActiveTab}
			class={props.class}
			listClass="gap-1"
			indicatorClass="shadow-xs"
			fullWidth={true}
		/>
	);
};
