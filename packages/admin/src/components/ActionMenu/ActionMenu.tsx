import classNames from "classnames";
import { TbOutlineDots, TbOutlineDotsVertical } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	Index,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import { getButtonClasses } from "@/components/Button/classes";
import Menu, {
	type MenuItemVariant,
	type MenuPlacement,
} from "@/components/Menu/Menu";
import T from "@/translations";
import {
	checkPermission,
	type PermissionRequirement,
	showNoPermissionToast,
} from "@/utils/permission-requirement";
import spawnToast from "@/utils/spawn-toast";

export type ActionMenuItemType = "button" | "link" | "group" | "checkbox";

export interface ActionMenuItem {
	label: string;
	type: ActionMenuItemType;
	icon?: ActionIconName;
	/** Whether a `checkbox` item is ticked. Choosing it runs `onClick` and keeps the menu open. */
	checked?: boolean;
	onClick?: () => void;
	href?: string;
	target?: "_blank" | "_self";
	rel?: string;
	/** Nested items, for the `group` type. A group with only one item shown shows that item instead. */
	actions?: ActionMenuItem[];
	/**
	 * Permission keys the user needs, or a boolean when access is checked
	 * elsewhere. Without permission, choosing the item shows a toast instead.
	 */
	permission?: PermissionRequirement;
	/** @default true */
	show?: boolean;
	disabled?: boolean;
	/** Shown when a disabled item is chosen. */
	disabledToast?: {
		title: string;
		message?: string;
		status?: "success" | "error" | "warning" | "info";
		duration?: number;
	};
	loading?: boolean;
	/** Stops a table row click from running this action. */
	excludeFromRowClick?: boolean;
	variant?: MenuItemVariant;
	/** Items are sorted lowest first. @default 0 */
	sortOrder?: number;
}

/** Matches the Button sizes: `xs` 28px, `sm` 32px, `md` 36px. */
export type ActionMenuSize = "xs" | "sm" | "md";

export type ActionMenuVariant = "outline" | "ghost" | "toolbar";

export interface ActionMenuProps {
	actions: ActionMenuItem[];
	/** @default "xs" */
	size?: ActionMenuSize;
	/** `ghost` drops the trigger's background and border, like the ghost button; `toolbar` matches the toolbar button, for headers. @default "outline" */
	variant?: ActionMenuVariant;
	/** Which way the trigger's dots run. @default "vertical" */
	orientation?: "vertical" | "horizontal";
	placement?: MenuPlacement;
	/** Applied to the trigger button. */
	class?: string;
}

/**
 * Shown actions in order. Groups left empty are dropped, and a group with one item left shows that
 * item in its place.
 */
const getVisibleActions = (actions: ActionMenuItem[]): ActionMenuItem[] =>
	actions
		.filter((action) => action.show !== false)
		.map((action, index) => {
			const children = action.actions
				? getVisibleActions(action.actions)
				: undefined;
			const onlyChild = children?.length === 1 ? children[0] : undefined;

			return {
				action: onlyChild
					? { ...onlyChild, sortOrder: action.sortOrder }
					: { ...action, actions: children },
				index,
			};
		})
		.filter(
			({ action }) => action.actions === undefined || action.actions.length > 0,
		)
		.sort((a, b) => {
			const orderDiff = (a.action.sortOrder ?? 0) - (b.action.sortOrder ?? 0);

			if (orderDiff !== 0) return orderDiff;

			return a.index - b.index;
		})
		.map(({ action }) => action);

/** A menu of actions behind a "more options" button. */
const ActionMenu: Component<ActionMenuProps> = (props) => {
	// ----------------------------------------
	// Memos
	const visibleActions = createMemo(() => getVisibleActions(props.actions));
	const size = createMemo(() => props.size ?? "xs");

	// ----------------------------------------
	// Functions
	const handleSelect = (action: ActionMenuItem) => {
		const access = checkPermission(action.permission);
		if (!access.permitted) {
			showNoPermissionToast(access.missing);
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
	};

	// ----------------------------------------
	// Render
	return (
		<Show when={visibleActions().length > 0}>
			<Menu.Root placement={props.placement}>
				<Menu.Trigger
					data-action-menu
					onClick={(event) => event.stopPropagation()}
					class={classNames(
						"pointer-events-auto",
						props.variant === "toolbar"
							? getButtonClasses({
									variant: "toolbar",
									size: size(),
									shape: "square",
								})
							: {
									"focus-ring rounded-md flex justify-center items-center transition-colors": true,
									"bg-input border border-border hover:bg-background-hover":
										props.variant !== "ghost",
									"text-muted hover:text-subtitle hover:bg-background/50":
										props.variant === "ghost",
									"min-w-7 w-7 h-7": size() === "xs",
									"min-w-8 w-8 h-8": size() === "sm",
									"min-w-9 w-9 h-9": size() === "md",
								},
						props.class,
					)}
				>
					<span class="sr-only">{T()("common.actions.options.show")}</span>
					<Dynamic
						component={
							props.orientation === "horizontal"
								? TbOutlineDots
								: TbOutlineDotsVertical
						}
						size={props.variant === "toolbar" ? 12 : undefined}
						class={classNames("pointer-events-none", {
							"text-subtitle":
								props.variant === undefined || props.variant === "outline",
						})}
					/>
				</Menu.Trigger>
				<Menu.Content>
					<ActionList actions={visibleActions()} onSelect={handleSelect} />
				</Menu.Content>
			</Menu.Root>
		</Show>
	);
};

//* by position, as the actions are rebuilt whenever one changes, so an item's state updates in place rather than replacing it and losing focus
const ActionList: Component<{
	actions: ActionMenuItem[];
	onSelect: (_action: ActionMenuItem) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Index each={props.actions}>
			{(action) => (
				<Switch
					fallback={<ActionItem action={action()} onSelect={props.onSelect} />}
				>
					<Match when={(action().actions?.length ?? 0) > 0}>
						<Menu.Sub
							label={action().label}
							icon={<ActionIcon icon={action().icon} />}
							variant={action().variant}
							unavailable={!checkPermission(action().permission).permitted}
						>
							<ActionList
								actions={action().actions ?? []}
								onSelect={props.onSelect}
							/>
						</Menu.Sub>
					</Match>
					<Match when={action().type === "checkbox"}>
						<Menu.CheckboxItem
							icon={
								action().icon ? <ActionIcon icon={action().icon} /> : undefined
							}
							checked={action().checked === true}
							onChange={() => props.onSelect(action())}
							textValue={action().label}
						>
							{action().label}
						</Menu.CheckboxItem>
					</Match>
				</Switch>
			)}
		</Index>
	);
};

const ActionItem: Component<{
	action: ActionMenuItem;
	onSelect: (_action: ActionMenuItem) => void;
}> = (props) => {
	//* unavailable items stay selectable so choosing them can show a toast
	const refused = createMemo(
		() =>
			!checkPermission(props.action.permission).permitted ||
			props.action.disabled === true ||
			props.action.loading === true,
	);

	return (
		<Menu.Item
			href={props.action.type === "link" ? props.action.href || "/" : undefined}
			target={props.action.target}
			rel={props.action.rel}
			textValue={props.action.label}
			icon={<ActionIcon icon={props.action.icon} />}
			loading={props.action.loading}
			variant={props.action.variant}
			unavailable={refused()}
			onSelect={() => props.onSelect(props.action)}
		>
			{props.action.label}
		</Menu.Item>
	);
};

export default ActionMenu;
