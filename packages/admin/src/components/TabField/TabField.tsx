import type { FieldError } from "@types";
import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import { FieldErrorBadge } from "@/components/FieldErrorBadge/FieldErrorBadge";
import Tabs, { type TabsItem } from "@/components/Tabs/Tabs";
import { useFieldRenderState } from "@/hooks/useFieldRenderState/useFieldRenderState";
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
	const items = createMemo<TabsItem[]>(() =>
		props.tabs.map((tab) => {
			const errorCount = countFieldErrorsForKeys(
				props.fieldErrors,
				getStructuralFieldKeys(tab.fields),
			);
			return {
				value: tab.key,
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
				class: classNames({
					"border border-transparent": errorCount === 0,
					"border border-danger-low-border bg-danger-low focus-visible:ring-danger!":
						errorCount > 0,
				}),
			};
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<Tabs.Root
			items={items()}
			value={props.getActiveTab()}
			onChange={props.setActiveTab}
			fullWidth={true}
			class={props.class}
		/>
	);
};
