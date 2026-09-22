import classNames from "classnames";
import { type Component, createMemo, createUniqueId, For } from "solid-js";
import Select from "@/components/Select/Select";
import T from "@/translations";

export interface DrawerTabItem<T extends string = string> {
	value: T;
	label: string;
	/** Shows the invalid style, such as when a field in the tab has errors. */
	invalid?: boolean;
	/** @default true */
	show?: boolean;
}

export interface DrawerTabsProps<T extends string = string> {
	items: DrawerTabItem<T>[];
	value: T;
	onChange: (_value: T) => void;
	class?: string;
}

/**
 * Tabs for switching between sections of the drawer. Shown as a select on small
 * screens.
 */
export const DrawerTabs: Component<DrawerTabsProps> = (props) => {
	// ----------------------------------
	// State
	const selectId = createUniqueId();

	// ----------------------------------
	// Memos
	const visibleItems = createMemo(() =>
		props.items.filter((item) => item.show ?? true),
	);
	const activeItem = createMemo(() =>
		visibleItems().find((item) => item.value === props.value),
	);

	// ----------------------------------
	// Render
	return (
		<div
			data-drawer-tabs
			class={classNames("md:border-b md:border-border", props.class)}
		>
			<div class="md:hidden">
				<Select
					id={`drawer-tabs-${selectId}`}
					name={`drawer-tabs-${selectId}`}
					value={props.value}
					onChange={(value) => {
						if (typeof value === "string") props.onChange(value);
					}}
					options={visibleItems()}
					aria-label={T()("common.section")}
					invalid={activeItem()?.invalid}
					renderValue={({ option }) => (
						<span
							class={classNames("truncate", {
								"text-danger": option.invalid,
							})}
						>
							{option.label}
						</span>
					)}
					renderOption={({ option }) => (
						<span
							class={classNames({
								"text-danger": option.invalid,
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
								"border-b-2 -mb-px text-sm font-medium pb-2 focus:outline-hidden ring-inset focus-visible:ring-1 ring-primary transition-colors duration-200",
								{
									"border-primary text-title": props.value === item.value,
									"border-transparent text-body hover:border-primary":
										props.value !== item.value && !item.invalid,
									"border-danger text-danger":
										props.value !== item.value && item.invalid,
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
