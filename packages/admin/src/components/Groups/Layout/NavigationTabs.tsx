import { A, useLocation } from "@solidjs/router";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onMount,
} from "solid-js";

interface NavigationTabsProps {
	tabs: {
		label: string;
		href?: string;
		onClick?: () => void;
		permission?: boolean;
		show?: boolean;
	}[];
}

export const NavigationTabs: Component<NavigationTabsProps> = (props) => {
	// ----------------------------------------
	// Hooks & State
	const location = useLocation();
	const [indicatorStyle, setIndicatorStyle] = createSignal({
		left: 0,
		width: 0,
	});
	const [isReady, setIsReady] = createSignal(false);
	const [hoveredTab, setHoveredTab] = createSignal<number | null>(null);
	const [isHovering, setIsHovering] = createSignal(false);

	let containerRef!: HTMLDivElement;
	const itemRefs: HTMLElement[] = [];

	// ----------------------------------------
	// Memos
	const tabs = createMemo(() =>
		props.tabs.filter((tab) => tab.permission !== false && tab.show !== false),
	);
	const normalisePath = (path: string) => path.replace(/^\/lucid(?=\/|$)/, "");
	const activeTab = createMemo(() => {
		const currentPath = normalisePath(location.pathname);
		const index = tabs().findIndex(
			(tab) => tab.href && normalisePath(tab.href) === currentPath,
		);
		return index >= 0 ? index : 0;
	});

	// ----------------------------------------
	// Functions
	const updateIndicator = (index: number) => {
		const item = itemRefs[index];
		if (!item || !containerRef) return;

		const containerRect = containerRef.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();

		setIndicatorStyle({
			left: itemRect.left - containerRect.left,
			width: itemRect.width,
		});
	};
	const handleMouseEnter = (index: number) => {
		setIsHovering(true);
		setHoveredTab(index);
		updateIndicator(index);
	};
	const handleMouseLeave = () => {
		setIsHovering(false);
		setHoveredTab(null);
		updateIndicator(activeTab());
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		requestAnimationFrame(() => {
			updateIndicator(activeTab());
			requestAnimationFrame(() => setIsReady(true));
		});
	});

	createEffect(
		on(
			() => [activeTab(), tabs().length],
			() => {
				updateIndicator(activeTab());
			},
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<nav class="px-4 md:px-6 pb-4">
			<div
				ref={containerRef}
				class="relative flex max-w-max flex-row items-center rounded-md border border-border bg-card-base p-1"
				onMouseLeave={handleMouseLeave}
				role="tablist"
			>
				<span
					class={classNames("absolute top-1 bottom-1 rounded", {
						"transition-none": !isReady(),
						"transition-all duration-200 ease-out": isReady(),
						"bg-secondary-base": !isHovering(),
						"bg-secondary-hover": isHovering(),
					})}
					style={{
						left: `${indicatorStyle().left}px`,
						width: `${indicatorStyle().width}px`,
					}}
					aria-hidden="true"
				/>
				<ul class="relative z-10 flex flex-row flex-wrap items-center">
					<For each={tabs()}>
						{(tab, index) => (
							<li>
								<A
									ref={(el) => {
										itemRefs[index()] = el;
									}}
									class={classNames(
										"exclude-default flex h-8 items-center rounded px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base",
										{
											"text-secondary-contrast":
												(isHovering() ? hoveredTab() : activeTab()) === index(),
											"text-body hover:text-title":
												(isHovering() ? hoveredTab() : activeTab()) !== index(),
										},
									)}
									href={tab.href || "#"}
									onClick={tab.onClick}
									onMouseEnter={() => handleMouseEnter(index())}
									onFocus={() => handleMouseEnter(index())}
									onBlur={handleMouseLeave}
									end
									role="tab"
									aria-selected={activeTab() === index()}
								>
									{tab.label}
								</A>
							</li>
						)}
					</For>
				</ul>
			</div>
		</nav>
	);
};
