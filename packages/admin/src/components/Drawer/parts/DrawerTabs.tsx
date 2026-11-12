import classNames from "classnames";
import {
	type Component,
	createMemo,
	createUniqueId,
	For,
	Show,
} from "solid-js";
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
 * Tabs for switching between sections of the drawer, which arrow keys move
 * between. Shown as a select on small screens.
 */
export const DrawerTabs: Component<DrawerTabsProps> = (props) => {
	// ----------------------------------
	// State
	const selectId = createUniqueId();
	const tabRefs: HTMLButtonElement[] = [];

	// ----------------------------------
	// Memos
	const visibleItems = createMemo(() =>
		props.items.filter((item) => item.show ?? true),
	);
	const activeItem = createMemo(() =>
		visibleItems().find((item) => item.value === props.value),
	);
	//* the first tab stays reachable when the selected one is hidden
	const focusableValue = createMemo(
		() => activeItem()?.value ?? visibleItems()[0]?.value,
	);

	// ----------------------------------
	// Functions
	//* arrow keys select the next tab, wrapping round, as tabs do
	const moveFocus = (event: KeyboardEvent, index: number) => {
		const count = visibleItems().length;
		const next = {
			ArrowRight: (index + 1) % count,
			ArrowLeft: (index - 1 + count) % count,
			Home: 0,
			End: count - 1,
		}[event.key];
		const item = next === undefined ? undefined : visibleItems()[next];
		if (next === undefined || !item) return;

		event.preventDefault();
		props.onChange(item.value);
		tabRefs[next]?.focus();
	};

	// ----------------------------------
	// Render
	return (
		<div
			data-drawer-tabs
			class={classNames("mt-3 md:border-b md:border-border", props.class)}
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
			<div
				role="tablist"
				class="hidden flex-row flex-wrap items-center gap-4 md:flex"
			>
				<For each={visibleItems()}>
					{(item, index) => (
						<button
							ref={(element) => {
								tabRefs[index()] = element;
							}}
							type="button"
							role="tab"
							aria-selected={props.value === item.value}
							//* only the selected tab is in the tab order; arrow keys reach the rest
							tabIndex={focusableValue() === item.value ? 0 : -1}
							class={classNames(
								"border-b-2 -mb-px text-sm font-medium pb-2 focus-ring-inset transition-colors",
								{
									"border-primary text-title": props.value === item.value,
									"border-transparent text-body hover:border-primary":
										props.value !== item.value && !item.invalid,
									"border-danger text-danger":
										props.value !== item.value && item.invalid,
								},
							)}
							onClick={() => props.onChange(item.value)}
							onKeyDown={(event) => moveFocus(event, index())}
						>
							{item.label}
							<Show when={item.invalid}>
								<span class="sr-only">{T()("common.errors")}</span>
							</Show>
						</button>
					)}
				</For>
			</div>
		</div>
	);
};
