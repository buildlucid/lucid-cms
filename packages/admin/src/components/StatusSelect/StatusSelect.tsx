import { TbOutlineChevronDown } from "solid-icons/tb";
import { createMemo, For, type JSXElement, Show } from "solid-js";
import Menu from "@/components/Menu/Menu";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";

export interface StatusSelectOption<T extends string> {
	value: T;
	label: string;
	indicator: StatusIndicatorVariant;
}

const pillClass =
	"flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs text-body";

/**
 * A compact status picker, such as a workflow stage. Shows the current
 * option with its indicator, and the same pill without a menu when it can't
 * be changed.
 */
const StatusSelect = <T extends string>(props: {
	value: T;
	options: StatusSelectOption<T>[];
	/** Names the picker and heads its menu. */
	label: string;
	editable: boolean;
	loading?: boolean;
	/** Shown on hover, eg. who last changed it. */
	title?: string;
	onChange: (value: T) => void;
}): JSXElement => {
	// ----------------------------------------
	// Memos
	const current = createMemo(() =>
		props.options.find((option) => option.value === props.value),
	);

	// ----------------------------------------
	// Functions
	const display = () => (
		<span class="flex min-w-0 items-center gap-2">
			<StatusIndicator variant={current()?.indicator ?? "neutral-subtle"} />
			<span class="truncate">{current()?.label ?? props.value}</span>
		</span>
	);

	// ----------------------------------------
	// Render
	return (
		<Show
			when={props.editable}
			fallback={
				<span class={pillClass} title={props.title}>
					{display()}
				</span>
			}
		>
			<Menu.Root placement="bottom-end">
				<Menu.Trigger
					class={`${pillClass} transition-colors hover:bg-card-hover hover:text-title focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-60`}
					disabled={props.loading}
					aria-label={props.label}
					title={props.title ?? props.label}
				>
					{display()}
					<TbOutlineChevronDown size={8} class="text-icon" />
				</Menu.Trigger>
				<Menu.Content>
					<Menu.Label>{props.label}</Menu.Label>
					<Menu.RadioGroup
						value={props.value}
						onChange={(value) => {
							const option = props.options.find(
								(option) => option.value === value,
							);
							if (option && option.value !== props.value) {
								props.onChange(option.value);
							}
						}}
					>
						<For each={props.options}>
							{(option) => (
								<Menu.RadioItem value={option.value}>
									<span class="flex min-w-0 items-center gap-2">
										<StatusIndicator variant={option.indicator} />
										<span class="truncate">{option.label}</span>
									</span>
								</Menu.RadioItem>
							)}
						</For>
					</Menu.RadioGroup>
				</Menu.Content>
			</Menu.Root>
		</Show>
	);
};

export default StatusSelect;
