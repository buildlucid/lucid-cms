import { DrawerActions } from "./parts/DrawerActions";
import { DrawerBody } from "./parts/DrawerBody";
import { DrawerCloseButton } from "./parts/DrawerCloseButton";
import { DrawerDescription } from "./parts/DrawerDescription";
import { DrawerFooter } from "./parts/DrawerFooter";
import { DrawerForm } from "./parts/DrawerForm";
import { DrawerHeader } from "./parts/DrawerHeader";
import { DrawerLocaleSelect } from "./parts/DrawerLocaleSelect";
import { DrawerRoot } from "./parts/DrawerRoot";
import { DrawerTabs } from "./parts/DrawerTabs";
import { DrawerTitle } from "./parts/DrawerTitle";

export { useDrawerLocale } from "./DrawerContext";
export type { DrawerActionsProps } from "./parts/DrawerActions";
export type { DrawerBodyProps } from "./parts/DrawerBody";
export type { DrawerCloseButtonProps } from "./parts/DrawerCloseButton";
export type { DrawerDescriptionProps } from "./parts/DrawerDescription";
export type { DrawerFooterProps } from "./parts/DrawerFooter";
export type { DrawerFormProps } from "./parts/DrawerForm";
export type { DrawerHeaderProps } from "./parts/DrawerHeader";
export type { DrawerLocaleSelectProps } from "./parts/DrawerLocaleSelect";
export type {
	DrawerPadding,
	DrawerRootProps,
	DrawerSide,
	DrawerSize,
} from "./parts/DrawerRoot";
export type { DrawerTabItem, DrawerTabsProps } from "./parts/DrawerTabs";
export type { DrawerTitleProps } from "./parts/DrawerTitle";

/**
 * A panel that slides in from the edge of the screen, built from composable
 * parts. Use it for forms and detail views that sit over the current page.
 * Drawers opened from another drawer stack automatically.
 *
 * @example
 * ```tsx
 * import { Button, Drawer, Input } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Drawer.Root open={open()} onOpenChange={setOpen} loading={role.isLoading}>
 * 		<Drawer.Header>
 * 			<Drawer.Title>{t("permissions.roles.update")}</Drawer.Title>
 * 		</Drawer.Header>
 * 		<Drawer.Form onSubmit={save}>
 * 			<Drawer.Body>
 * 				<Input id="name" name="name" type="text" label={t("common.name")} value={name()} onChange={setName} />
 * 			</Drawer.Body>
 * 			<Drawer.Footer>
 * 				<Drawer.Actions>
 * 					<Button variant="outline" onClick={() => setOpen(false)}>{t("common.close")}</Button>
 * 					<Button type="submit" loading={save.isPending}>{t("common.save")}</Button>
 * 				</Drawer.Actions>
 * 			</Drawer.Footer>
 * 		</Drawer.Form>
 * 	</Drawer.Root>
 * );
 * ```
 */
const Drawer = {
	Root: DrawerRoot,
	Header: DrawerHeader,
	Title: DrawerTitle,
	Description: DrawerDescription,
	CloseButton: DrawerCloseButton,
	LocaleSelect: DrawerLocaleSelect,
	Tabs: DrawerTabs,
	Form: DrawerForm,
	Body: DrawerBody,
	Footer: DrawerFooter,
	Actions: DrawerActions,
};

export default Drawer;
