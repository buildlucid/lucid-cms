import classNames from "classnames";
import { type Component, createMemo, createUniqueId, For } from "solid-js";
import Select from "@/components/Select/Select";
import T from "@/translations";

export interface DrawerTabItem<T extends string = string> {
	value: T;
	label: string;
	/** Marks the tab when one of its fields has failed validation. */
	hasError?: boolean;
	/** @default true */
	show?: boolean;
}

export interface DrawerTabsProps<T extends string = string> {
	items: DrawerTabItem<T>[];
	active: T;
	onChange: (_value: T) => void;
	class?: string;
}

/**
 * Splits a drawer's content into sections. Shows a row of tabs on wide
 * screens and a select on narrow ones.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Tabs
 * 		items={[
 * 			{ value: "details", label: "Details" },
 * 			{ value: "permissions", label: "Permissions", hasError: hasErrors() },
 * 		]}
 * 		active={tab()}
 * 		onChange={setTab}
 * 	/>
 * );
 * ```
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
		visibleItems().find((item) => item.value === props.active),
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
					value={props.active}
					onChange={(value) => {
						if (typeof value === "string") props.onChange(value);
					}}
					options={visibleItems()}
					aria-label={T()("common.section")}
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
