import {
	FaSolidCheck,
	FaSolidChevronUp,
	FaSolidRotateLeft,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, For } from "solid-js";
import Button from "@/components/Button/Button";
import type { HomeWidget } from "@/components/HomeWidgets/types";
import Menu from "@/components/Menu/Menu";
import T from "@/translations";

/**
 * Floats at the bottom of the overview while it is being customised: turn
 * widgets on or off, reset to the defaults, or finish.
 */
const HomeCustomizeBar: Component<{
	widgets: Array<{ widget: HomeWidget; hidden: boolean }>;
	onToggle: (key: string, shown: boolean) => void;
	onReset: () => void;
	onCancel: () => void;
	onDone: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		//* positioned like the table selection pill, as the page layout clips sticky
		<div class="pointer-events-none fixed right-0 bottom-4 left-0 z-40 flex items-center justify-center px-4 md:bottom-6 md:left-sidebar">
			<div class="pointer-events-auto flex items-center gap-1 rounded-md border border-border bg-card p-2">
				<Menu.Root placement="top">
					<Menu.Trigger class="flex h-9 items-center gap-2 rounded-md border border-border bg-input px-3 text-sm text-subtitle transition-colors hover:border-transparent hover:bg-secondary-hover hover:text-secondary-foreground focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary">
						{T()("home.customize.widgets")}
						<FaSolidChevronUp size={9} />
					</Menu.Trigger>
					<Menu.Content>
						<Menu.Label>{T()("home.customize.widgets.label")}</Menu.Label>
						<For each={props.widgets}>
							{(item) => (
								<Menu.CheckboxItem
									checked={!item.hidden}
									onChange={(checked) =>
										props.onToggle(item.widget.key, checked)
									}
								>
									{item.widget.label()}
								</Menu.CheckboxItem>
							)}
						</For>
					</Menu.Content>
				</Menu.Root>
				<span class="mx-1 h-5 w-px bg-border" aria-hidden="true" />
				<Button
					variant="ghost"
					size="sm"
					shape="square"
					aria-label={T()("home.customize.reset")}
					title={T()("home.customize.reset")}
					onClick={() => props.onReset()}
				>
					<FaSolidRotateLeft size={12} />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					shape="square"
					aria-label={T()("common.cancel")}
					title={T()("common.cancel")}
					onClick={() => props.onCancel()}
				>
					<FaSolidXmark size={14} />
				</Button>
				<Button
					variant="ghost"
					size="sm"
					shape="square"
					aria-label={T()("common.done")}
					title={T()("common.done")}
					onClick={() => props.onDone()}
				>
					<FaSolidCheck size={13} />
				</Button>
			</div>
		</div>
	);
};

export default HomeCustomizeBar;
