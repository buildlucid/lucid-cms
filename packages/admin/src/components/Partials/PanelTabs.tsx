import classNames from "classnames";
import { type Component, createMemo, createUniqueId, For } from "solid-js";
import { Select } from "@/components/Groups/Form/Select";
import T from "@/translations";

export interface PanelTabItem<T extends string = string> {
	value: T;
	label: string;
	hasError?: boolean;
	show?: boolean;
}

interface PanelTabsProps<T extends string = string> {
	items: PanelTabItem<T>[];
	active: T;
	onChange: (_value: T) => void;
	class?: string;
}

const PanelTabs: Component<PanelTabsProps> = (props) => {
	// ----------------------------------
	// State
	const selectId = createUniqueId();

	// ----------------------------------
	// Memos
	const visibleItems = createMemo(() =>
		props.items.filter((item) => item.show ?? true),
	);
	const activeItem = createMemo(() =>
		visibleItems().find((item) => item.value === props.active),
	);

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames("mt-6 mb-4 md:border-b md:border-border", props.class)}
		>
			<div class="md:hidden">
				<Select
					id={`panel-tabs-${selectId}`}
					name={`panel-tabs-${selectId}`}
					value={props.active}
					onChange={(value) => {
						if (typeof value === "string") props.onChange(value);
					}}
					options={visibleItems()}
					noMargin
					noClear
					hideOptionalText
					ariaLabel={T()("common.section")}
					hasError={activeItem()?.hasError}
					renderValue={({ option }) => (
						<span
							class={classNames("truncate", {
								"text-error-base": option.hasError,
							})}
						>
							{option.label}
						</span>
					)}
					renderOption={({ option }) => (
						<span
							class={classNames({
								"text-error-base": option.hasError,
							})}
						>
							{option.label}
						</span>
					)}
				/>
			</div>
			<div class="hidden flex-row flex-wrap items-center gap-4 md:flex">
				<For each={visibleItems()}>
					{(item) => (
						<button
							type="button"
							class={classNames(
								"border-b-2 -mb-px text-sm font-medium pb-2 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary-base transition-colors duration-200",
								{
									"border-primary-base text-title": props.active === item.value,
									"border-transparent text-body hover:border-primary-base":
										props.active !== item.value && !item.hasError,
									"border-error-base text-error-base":
										props.active !== item.value && item.hasError,
								},
							)}
							onClick={() => props.onChange(item.value)}
						>
							{item.label}
						</button>
					)}
				</For>
			</div>
		</div>
	);
};

export default PanelTabs;
