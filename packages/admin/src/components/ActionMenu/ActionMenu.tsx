import classNames from "classnames";
import { FaSolidEllipsisVertical } from "solid-icons/fa";
import { type Component, createMemo, For, Show } from "solid-js";
import ActionIcon, {
	type ActionIconName,
} from "@/components/ActionIcon/ActionIcon";
import Menu, {
	type MenuItemVariant,
	type MenuPlacement,
} from "@/components/Menu/Menu";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";
import {
	checkPermission,
	type PermissionRequirement,
	showNoPermissionToast,
} from "@/utils/permission-requirement";
import spawnToast from "@/utils/spawn-toast";

export type ActionMenuItemType = "button" | "link" | "group";

export interface ActionMenuItem {
	label: string;
	type: ActionMenuItemType;
	icon?: ActionIconName;
	onClick?: () => void;
	href?: string;
	target?: "_blank" | "_self";
	rel?: string;
	/** Nested items, for the `group` type. */
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

export type ActionMenuSize = "sm" | "md";

export interface ActionMenuProps {
	actions: ActionMenuItem[];
	/** @default "sm" */
	size?: ActionMenuSize;
	placement?: MenuPlacement;
	/** Applied to the trigger button. */
	class?: string;
}

const getVisibleActions = (actions: ActionMenuItem[]): ActionMenuItem[] =>
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
				action.show !== false &&
				(action.actions === undefined || action.actions.length > 0),
		)
		.sort((a, b) => {
			const orderDiff = (a.action.sortOrder ?? 0) - (b.action.sortOrder ?? 0);

			if (orderDiff !== 0) return orderDiff;

			return a.index - b.index;
		})
		.map(({ action }) => action);

/**
 * A menu of actions behind a "more options" button, such as the actions for a
 * table row.
 *
 * @example
 * ```tsx
 * import { ActionMenu } from "@lucidcms/admin/components";
 * import { Permissions, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ActionMenu
 * 		actions={[
 * 			{ type: "button", label: t("common.edit"), icon: "pen", onClick: edit },
 * 			{
 * 				type: "button",
 * 				label: t("common.delete"),
 * 				icon: "trash",
 * 				variant: "danger",
 * 				permission: Permissions.MediaDelete,
 * 				onClick: remove,
 * 			},
 * 		]}
 * 	/>
 * );
 * ```
 */
const ActionMenu: Component<ActionMenuProps> = (props) => {
	// ----------------------------------------
	// Memos
	const visibleActions = createMemo(() => getVisibleActions(props.actions));

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
						"pointer-events-auto bg-input border border-border outline-none ring-0 focus-visible:ring-1 focus:ring-primary rounded-md flex justify-center items-center hover:bg-background-hover",
						{
							"min-w-7 w-7 h-7": props.size !== "md",
							"min-w-9 w-9 h-9": props.size === "md",
						},
						props.class,
					)}
				>
					<span class="sr-only">{T()("common.actions.options.show")}</span>
					<FaSolidEllipsisVertical class="text-subtitle pointer-events-none" />
				</Menu.Trigger>
				<Menu.Content>
					<ActionList actions={visibleActions()} onSelect={handleSelect} />
				</Menu.Content>
			</Menu.Root>
		</Show>
	);
};

const ActionList: Component<{
	actions: ActionMenuItem[];
	onSelect: (_action: ActionMenuItem) => void;
}> = (props) => (
	<For each={props.actions}>
		{(action) => (
			<Show
				when={action.actions && action.actions.length > 0}
				fallback={<ActionItem action={action} onSelect={props.onSelect} />}
			>
				<Menu.Sub
					label={action.label}
					icon={<ActionIcon icon={action.icon} />}
					variant={action.variant}
					unavailable={!checkPermission(action.permission).permitted}
				>
					<ActionList
						actions={action.actions ?? []}
						onSelect={props.onSelect}
					/>
				</Menu.Sub>
			</Show>
		)}
	</For>
);

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
			end={props.action.loading ? <Spinner size="sm" /> : undefined}
			variant={props.action.variant}
			unavailable={refused()}
			onSelect={() => props.onSelect(props.action)}
		>
			{props.action.label}
		</Menu.Item>
	);
};

export default ActionMenu;
