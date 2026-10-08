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

export interface CheckboxGroupRowProps {
	id: string;
	name: string;
	description?: string;
	items: CheckboxGroupRowItem[];
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
		props.items.filter((item) => !item.disabled),
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
					<div class="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
						<For each={props.items}>
							{(item) => (
								<Checkbox
									id={`${props.id}-${item.key}`}
									value={props.value.includes(item.key)}
									onChange={() => toggleItem(item.key)}
									label={item.label}
									tooltip={item.tooltip}
									disabled={props.disabled || item.disabled}
								/>
							)}
						</For>
					</div>
				</div>
			</Show>
		</li>
	);
};

export default CheckboxGroupRow;
