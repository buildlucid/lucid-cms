import { Menubar } from "@kobalte/core";
import { A } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidChevronRight, FaSolidEllipsisVertical } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import ActionIcon, { type ActionIconName } from "./ActionIcon";
import Spinner from "./Spinner";

export interface ActionMenubarItem {
	label: string;
	type?: "button" | "link" | "group";
	icon?: ActionIconName;
	onClick?: () => void;
	href?: string;
	actions?: ActionMenubarItem[];
	permission?: boolean;
	hide?: boolean;
	disabled?: boolean;
	disabledToast?: {
		title: string;
		message?: string;
		status?: "success" | "error" | "warning" | "info";
		duration?: number;
	};
	isLoading?: boolean;
	theme?: "error" | "primary";
}

export interface ActionMenubarProps {
	actions: ActionMenubarItem[];
	options?: {
		border?: boolean;
		placement?: "bottom-end" | "bottom-start";
		raised?: boolean;
	};
}

const filterVisibleActions = (
	actions: ActionMenubarItem[],
): ActionMenubarItem[] =>
	actions
		.filter((action) => action.hide !== true)
		.map((action) => ({
			...action,
			actions: action.actions
				? filterVisibleActions(action.actions)
				: undefined,
		}))
		.filter(
			(action) => action.actions === undefined || action.actions.length > 0,
		);

// ----------------------------------------
// Classes
const getActionItemClasses = (action: ActionMenubarItem) =>
	classNames(
		"flex items-center gap-2 px-2 rounded-md hover:bg-dropdown-hover w-full text-sm text-left py-1 hover:text-dropdown-contrast fill-dropdown-contrast outline-none cursor-pointer",
		{
			"cursor-not-allowed": action.permission === false,
			"opacity-50 cursor-not-allowed": action.disabled === true,
			"hover:bg-error-hover hover:text-error-contrast":
				action.theme === "error" && action.disabled !== true,
			"hover:bg-primary-base hover:text-primary-contrast":
				action.theme === "primary" && action.disabled !== true,
		},
	);

const ActionMenubar: Component<ActionMenubarProps> = (props) => {
	// ----------------------------------------
	// State
	const [openMenu, setOpenMenu] = createSignal<string | null>(null);
	const menuId = createUniqueId();

	// ----------------------------------------
	// Memos
	const visibleActions = createMemo(() => filterVisibleActions(props.actions));

	// ----------------------------------------
	// Functions
	const spawnDisabledToast = (action: ActionMenubarItem) => {
		if (!action.disabledToast) return;

		spawnToast({
			...action.disabledToast,
			status: action.disabledToast.status ?? "warning",
		});
	};
	const handleSelect = (action: ActionMenubarItem) => {
		if (action.permission === false) {
			spawnToast({
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
				status: "warning",
			});
			return;
		}
		if (action.disabled === true) {
			spawnDisabledToast(action);
			return;
		}

		action.onClick?.();
		setOpenMenu(null);
	};

	// ----------------------------------------
	// Render
	if (visibleActions().length === 0) return null;

	return (
		<Menubar.Root
			value={openMenu()}
			onValueChange={(value) => setOpenMenu(value ?? null)}
			class="pointer-events-auto"
		>
			<Menubar.Menu
				value={menuId}
				placement={props.options?.placement ?? "bottom-start"}
			>
				<Menubar.Trigger
					onClick={(e) => {
						e.stopPropagation();
					}}
					class={classNames(
						"dropdown-trigger pointer-events-auto min-w-7 w-7 h-7 bg-input-base border border-border outline-none ring-0 focus-visible:ring-1 focus:ring-primary-base rounded-md flex justify-center items-center hover:bg-background-hover",
						{
							"border border-border": props.options?.border,
						},
					)}
				>
					<span class="sr-only">{T()("common.actions.options.show")}</span>
					<Menubar.Icon>
						<FaSolidEllipsisVertical class="text-subtitle pointer-events-none" />
					</Menubar.Icon>
				</Menubar.Trigger>

				<Menubar.Portal>
					<Menubar.Content
						class={classNames(
							"bg-dropdown-base border border-border shadow-md animate-animate-dropdown focus:outline-hidden scrollbar rounded-md w-50 p-1.5 mt-2",
							{
								"z-40": props.options?.raised,
								"z-60": props.options?.raised !== true,
							},
						)}
					>
						<ActionList actions={visibleActions()} onSelect={handleSelect} />
					</Menubar.Content>
				</Menubar.Portal>
			</Menubar.Menu>
		</Menubar.Root>
	);
};

const ActionList: Component<{
	actions: ActionMenubarItem[];
	onSelect: (action: ActionMenubarItem) => void;
}> = (props) => {
	return (
		<ul class="flex flex-col gap-y-1">
			<For each={props.actions}>
				{(action) => (
					<li
						class={classNames(
							"flex border-b border-border last:border-b-0 pb-1 last:pb-0",
							{
								"opacity-50": action.permission === false,
							},
						)}
					>
						<Show
							when={action.actions && action.actions.length > 0}
							fallback={
								<ActionItem action={action} onSelect={props.onSelect} />
							}
						>
							<Menubar.Sub>
								<Menubar.SubTrigger
									textValue={action.label}
									onClick={(e) => {
										e.stopPropagation();
									}}
									class={getActionItemClasses(action)}
								>
									<ActionIcon icon={action.icon} />
									<span class="line-clamp-1 mr-2.5 flex-1">{action.label}</span>
									<FaSolidChevronRight size={14} />
								</Menubar.SubTrigger>
								<Menubar.Portal>
									<Menubar.SubContent class="bg-dropdown-base border border-border shadow-md animate-animate-dropdown focus:outline-hidden scrollbar rounded-md w-50 p-1.5 z-60 ml-1">
										<ActionList
											actions={action.actions ?? []}
											onSelect={props.onSelect}
										/>
									</Menubar.SubContent>
								</Menubar.Portal>
							</Menubar.Sub>
						</Show>
					</li>
				)}
			</For>
		</ul>
	);
};

const ActionItem: Component<{
	action: ActionMenubarItem;
	onSelect: (action: ActionMenubarItem) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const closeOnSelect = createMemo(
		() =>
			props.action.permission !== false &&
			props.action.disabled !== true &&
			props.action.isLoading !== true,
	);

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.action.type === "link"}>
				<Menubar.Item
					as={A}
					href={props.action.href || "/"}
					textValue={props.action.label}
					closeOnSelect={closeOnSelect()}
					onSelect={() => props.onSelect(props.action)}
					onClick={(e) => {
						e.stopPropagation();
					}}
					class={getActionItemClasses(props.action)}
				>
					<ActionIcon icon={props.action.icon} />
					<span class="line-clamp-1 mr-2.5 flex-1">{props.action.label}</span>
					<Show when={props.action.isLoading}>
						<Spinner size="sm" />
					</Show>
				</Menubar.Item>
			</Match>
			<Match when={props.action.type !== "link"}>
				<Menubar.Item
					textValue={props.action.label}
					closeOnSelect={closeOnSelect()}
					onSelect={() => props.onSelect(props.action)}
					onClick={(e) => {
						e.stopPropagation();
					}}
					class={getActionItemClasses(props.action)}
				>
					<ActionIcon icon={props.action.icon} />
					<span class="line-clamp-1 mr-2.5 flex-1">{props.action.label}</span>
					<Show when={props.action.isLoading}>
						<Spinner size="sm" />
					</Show>
				</Menubar.Item>
			</Match>
		</Switch>
	);
};

export default ActionMenubar;
