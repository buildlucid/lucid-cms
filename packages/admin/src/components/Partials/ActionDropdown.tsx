import { DropdownMenu } from "@kobalte/core";
import { A } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidChevronRight, FaSolidEllipsisVertical } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import ActionIcon, { type ActionIconName } from "./ActionIcon";
import Spinner from "./Spinner";

export interface ActionDropdownItem {
	label: string;
	type: "button" | "link" | "group";
	icon?: ActionIconName;
	onClick?: () => void;
	href?: string;
	actions?: ActionDropdownItem[];
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
	actionExclude?: boolean;
	theme?: "error" | "primary";
	sortOrder?: number;
}

export interface ActionDropdownProps {
	actions: ActionDropdownItem[];
	options?: {
		border?: boolean;
		placement?: "bottom-end" | "bottom-start";
		raised?: boolean;
	};
}

const DANGEROUS_ACTION_LABEL_MATCHER =
	/\b(delete|remove|clear|purge|revoke|disconnect)\b/i;
const PRIMARY_ACTION_LABEL_MATCHER =
	/\b(restore|publish|enable|approve|resend|activate)\b/i;
const EDIT_ACTION_LABEL_MATCHER = /\b(edit|update)\b/i;

const getActionTheme = (
	action: ActionDropdownItem,
): ActionDropdownItem["theme"] => {
	if (action.theme) return action.theme;

	if (DANGEROUS_ACTION_LABEL_MATCHER.test(action.label)) return "error";
	if (PRIMARY_ACTION_LABEL_MATCHER.test(action.label)) return "primary";

	return undefined;
};

const getActionSortWeight = (action: ActionDropdownItem): number => {
	if (action.sortOrder !== undefined) return action.sortOrder;

	if (EDIT_ACTION_LABEL_MATCHER.test(action.label)) return 0;

	const theme = getActionTheme(action);

	if (theme === "error") return 3;
	if (theme === "primary") return 2;

	return 1;
};

const getVisibleActions = (
	actions: ActionDropdownItem[],
): ActionDropdownItem[] =>
	actions
		.map((action, index) => ({
			action: {
				...action,
				actions: action.actions ? getVisibleActions(action.actions) : undefined,
			},
			index,
		}))
		.filter(
			({ action }) =>
				action.hide !== true &&
				(action.actions === undefined || action.actions.length > 0),
		)
		.sort((a, b) => {
			const weightDiff =
				getActionSortWeight(a.action) - getActionSortWeight(b.action);

			if (weightDiff !== 0) return weightDiff;

			return a.index - b.index;
		})
		.map(({ action }) => action);

const getActionItemClasses = (action: ActionDropdownItem) =>
	classNames(
		"flex items-center gap-2 px-2 rounded-md hover:bg-dropdown-hover w-full text-sm text-left py-1 hover:text-dropdown-contrast fill-dropdown-contrast outline-none cursor-pointer",
		{
			"cursor-not-allowed": action.permission === false,
			"opacity-50 cursor-not-allowed": action.disabled === true,
			"hover:bg-error-hover hover:text-error-contrast":
				getActionTheme(action) === "error" && action.disabled !== true,
			"hover:bg-primary-base hover:text-primary-contrast":
				getActionTheme(action) === "primary" && action.disabled !== true,
		},
	);

const ActionDropdown: Component<ActionDropdownProps> = (props) => {
	// ----------------------------------------
	// State
	const [isOpen, setIsOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const visibleActions = createMemo(() => getVisibleActions(props.actions));

	// ----------------------------------------
	// Functions
	const handleSelect = (action: ActionDropdownItem) => {
		if (action.permission === false) {
			spawnToast({
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message"),
				status: "warning",
			});
			return;
		}
		if (action.disabled === true) {
			if (action.disabledToast) {
				spawnToast({
					...action.disabledToast,
					status: action.disabledToast.status ?? "warning",
				});
			}
			return;
		}

		action.onClick?.();
		setIsOpen(false);
	};

	// ----------------------------------------
	// Render
	if (visibleActions().length === 0) return null;

	return (
		<DropdownMenu.Root
			placement={props.options?.placement}
			open={isOpen()}
			onOpenChange={setIsOpen}
		>
			<DropdownMenu.Trigger
				onClick={(event) => event.stopPropagation()}
				class={classNames(
					"dropdown-trigger pointer-events-auto min-w-7 w-7 h-7 bg-input-base border border-border outline-none ring-0 focus-visible:ring-1 focus:ring-primary-base rounded-md flex justify-center items-center hover:bg-background-hover",
					{
						"border border-border": props.options?.border,
					},
				)}
			>
				<span class="sr-only">{T()("common.actions.options.show")}</span>
				<DropdownMenu.Icon>
					<FaSolidEllipsisVertical class="text-subtitle pointer-events-none" />
				</DropdownMenu.Icon>
			</DropdownMenu.Trigger>

			<DropdownContent
				options={{
					class: "w-[200px] p-1.5! z-60",
					rounded: true,
					raised: props.options?.raised,
				}}
			>
				<ActionList actions={visibleActions()} onSelect={handleSelect} />
			</DropdownContent>
		</DropdownMenu.Root>
	);
};

const ActionList: Component<{
	actions: ActionDropdownItem[];
	onSelect: (action: ActionDropdownItem) => void;
}> = (props) => (
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
						fallback={<ActionItem action={action} onSelect={props.onSelect} />}
					>
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger
								textValue={action.label}
								onClick={(event) => event.stopPropagation()}
								class={getActionItemClasses(action)}
							>
								<ActionIcon icon={action.icon} />
								<span class="line-clamp-1 mr-2.5 flex-1">{action.label}</span>
								<FaSolidChevronRight size={14} />
							</DropdownMenu.SubTrigger>
							<DropdownMenu.Portal>
								<DropdownMenu.SubContent class="bg-dropdown-base border border-border shadow-md animate-animate-dropdown focus:outline-hidden scrollbar rounded-md w-50 p-1.5 z-60 ml-1">
									<ActionList
										actions={action.actions ?? []}
										onSelect={props.onSelect}
									/>
								</DropdownMenu.SubContent>
							</DropdownMenu.Portal>
						</DropdownMenu.Sub>
					</Show>
				</li>
			)}
		</For>
	</ul>
);

const ActionItem: Component<{
	action: ActionDropdownItem;
	onSelect: (action: ActionDropdownItem) => void;
}> = (props) => {
	const closeOnSelect = createMemo(
		() =>
			props.action.permission !== false &&
			props.action.disabled !== true &&
			props.action.isLoading !== true,
	);

	return (
		<Switch>
			<Match when={props.action.type === "link"}>
				<DropdownMenu.Item
					as={A}
					href={props.action.href || "/"}
					textValue={props.action.label}
					closeOnSelect={closeOnSelect()}
					onSelect={() => props.onSelect(props.action)}
					onClick={(event) => {
						event.stopPropagation();
						if (
							props.action.permission === false ||
							props.action.disabled === true
						) {
							event.preventDefault();
						}
					}}
					class={getActionItemClasses(props.action)}
				>
					<ActionIcon icon={props.action.icon} />
					<span class="line-clamp-1 mr-2.5 flex-1">{props.action.label}</span>
					<Show when={props.action.isLoading}>
						<Spinner size="sm" />
					</Show>
				</DropdownMenu.Item>
			</Match>
			<Match when={props.action.type !== "link"}>
				<DropdownMenu.Item
					textValue={props.action.label}
					closeOnSelect={closeOnSelect()}
					onSelect={() => props.onSelect(props.action)}
					onClick={(event) => event.stopPropagation()}
					class={getActionItemClasses(props.action)}
				>
					<ActionIcon icon={props.action.icon} />
					<span class="line-clamp-1 mr-2.5 flex-1">{props.action.label}</span>
					<Show when={props.action.isLoading}>
						<Spinner size="sm" />
					</Show>
				</DropdownMenu.Item>
			</Match>
		</Switch>
	);
};

export default ActionDropdown;
