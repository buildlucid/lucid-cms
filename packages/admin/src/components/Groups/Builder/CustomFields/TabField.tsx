import { type Component, createMemo } from "solid-js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "@types";
import classNames from "classnames";
import brickStore from "@/store/brickStore";
import helpers from "@/utils/helpers";

export const TabField: Component<{
	tab: TabFieldConfig;
	setActiveTab: (key: string) => void;
	getActiveTab: () => string | undefined;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const childrenKeys = createMemo(() => {
		const fieldKeys: string[] = [];

		const recursiveFieldSearch = (fields: CFConfig<FieldTypes>[]) => {
			for (const field of fields) {
				if (field.type === "tab") {
					recursiveFieldSearch(field.fields);
				} else if (field.type === "repeater") {
					recursiveFieldSearch(field.fields);
				} else {
					fieldKeys.push(field.key);
				}
			}
		};
		recursiveFieldSearch(props.tab.fields);
		return fieldKeys;
	});
	const hasChildrenError = createMemo(() => {
		return childrenKeys().some((key) =>
			brickStore.get.fieldsErrors.find((f) => f.key === key),
		);
	});

	// ----------------------------------------
	// Render
	return (
		<button
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
