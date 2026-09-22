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
import spawnToast from "@/utils/spawn-toast";

/** What an item does when it is chosen. */
export type ActionMenuItemType = "button" | "link" | "group";

export interface ActionMenuItem {
	label: string;
	type: ActionMenuItemType;
	icon?: ActionIconName;
	onClick?: () => void;
	href?: string;
	target?: "_blank" | "_self";
	rel?: string;
	/** Nested items, for type "group". The group hides when they all hide. */
	actions?: ActionMenuItem[];
	/** False shows the item but refuses it with a toast. */
	permission?: boolean;
	/** Leaves the item out entirely. */
	hide?: boolean;
	/** Dims the item and refuses it, optionally with a toast saying why. */
	disabled?: boolean;
	disabledToast?: {
		title: string;
		message?: string;
		status?: "success" | "error" | "warning" | "info";
		duration?: number;
	};
	isLoading?: boolean;
	/** Keeps the item out of the row click that runs the first action. */
	actionExclude?: boolean;
	/** Colours the item. Reserve "primary" for the one affirmative action. */
	variant?: MenuItemVariant;
	/**
	 * Position in the menu, lowest first, ties falling back to the order they
	 * were given in. The admin's own menus use 0-9 for the main read or edit
	 * action, 10-29 for other read actions, 30-49 for ordinary changes, 50-69
	 * for affirmative ones and 70 up for destructive ones.
	 */
	sortOrder?: number;
}

/** How big the trigger is drawn. */
export type ActionMenuSize = "sm" | "md";

export interface ActionMenuProps {
	actions: ActionMenuItem[];
	/** @default "sm" */
	size?: ActionMenuSize;
	placement?: MenuPlacement;
	/** Applied to the trigger. */
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
				action.hide !== true &&
				(action.actions === undefined || action.actions.length > 0),
		)
		.sort((a, b) => {
			const orderDiff = (a.action.sortOrder ?? 0) - (b.action.sortOrder ?? 0);

			if (orderDiff !== 0) return orderDiff;

			//* ties keep the order they were given in
			return a.index - b.index;
		})
		.map(({ action }) => action);

/**
 * The overflow menu a table row shows against its right edge. Items can be
 * buttons, links or nested groups, and each one can be hidden, disabled, or
 * refused for want of a permission. Build a Menu yourself when you need a
 * trigger or contents of your own.
 *
 * @example
 * ```tsx
 * import { ActionMenu } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ActionMenu
 * 		actions={[
 * 			{ type: "button", label: t("common.edit"), icon: "pen", onClick: edit, sortOrder: 0 },
 * 			{ type: "button", label: t("common.delete"), icon: "trash", variant: "error", onClick: remove, sortOrder: 70 },
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
						"pointer-events-auto bg-input-base border border-border outline-none ring-0 focus-visible:ring-1 focus:ring-primary-base rounded-md flex justify-center items-center hover:bg-background-hover",
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
					unavailable={action.permission === false}
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
	//* refused items stay selectable so choosing one can say why
	const refused = createMemo(
		() =>
			props.action.permission === false ||
			props.action.disabled === true ||
			props.action.isLoading === true,
	);

	return (
		<Menu.Item
			href={props.action.type === "link" ? props.action.href || "/" : undefined}
			target={props.action.target}
			rel={props.action.rel}
			textValue={props.action.label}
			icon={<ActionIcon icon={props.action.icon} />}
			end={props.action.isLoading ? <Spinner size="sm" /> : undefined}
			variant={props.action.variant}
			unavailable={refused()}
			onSelect={() => props.onSelect(props.action)}
		>
			{props.action.label}
		</Menu.Item>
	);
};

export default ActionMenu;
