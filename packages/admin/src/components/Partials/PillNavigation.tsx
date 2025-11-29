import classNames from "classnames";
import { type Component, For } from "solid-js";

export interface PillNavigationItem {
	label: string;
	active?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	show?: boolean;
}

export const PillNavigation: Component<{
	items: PillNavigationItem[];
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div class="inline-flex items-stretch rounded-md bg-input-base border-border border">
			<For each={props.items.filter((item) => item.show ?? true)}>
				{(item, index) => (
					<button
						type="button"
						class={classNames(
							"px-3 h-9 text-sm font-medium flex items-center justify-center transition-colors -ml-px first:ml-0 first:rounded-l-md last:rounded-r-md",
							{
								"bg-secondary-base text-secondary-contrast hover:text-secondary-contrast":
									item.active,
								"bg-input-base text-body hover:bg-secondary-hover hover:text-secondary-contrast":
									!item.active && !item.disabled,
								"opacity-60 cursor-not-allowed hover:text-body": item.disabled,
							},
						)}
						disabled={item.disabled}
						onClick={() => {
							if (item.disabled) {
								return;
							}
							item.onClick?.();
						}}
						data-index={index()}
					>
						{item.label}
					</button>
				)}
			</For>
		</div>
	);
};
