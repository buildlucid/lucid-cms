import { SegmentedControl as KobSegmentedControl } from "@kobalte/core/segmented-control";
import classNames from "classnames";
import { For, type JSXElement, Show } from "solid-js";

export type SegmentedControlOption<T extends string> = {
	value: T;
	/** Names the segment for screen readers and its tooltip, as segments only show their icon. */
	label: string;
	icon: JSXElement;
};

/**
 * Icon radio group with arrow-key navigation. Values without a matching segment leave all segments
 * unselected.
 */
const SegmentedControl = <T extends string>(props: {
	label: string;
	value: T | undefined;
	options: SegmentedControlOption<T>[];
	onChange: (value: T) => void;
	class?: string;
}) => {
	// ----------------------------------------
	// Functions
	const select = (value: string) => {
		const option = props.options.find((item) => item.value === value);
		if (option) props.onChange(option.value);
	};

	// ----------------------------------------
	// Render
	return (
		<KobSegmentedControl
			aria-label={props.label}
			value={props.value ?? ""}
			onChange={select}
			orientation="horizontal"
			class={classNames(
				"relative flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
				props.class,
			)}
		>
			<Show when={props.options.some((option) => option.value === props.value)}>
				<KobSegmentedControl.Indicator class="absolute left-0.5 rounded-sm bg-background shadow-xs inset-ring inset-ring-border transition-[transform,width] duration-200 ease-out dark:bg-input dark:shadow-none dark:inset-ring-0" />
			</Show>
			<For each={props.options}>
				{(option) => (
					<KobSegmentedControl.Item
						value={option.value}
						title={option.label}
						class="relative z-10 h-full w-7 rounded-sm text-icon transition-colors duration-200 hover:text-icon-hover has-[input:focus-visible]:ring-1 has-[input:focus-visible]:ring-primary data-checked:text-title"
					>
						<KobSegmentedControl.ItemInput />
						<KobSegmentedControl.ItemLabel class="flex size-full cursor-pointer items-center justify-center">
							<span aria-hidden="true" class="flex">
								{option.icon}
							</span>
							<span class="sr-only">{option.label}</span>
						</KobSegmentedControl.ItemLabel>
					</KobSegmentedControl.Item>
				)}
			</For>
		</KobSegmentedControl>
	);
};

export default SegmentedControl;
