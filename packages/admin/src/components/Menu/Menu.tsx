import MenuCheckboxItem from "./parts/MenuCheckboxItem";
import MenuContent from "./parts/MenuContent";
import MenuItem from "./parts/MenuItem";
import MenuLabel from "./parts/MenuLabel";
import MenuRadioGroup from "./parts/MenuRadioGroup";
import MenuRadioItem from "./parts/MenuRadioItem";
import MenuRoot from "./parts/MenuRoot";
import MenuSeparator from "./parts/MenuSeparator";
import MenuSub from "./parts/MenuSub";
import MenuTrigger from "./parts/MenuTrigger";

export type { MenuItemVariant } from "./itemClasses";
export type { MenuCheckboxItemProps } from "./parts/MenuCheckboxItem";
export type { MenuContentProps } from "./parts/MenuContent";
export type { MenuItemProps } from "./parts/MenuItem";
export type { MenuLabelProps } from "./parts/MenuLabel";
export type { MenuRadioGroupProps } from "./parts/MenuRadioGroup";
export type { MenuRadioItemProps } from "./parts/MenuRadioItem";
export type { MenuPlacement, MenuRootProps } from "./parts/MenuRoot";
export type { MenuSeparatorProps } from "./parts/MenuSeparator";
export type { MenuSubProps } from "./parts/MenuSub";
export type { MenuTriggerProps } from "./parts/MenuTrigger";

/**
 * A menu that drops from a trigger, with keyboard navigation and focus
 * handling taken care of. Build the trigger and the items yourself; reach for
 * ActionMenu instead when all you need is a row's overflow menu.
 *
 * @example
 * ```tsx
 * import { Menu } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Menu.Root placement="bottom-end">
 * 		<Menu.Trigger class="h-9 rounded-md border border-border px-3 text-sm">
 * 			{t("common.actions")}
 * 		</Menu.Trigger>
 * 		<Menu.Content>
 * 			<Menu.Label>{t("common.actions")}</Menu.Label>
 * 			<Menu.Item onSelect={edit}>{t("common.edit")}</Menu.Item>
 * 			<Menu.Separator />
 * 			<Menu.Item variant="error" onSelect={remove}>
 * 				{t("common.delete")}
 * 			</Menu.Item>
 * 		</Menu.Content>
 * 	</Menu.Root>
 * );
 * ```
 */
const Menu = {
	Root: MenuRoot,
	Trigger: MenuTrigger,
	Content: MenuContent,
	Item: MenuItem,
	CheckboxItem: MenuCheckboxItem,
	RadioGroup: MenuRadioGroup,
	RadioItem: MenuRadioItem,
	Label: MenuLabel,
	Separator: MenuSeparator,
	Sub: MenuSub,
};

export default Menu;
