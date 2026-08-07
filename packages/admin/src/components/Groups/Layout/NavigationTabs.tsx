import { useLocation } from "@solidjs/router";
import { type Component, createMemo } from "solid-js";
import {
	type AnimatedTabItem,
	AnimatedTabs,
} from "@/components/Partials/AnimatedTabs";

interface NavigationTabsProps {
	tabs: {
		label: string;
		href?: string;
		onClick?: () => void;
		permission?: boolean;
		show?: boolean;
	}[];
}

const normalisePath = (path: string) => path.replace(/^\/lucid(?=\/|$)/, "");

export const NavigationTabs: Component<NavigationTabsProps> = (props) => {
	// ------------------------------------
	// State & Hooks
	const location = useLocation();

	// ------------------------------------
	// Memos
	const items = createMemo<AnimatedTabItem[]>(() =>
		props.tabs.map((tab, index) => ({
			key: tab.href ?? `tab-${index}`,
			label: tab.label,
			href: tab.href,
			onClick: tab.onClick,
			permission: tab.permission,
			show: tab.show,
			class: "exclude-default h-8 px-3",
		})),
	);
	const activeKey = createMemo(() => {
		const currentPath = normalisePath(location.pathname);
		return items().find(
			(item) => item.href && normalisePath(item.href) === currentPath,
		)?.key;
	});

	// ------------------------------------
	// Render
	return (
		<nav class="hidden px-4 pb-4 md:px-6 lg:block">
			<AnimatedTabs items={items()} activeKey={activeKey()} />
		</nav>
	);
};
