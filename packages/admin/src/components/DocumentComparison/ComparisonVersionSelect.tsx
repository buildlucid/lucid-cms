import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import Menu from "@/components/Menu/Menu";
import type { ComparisonOption } from "@/hooks/useDocumentComparison/useDocumentComparison";

/**
 * A ghost version picker for a side-by-side column. Versions without content,
 * and the one open in the other column, are listed but can't be picked.
 */
const ComparisonVersionSelect: Component<{
	label: string;
	placeholder: string;
	options: ComparisonOption[];
	value: string | undefined;
	/** The version open in the other column. */
	otherValue: string | undefined;
	onSelect: (option: ComparisonOption) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const selected = createMemo(() =>
		props.options.find((option) => option.key === props.value),
	);

	// ----------------------------------------
	// Render
	return (
		<Menu.Root>
			<Menu.Trigger
				class="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm text-title transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
				aria-label={props.label}
			>
				<span class="truncate">{selected()?.label ?? props.placeholder}</span>
				<FaSolidChevronDown size={9} class="shrink-0 text-icon" />
			</Menu.Trigger>
			<Menu.Content class="w-72">
				<For each={props.options}>
					{(option) => (
						<Menu.Item
							disabled={
								option.versionId === null || option.key === props.otherValue
							}
							selected={option.key === props.value}
							onSelect={() => {
								if (option.key !== props.value) props.onSelect(option);
							}}
						>
							{option.label}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default ComparisonVersionSelect;
