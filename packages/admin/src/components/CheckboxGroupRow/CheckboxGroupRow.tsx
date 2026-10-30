import classnames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import T from "@/translations";

export interface CheckboxGroupRowItem {
	key: string;
	label: string;
	tooltip?: string;
	disabled?: boolean;
}

/** A labelled set of items shown below the row's own, which the row's checkbox and summary include. */
export interface CheckboxGroupRowSubgroup {
	key: string;
	label: string;
	items: CheckboxGroupRowItem[];
}

export interface CheckboxGroupRowProps {
	id: string;
	name: string;
	description?: string;
	items: CheckboxGroupRowItem[];
	subgroups?: CheckboxGroupRowSubgroup[];
	value: string[];
	onChange: (_value: string[]) => void;
	forceOpen?: boolean;
	disabled?: boolean;
}

const CheckboxGroupRow: Component<CheckboxGroupRowProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const selectable = createMemo(() =>
		[
			...props.items,
			...(props.subgroups ?? []).flatMap((subgroup) => subgroup.items),
		].filter((item) => !item.disabled),
	);
	const selectedCount = createMemo(
		() => selectable().filter((item) => props.value.includes(item.key)).length,
	);
	const allSelected = createMemo(
		() => selectable().length > 0 && selectedCount() === selectable().length,
	);
	const summary = createMemo(() => {
		if (selectedCount() === 0) return T()("common.none");
		if (allSelected()) return T()("common.all");
		return T()("access.selected.count", {
			count: selectedCount(),
			total: selectable().length,
		});
	});
	const isOpen = createMemo(() => open() || props.forceOpen === true);

	// ----------------------------------------
	// Functions
	const toggleGroup = () => {
		const keys = selectable().map((item) => item.key);
		if (allSelected()) {
			props.onChange(props.value.filter((key) => !keys.includes(key)));
			return;
		}
		props.onChange([...new Set([...props.value, ...keys])]);
	};
	const toggleItem = (key: string) => {
		props.onChange(
			props.value.includes(key)
				? props.value.filter((value) => value !== key)
				: [...props.value, key],
		);
	};
	const itemCheckbox = (item: CheckboxGroupRowItem) => (
		<Checkbox
			id={`${props.id}-${item.key}`}
			value={props.value.includes(item.key)}
			onChange={() => toggleItem(item.key)}
			label={item.label}
			tooltip={item.tooltip}
			disabled={props.disabled || item.disabled}
		/>
	);

	// ----------------------------------------
	// Render
	return (
		<li data-checkbox-group-row>
			<div class="flex items-center gap-3 px-4">
				<Checkbox
					id={props.id}
					value={allSelected()}
					indeterminate={selectedCount() > 0 && !allSelected()}
					onChange={toggleGroup}
					disabled={props.disabled || selectable().length === 0}
					aria-label={props.name}
				/>
				<button
					type="button"
					class="flex min-w-0 grow items-center gap-3 py-3 text-left"
					aria-expanded={isOpen()}
					disabled={props.forceOpen}
					onClick={() => setOpen((open) => !open)}
				>
					<span class="min-w-0 grow truncate text-sm text-title">
						{props.name}
					</span>
					<span class="shrink-0 text-xs text-muted">{summary()}</span>
					<TbOutlineChevronDown
						size={10}
						class={classnames("shrink-0 text-muted transition-transform", {
							"rotate-180": isOpen(),
						})}
					/>
				</button>
			</div>
			<Show when={isOpen()}>
				<div class="px-4 pt-1 pb-4 ps-12">
					<Show when={props.description}>
						{(description) => (
							<p class="mb-3 text-xs text-subtitle">{description()}</p>
						)}
					</Show>
					<Show when={props.items.length > 0}>
						<div class="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
							<For each={props.items}>{itemCheckbox}</For>
						</div>
					</Show>
					<For each={props.subgroups}>
						{(subgroup, index) => (
							<fieldset
								class={classnames("min-w-0", {
									"mt-4": props.items.length > 0 || index() > 0,
								})}
							>
								<legend class="mb-2.5 flex w-full items-center gap-3">
									<span class="shrink-0 text-xs font-medium text-subtitle">
										{subgroup.label}
									</span>
									<span aria-hidden="true" class="h-px grow bg-border" />
								</legend>
								<div class="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
									<For each={subgroup.items}>{itemCheckbox}</For>
								</div>
							</fieldset>
						)}
					</For>
				</div>
			</Show>
		</li>
	);
};

export default CheckboxGroupRow;
