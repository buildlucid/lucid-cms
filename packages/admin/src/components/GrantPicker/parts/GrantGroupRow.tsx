import classnames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { GrantGroup } from "../GrantPicker";

export const GrantGroupRow: Component<{
	id: string;
	group: GrantGroup;
	value: string[];
	onChange: (_value: string[]) => void;
	/** Keeps the group open, such as while filtering. */
	forceOpen?: boolean;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const name = createMemo(() =>
		helpers.getLocaleValue({
			value: props.group.details.name,
			fallback: props.group.key,
		}),
	);
	const selectedCount = createMemo(
		() =>
			props.group.grants.filter((grant) => props.value.includes(grant.key))
				.length,
	);
	const allSelected = createMemo(
		() => selectedCount() === props.group.grants.length,
	);
	const summary = createMemo(() => {
		if (selectedCount() === 0) return T()("common.none");
		if (allSelected()) return T()("common.all");
		return T()("access.selected.count", {
			count: selectedCount(),
			total: props.group.grants.length,
		});
	});
	const isOpen = createMemo(() => open() || props.forceOpen === true);

	// ----------------------------------------
	// Functions
	const toggleGroup = () => {
		const keys = props.group.grants.map((grant) => grant.key);
		if (allSelected()) {
			props.onChange(props.value.filter((key) => !keys.includes(key)));
			return;
		}
		props.onChange([...new Set([...props.value, ...keys])]);
	};
	const toggleGrant = (key: string) => {
		props.onChange(
			props.value.includes(key)
				? props.value.filter((value) => value !== key)
				: [...props.value, key],
		);
	};

	// ----------------------------------------
	// Render
	return (
		<li>
			<div class="flex items-center gap-3 px-3">
				<Checkbox
					id={`${props.id}-${props.group.key}`}
					value={allSelected()}
					indeterminate={selectedCount() > 0 && !allSelected()}
					onChange={toggleGroup}
					disabled={props.disabled}
					aria-label={name()}
				/>
				<button
					type="button"
					class="flex min-w-0 grow items-center gap-3 py-2.5 text-left"
					aria-expanded={isOpen()}
					disabled={props.forceOpen}
					onClick={() => setOpen((open) => !open)}
				>
					<span class="min-w-0 grow truncate text-sm text-title">{name()}</span>
					<span class="shrink-0 text-xs text-muted">{summary()}</span>
					<FaSolidChevronDown
						size={10}
						class={classnames("shrink-0 text-muted transition-transform", {
							"rotate-180": isOpen(),
						})}
					/>
				</button>
			</div>
			<Show when={isOpen()}>
				<div class="px-3 pb-3 ps-11">
					<Show when={props.group.details.description}>
						{(description) => (
							<p class="mb-3 text-xs text-subtitle">
								{helpers.getLocaleValue({ value: description() })}
							</p>
						)}
					</Show>
					<div class="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
						<For each={props.group.grants}>
							{(grant) => (
								<Checkbox
									id={`${props.id}-${props.group.key}-${grant.key}`}
									value={props.value.includes(grant.key)}
									onChange={() => toggleGrant(grant.key)}
									label={helpers.getLocaleValue({
										value: grant.details.name,
										fallback: grant.key,
									})}
									tooltip={
										helpers.getLocaleValue({
											value: grant.details.description,
										}) || undefined
									}
									disabled={props.disabled}
								/>
							)}
						</For>
					</div>
				</div>
			</Show>
		</li>
	);
};
