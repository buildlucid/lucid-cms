import { A } from "@solidjs/router";
import classNames from "classnames";
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

export interface AnimatedTabItem {
	key: string;
	label: JSXElement;
	href?: string;
	id?: string;
	onClick?: () => void;
	permission?: boolean;
	show?: boolean;
	disabled?: boolean;
	class?: string;
	previewFocusOpen?: boolean;
}

interface AnimatedTabsProps {
	items: AnimatedTabItem[];
	activeKey?: string;
	onSelect?: (_key: string) => void;
	class?: string;
	listClass?: string;
	indicatorClass?: string;
	fullWidth?: boolean;
}

export const AnimatedTabs: Component<AnimatedTabsProps> = (props) => {
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
	const items = createMemo(() =>
		props.items.filter(
			(item) => item.permission !== false && item.show !== false,
		),
	);
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
	const handleEnter = (key: string) => {
		setHoveredKey(key);
		scheduleIndicatorUpdate(key);
	};
	const handleLeave = () => {
		setHoveredKey(undefined);
		scheduleIndicatorUpdate(activeKey());
	};
	const handleSelect = (item: AnimatedTabItem) => {
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
			class={classNames(
				"relative flex items-center rounded-md border border-border bg-card-base p-1",
				{
					"w-full": props.fullWidth,
					"max-w-max": !props.fullWidth,
				},
				props.class,
			)}
			onMouseLeave={handleLeave}
			role="tablist"
		>
			<span
				class={classNames(
					"pointer-events-none absolute top-0 left-0 rounded",
					{
						"transition-none": !isReady(),
						"transition-[transform,width,height,background-color] duration-200 ease-out will-change-transform":
							isReady(),
						"bg-secondary-base dark:bg-input-base": hoveredKey() === undefined,
						"bg-secondary-hover dark:bg-card-hover": hoveredKey() !== undefined,
					},
					props.indicatorClass,
				)}
				style={{
					height: `${indicatorStyle().height}px`,
					transform: `translate3d(${indicatorStyle().x}px, ${indicatorStyle().y}px, 0)`,
					width: `${indicatorStyle().width}px`,
				}}
				aria-hidden="true"
			/>
			<ul
				class={classNames(
					"relative z-10 flex min-w-0 flex-row flex-wrap items-center",
					props.listClass,
				)}
			>
				<For each={items()}>
					{(item) => {
						const triggerClass = () =>
							classNames(
								"relative z-10 flex items-center rounded text-sm font-medium whitespace-nowrap transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base ring-inset disabled:cursor-not-allowed disabled:opacity-60",
								{
									"text-secondary-contrast dark:text-title":
										targetKey() === item.key,
									"text-body hover:text-title": targetKey() !== item.key,
								},
								item.class,
							);

						return (
							<li>
								<Show
									when={item.href}
									fallback={
										<button
											ref={(element) => setItemRef(item.key, element)}
											id={item.id}
											data-preview-focus-open={item.previewFocusOpen}
											type="button"
											class={triggerClass()}
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
											class={triggerClass()}
											href={href()}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => handleEnter(item.key)}
											onFocus={() => handleEnter(item.key)}
											onBlur={handleLeave}
											end
											role="tab"
											aria-selected={activeKey() === item.key}
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
