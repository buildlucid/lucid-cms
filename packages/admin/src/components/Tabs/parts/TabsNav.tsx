import { useLocation } from "@solidjs/router";
import { type Component, createMemo } from "solid-js";
import { type TabsItem, TabsRoot } from "./TabsRoot";

export interface TabsNavItem {
	label: string;
	href: string;
	/** Leaves the tab out of the bar entirely. Use it for permissions. @default true */
	show?: boolean;
	disabled?: boolean;
	class?: string;
}

export interface TabsNavProps {
	tabs: TabsNavItem[];
	class?: string;
}

//* hrefs are written with the admin's mount point, the router reports without
const normalisePath = (path: string) => path.replace(/^\/lucid(?=\/|$)/, "");

/**
 * Page tabs that follow the router, marking whichever one matches the current
 * URL as active. Reach for Tabs.Root when the tabs switch content in place
 * rather than navigating.
 */
export const TabsNav: Component<TabsNavProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();

	// ----------------------------------------
	// Memos
	const items = createMemo<TabsItem[]>(() =>
		props.tabs.map((tab) => ({
			key: tab.href,
			label: tab.label,
			href: tab.href,
			show: tab.show,
			disabled: tab.disabled,
			class: tab.class,
		})),
	);
	const activeKey = createMemo(() => {
		const currentPath = normalisePath(location.pathname);
		return items().find(
			(item) => item.href && normalisePath(item.href) === currentPath,
		)?.key;
	});

	// ----------------------------------------
	// Render
	return (
		<nav data-tabs-nav class={props.class}>
			<TabsRoot items={items()} activeKey={activeKey()} />
		</nav>
	);
};
