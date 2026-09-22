import { TabsNav } from "./parts/TabsNav";
import { TabsRoot } from "./parts/TabsRoot";

export type { TabsNavItem, TabsNavProps } from "./parts/TabsNav";
export type { TabsItem, TabsRootProps } from "./parts/TabsRoot";

/**
 * A row of tabs. `Tabs.Root` switches between views, and `Tabs.Nav` links
 * between pages and highlights the current one.
 *
 * @example
 * ```tsx
 * import { Tabs } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 * const [tab, setTab] = createSignal("general");
 *
 * return (
 * 	<Tabs.Root
 * 		value={tab()}
 * 		onChange={setTab}
 * 		items={[
 * 			{ value: "general", label: t("settings.general") },
 * 			{ value: "social", label: t("settings.social") },
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
