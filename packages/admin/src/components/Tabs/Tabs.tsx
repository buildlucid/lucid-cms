import { TabsNav } from "./parts/TabsNav";
import { TabsRoot } from "./parts/TabsRoot";

export type { TabsNavItem, TabsNavProps } from "./parts/TabsNav";
export type { TabsItem, TabsRootProps } from "./parts/TabsRoot";

/**
 * A row of tabs with an indicator that slides between them. Tabs.Root switches
 * content in place, Tabs.Nav follows the router and marks the tab matching the
 * current URL. Each tab renders as a button, or as a link when it has an href.
 *
 * @example
 * ```tsx
 * import { Tabs } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * const [tab, setTab] = createSignal("details");
 *
 * return (
 * 	<Tabs.Root
 * 		activeKey={tab()}
 * 		onSelect={setTab}
 * 		items={[
 * 			{ key: "details", label: t("common.details") },
 * 			{ key: "history", label: t("common.history") },
 * 		]}
 * 	/>
 * );
 * ```
 */
const Tabs = {
	Root: TabsRoot,
	Nav: TabsNav,
};

export default Tabs;
