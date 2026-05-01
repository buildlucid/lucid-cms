import classNames from "classnames";
import { type Component, For } from "solid-js";

export interface PanelTabItem<T extends string = string> {
	value: T;
	label: string;
	hasError?: boolean;
	show?: boolean;
}

interface PanelTabsProps<T extends string = string> {
	items: PanelTabItem<T>[];
	active: T;
	onChange: (_value: T) => void;
	class?: string;
}

const PanelTabs: Component<PanelTabsProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div class={classNames("mt-6 border-b border-border mb-4", props.class)}>
			<div class="flex flex-row flex-wrap items-center gap-4">
				<For each={props.items.filter((item) => item.show ?? true)}>
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

export default PanelTabs;
