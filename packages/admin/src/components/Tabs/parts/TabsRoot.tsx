import { A } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSXElement,
	on,
	onCleanup,
	onMount,
	Show,
} from "solid-js";
import {
	tabsIndicatorClasses,
	tabsItemClasses,
	tabsListClasses,
	tabsRootClasses,
} from "../tabsClasses";

export interface TabsItem {
	/** Identifies the tab. Pass it to activeKey and read it back from onSelect. */
	key: string;
	label: JSXElement;
	/** Renders the tab as a router link rather than a button. */
	href?: string;
	/** Put on the tab's element, for anchors and scripted focus. */
	id?: string;
	onClick?: () => void;
	/** Leaves the tab out of the bar entirely. @default true */
	show?: boolean;
	disabled?: boolean;
	class?: string;
}

export interface TabsRootProps {
	items: TabsItem[];
	/** Falls back to the first tab when it does not match one. */
	activeKey?: string;
	onSelect?: (key: string) => void;
	/** Fills the width of the parent. @default false */
	fullWidth?: boolean;
	/** Shares the width evenly between the tabs. Implies fullWidth. @default false */
	stretch?: boolean;
	class?: string;
}

export const TabsRoot: Component<TabsRootProps> = (props) => {
	// ----------------------------------------
	// State
	const [indicatorStyle, setIndicatorStyle] = createSignal({
		height: 0,
		width: 0,
		x: 0,
		y: 0,
	});
	const [hoveredKey, setHoveredKey] = createSignal<string>();
	const [isReady, setIsReady] = createSignal(false);

	let containerRef!: HTMLDivElement;
	const itemRefs = new Map<string, HTMLElement>();
	let indicatorFrame: number | undefined;
	let indicatorRetryTimeouts: ReturnType<typeof setTimeout>[] = [];
	let resizeObserver: ResizeObserver | undefined;

	// ----------------------------------------
	// Memos
	const stretch = createMemo(() => props.stretch === true);
	const fill = createMemo(() => props.fullWidth === true || stretch());
	const items = createMemo(() => props.items.filter((i) => i.show !== false));
	//* links go somewhere rather than revealing a panel, so they are not tabs:
	//* announcing them as such promises a tabpanel that does not exist
	const isNavigation = createMemo(() => items().some((item) => item.href));
	const activeKey = createMemo(() => {
		const requestedKey = props.activeKey;
		if (requestedKey && items().some((item) => item.key === requestedKey)) {
			return requestedKey;
		}
		return items()[0]?.key;
	});
	const targetKey = createMemo(() => hoveredKey() ?? activeKey());
	const itemSignature = createMemo(() =>
		items()
			.map((item) => item.key)
			.join("|"),
	);

	// ----------------------------------------
	// Indicator
	const clearScheduledIndicatorUpdates = () => {
		if (indicatorFrame !== undefined) {
			cancelAnimationFrame(indicatorFrame);
			indicatorFrame = undefined;
		}
		for (const timeout of indicatorRetryTimeouts) clearTimeout(timeout);
		indicatorRetryTimeouts = [];
	};
	const updateIndicator = (key = targetKey()) => {
		if (!key || !containerRef) return false;
		const item = itemRefs.get(key);
		if (!item) return false;

		const containerRect = containerRef.getBoundingClientRect();
		const itemRect = item.getBoundingClientRect();
		if (containerRect.width === 0 || itemRect.width === 0) return false;

		setIndicatorStyle({
			height: itemRect.height,
			width: itemRect.width,
			x: itemRect.left - containerRect.left,
			y: itemRect.top - containerRect.top,
		});
		return true;
	};
	const scheduleIndicatorUpdate = (key = targetKey()) => {
		if (indicatorFrame !== undefined) cancelAnimationFrame(indicatorFrame);
		indicatorFrame = requestAnimationFrame(() => {
			indicatorFrame = undefined;
			updateIndicator(key);
		});
	};
	//* fonts and late layout move the tabs after the first paint, so the
	//* indicator is measured again a few times before it settles
	const scheduleIndicatorRetries = () => {
		clearScheduledIndicatorUpdates();
		scheduleIndicatorUpdate();
		for (const delay of [50, 150, 300]) {
			indicatorRetryTimeouts.push(
				setTimeout(() => scheduleIndicatorUpdate(), delay),
			);
		}
	};
	const setItemRef = (key: string, element: HTMLElement) => {
		const previousElement = itemRefs.get(key);
		if (previousElement && previousElement !== element) {
			resizeObserver?.unobserve(previousElement);
		}
		itemRefs.set(key, element);
		resizeObserver?.observe(element);
	};

	// ----------------------------------------
	// Functions
	const handleEnter = (key: string) => {
		setHoveredKey(key);
		scheduleIndicatorUpdate(key);
	};
	const handleLeave = () => {
		setHoveredKey(undefined);
		scheduleIndicatorUpdate(activeKey());
	};
	const handleSelect = (item: TabsItem) => {
		if (item.disabled) return;
		props.onSelect?.(item.key);
		item.onClick?.();
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		scheduleIndicatorRetries();
		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(() => scheduleIndicatorUpdate());
			resizeObserver.observe(containerRef);
			for (const item of itemRefs.values()) resizeObserver.observe(item);
		}
		requestAnimationFrame(() => {
			requestAnimationFrame(() => setIsReady(true));
		});
	});
	onCleanup(() => {
		clearScheduledIndicatorUpdates();
		resizeObserver?.disconnect();
	});
	createEffect(
		on(
			() => [activeKey(), itemSignature()],
			() => scheduleIndicatorRetries(),
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			ref={containerRef}
			data-tabs
			class={tabsRootClasses(fill(), props.class)}
		>
			<span
				data-tabs-indicator
				class={tabsIndicatorClasses(isReady(), hoveredKey() !== undefined)}
				style={{
					height: `${indicatorStyle().height}px`,
					transform: `translate3d(${indicatorStyle().x}px, ${indicatorStyle().y}px, 0)`,
					width: `${indicatorStyle().width}px`,
				}}
				aria-hidden="true"
			/>
			<ul
				data-tabs-list
				class={tabsListClasses(stretch())}
				onMouseLeave={handleLeave}
				//* links go somewhere rather than revealing a panel, so the list
				//* keeps its own role instead of promising a tabpanel
				role={isNavigation() ? undefined : "tablist"}
			>
				<For each={items()}>
					{(item) => {
						const itemClass = () =>
							tabsItemClasses(stretch(), targetKey() === item.key, item.class);

						return (
							//* a listitem cannot sit inside a tablist, so it steps aside
							//* and leaves the button as the tablist's direct tab
							<li role={isNavigation() ? undefined : "presentation"}>
								<Show
									when={item.href}
									fallback={
										<button
											ref={(element) => setItemRef(item.key, element)}
											id={item.id}
											data-tabs-item
											type="button"
											class={itemClass()}
											disabled={item.disabled}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => handleEnter(item.key)}
											onFocus={() => handleEnter(item.key)}
											onBlur={handleLeave}
											role="tab"
											aria-selected={activeKey() === item.key}
										>
											{item.label}
										</button>
									}
								>
									{(href) => (
										<A
											ref={(element) => setItemRef(item.key, element)}
											id={item.id}
											data-tabs-item
											class={itemClass()}
											href={href()}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => handleEnter(item.key)}
											onFocus={() => handleEnter(item.key)}
											onBlur={handleLeave}
											end
											aria-current={
												activeKey() === item.key ? "page" : undefined
											}
										>
											{item.label}
										</A>
									)}
								</Show>
							</li>
						);
					}}
				</For>
			</ul>
		</div>
	);
};
