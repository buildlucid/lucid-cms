import { useLocation } from "@solidjs/router";
import { type Component, createMemo } from "solid-js";
import { type TabsItem, TabsRoot } from "./TabsRoot";

export interface TabsNavItem {
	label: string;
	href: string;
	/** @default true */
	show?: boolean;
	disabled?: boolean;
	class?: string;
}

export interface TabsNavProps {
	items: TabsNavItem[];
	class?: string;
}

//* hrefs include the admin's mount path, but the router's pathname does not
const normalisePath = (path: string) => path.replace(/^\/lucid(?=\/|$)/, "");

/** Tabs that link between pages, highlighting the current one. */
export const TabsNav: Component<TabsNavProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();

	// ----------------------------------------
	// Memos
	const items = createMemo<TabsItem[]>(() =>
		props.items.map((tab) => ({
			value: tab.href,
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
		)?.value;
	});

	// ----------------------------------------
	// Render
	return (
		<nav data-tabs-nav class={props.class}>
			<TabsRoot items={items()} value={activeKey()} />
		</nav>
	);
};
