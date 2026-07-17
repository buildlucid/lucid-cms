import type { FieldError } from "@types";
import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import { useFieldRenderState } from "@/hooks/document/useFieldRenderState";
import type {
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";

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
	const childrenKeys = createMemo(() => {
		const fieldKeys: string[] = [];

		const recursiveFieldSearch = (fields: CollectionFieldConfig[]) => {
			for (const field of fields) {
				if (field.type === "repeater") {
					fieldKeys.push(field.key);
				}

				if (
					field.type === "tab" ||
					field.type === "repeater" ||
					field.type === "section" ||
					field.type === "collapsible"
				) {
					recursiveFieldSearch(field.fields);
				} else {
					fieldKeys.push(field.key);
				}
			}
		};
		recursiveFieldSearch(props.tab.fields);
		return fieldKeys;
	});
	const childrenKeySet = createMemo(() => new Set(childrenKeys()));
	const hasChildrenError = createMemo(() => {
		return props.fieldErrors.some((fieldError) =>
			childrenKeySet().has(fieldError.key),
		);
	});
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
				"border-b border-border -mb-px text-sm font-medium py-1 px-2 first:pl-0 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary-base",
				{
					"border-primary-base": props.getActiveTab() === props.tab.key,
					"border-error-base": hasChildrenError(),
				},
			)}
			onClick={() => props.setActiveTab(props.tab.key)}
			type="button"
		>
			{helpers.getLocaleValue({
				value: props.tab.details?.label,
			})}
		</button>
	);
};
