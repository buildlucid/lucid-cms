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
	value: string;
	label: JSXElement;
	/** Renders the tab as a link. */
	href?: string;
	id?: string;
	onClick?: () => void;
	/** @default true */
	show?: boolean;
	disabled?: boolean;
	class?: string;
}

export interface TabsRootProps {
	items: TabsItem[];
	/** Defaults to the first tab. */
	value?: string;
	onChange?: (_value: string) => void;
	fullWidth?: boolean;
	/** Makes each tab the same width. Implies `fullWidth`. */
	stretch?: boolean;
	class?: string;
}

/** Tabs for switching between views. */
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
	//* links navigate rather than show a panel, so they skip the tab roles
	const isNavigation = createMemo(() => items().some((item) => item.href));
	const activeKey = createMemo(() => {
		const requestedKey = props.value;
		if (requestedKey && items().some((item) => item.value === requestedKey)) {
			return requestedKey;
		}
		return items()[0]?.value;
	});
	const targetKey = createMemo(() => hoveredKey() ?? activeKey());
	const itemSignature = createMemo(() =>
		items()
			.map((item) => item.value)
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
	//* measure again after fonts and late layout shift the tabs
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
		props.onChange?.(item.value);
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
				role={isNavigation() ? undefined : "tablist"}
			>
				<For each={items()}>
					{(item) => {
						const itemClass = () =>
							tabsItemClasses(
								stretch(),
								targetKey() === item.value,
								item.class,
							);

						return (
							<li role={isNavigation() ? undefined : "presentation"}>
								<Show
									when={item.href}
									fallback={
										<button
											ref={(element) => setItemRef(item.value, element)}
											id={item.id}
											data-tabs-item
											type="button"
											class={itemClass()}
											disabled={item.disabled}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => handleEnter(item.value)}
											onFocus={() => handleEnter(item.value)}
											onBlur={handleLeave}
											role="tab"
											aria-selected={activeKey() === item.value}
										>
											{item.label}
										</button>
									}
								>
									{(href) => (
										<A
											ref={(element) => setItemRef(item.value, element)}
											id={item.id}
											data-tabs-item
											class={itemClass()}
											href={href()}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => handleEnter(item.value)}
											onFocus={() => handleEnter(item.value)}
											onBlur={handleLeave}
											end
											aria-current={
												activeKey() === item.value ? "page" : undefined
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
