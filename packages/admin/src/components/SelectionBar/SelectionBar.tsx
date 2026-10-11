import { TbOutlineX } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import Button, { type ButtonVariant } from "@/components/Button/Button";
import SplitButton from "@/components/SplitButton/SplitButton";
import T from "@/translations";

export interface SelectionBarAction {
	label: string;
	icon: ActionIconName;
	/** @default "outline" */
	variant?: ButtonVariant;
	onSelect: () => void;
}

/** Shows selection controls at the page bottom, with a clear button, the first action as a button and remaining actions in its menu. */
const SelectionBar: Component<{
	/** What is selected, eg. "3 items". */
	count: string;
	actions: SelectionBarAction[];
	onClear: () => void;
	loading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const main = createMemo(() => props.actions[0]);
	//* the main button's variant only makes sense for the menu's danger items
	const menu = createMemo(() =>
		props.actions.slice(1).map((action) => ({
			label: action.label,
			icon: <ActionIcon icon={action.icon} />,
			onSelect: action.onSelect,
			variant: action.variant === "danger" ? ("danger" as const) : undefined,
		})),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="fixed bottom-4 md:bottom-6 left-0 md:left-sidebar right-agent-panel flex justify-center items-center z-36 pointer-events-none px-4">
			<div class="pointer-events-auto flex w-full max-w-100 items-center justify-between gap-3 rounded-md border border-border bg-card p-2">
				<div class="flex min-w-0 items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						shape="square"
						onClick={() => props.onClear()}
						aria-label={T()("common.reset")}
						title={T()("common.reset")}
					>
						<TbOutlineX size={12} />
					</Button>
					<p class="truncate text-sm">
						<span class="font-bold">{props.count}</span>{" "}
						{T()("common.selected")}
					</p>
				</div>
				<Show when={main()}>
					{(action) => (
						<Show
							when={menu().length > 0}
							fallback={
								<Button
									variant={action().variant ?? "outline"}
									size="sm"
									loading={props.loading}
									onClick={() => action().onSelect()}
								>
									{action().label}
								</Button>
							}
						>
							<SplitButton
								label={action().label}
								variant={action().variant ?? "outline"}
								size="sm"
								loading={props.loading}
								onClick={() => action().onSelect()}
								actions={menu()}
							/>
						</Show>
					)}
				</Show>
			</div>
		</div>
	);
};

export default SelectionBar;
