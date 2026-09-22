import notifyIllustration from "@assets/illustrations/notify.svg?url";
import { Dialog } from "@kobalte/core";
import type { Locale } from "@types";
import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	Match,
	onCleanup,
	Switch,
	untrack,
	useContext,
} from "solid-js";
import ErrorState from "@/components/ErrorState/ErrorState";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import { usePageScrollPin } from "@/hooks/usePageScrollPin/usePageScrollPin";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import {
	DrawerContext,
	DrawerNestingContext,
	type DrawerNestingState,
} from "../DrawerContext";

export type DrawerSide = "right" | "bottom";

export type DrawerSize = "md" | "full";

export type DrawerPadding = "sm" | "md";

export interface DrawerRootProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** @default "right" */
	side?: DrawerSide;
	/** `full` fills the full width or height, depending on the side. @default "md" */
	size?: DrawerSize;
	/** @default "md" */
	padding?: DrawerPadding;
	/** Shows a loading state instead of the content. */
	loading?: boolean;
	/** Shows an error state instead of the content. */
	error?: string;
	/** Locales available in `Drawer.LocaleSelect`. Defaults to the content locales. */
	locales?: Locale[];
	/** Which locale is selected when the drawer opens. @default "active" */
	initialLocale?: "active" | "default";
	/** Runs when the drawer closes, such as to reset a form. */
	onReset?: () => void;
	/** Set automatically when opened from another drawer. */
	zIndex?: number;
	/** Applied to the drawer panel. */
	class?: string;
	/** Pass a function to receive the selected content locale. */
	children:
		| JSXElement
		| ((_locale: Accessor<string | undefined>) => JSXElement);
}

/** Holds the drawer's parts and its open state. */
export const DrawerRoot: Component<DrawerRootProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const [lastFocusedElement, setLastFocusedElement] =
		createSignal<Element | null>(null);
	const [locale, setLocale] = createSignal<string | undefined>(undefined);
	const [openChildren, setOpenChildren] = createSignal<Map<symbol, DrawerSide>>(
		new Map(),
	);
	const interfaceDirection = useInterfaceDirection();
	const parentDrawer = useContext(DrawerNestingContext);
	const drawerId = Symbol("drawer");
	usePageScrollPin(() => props.open);

	// ------------------------------
	// Functions
	const setChildOpen = (id: symbol, open: boolean, childSide: DrawerSide) => {
		setOpenChildren((current) => {
			if (open ? current.get(id) === childSide : !current.has(id)) {
				return current;
			}
			const next = new Map(current);
			if (open) next.set(id, childSide);
			else next.delete(id);
			return next;
		});
	};
	const close = () => props.onOpenChange(false);
	const content = () => {
		const children = props.children;
		if (typeof children === "function" && children.length > 0) {
			return untrack(() => children(locale));
		}
		return children as JSXElement;
	};
	const defaultLocale = () => {
		const activeLocale = contentLocaleStore.get.contentLocale;
		if (
			props.initialLocale !== "default" &&
			locales().some((item) => item.code === activeLocale)
		) {
			return activeLocale;
		}
		return (
			locales().find((item) => item.isDefault)?.code ??
			locales()[0]?.code ??
			activeLocale
		);
	};

	// ------------------------------
	// Memos
	const side = createMemo(() => props.side ?? "right");
	const padding = createMemo(() => props.padding ?? "md");
	const locales = createMemo(
		() => props.locales ?? contentLocaleStore.get.locales,
	);
	const level = createMemo(() => (parentDrawer?.level() ?? -1) + 1);
	const stackLevel = createMemo(() => parentDrawer?.sideDepth()[side()] ?? 0);
	const visualLevel = createMemo(() => Math.min(stackLevel(), 6));
	const sideDepth = createMemo(() => {
		const parent = parentDrawer?.sideDepth() ?? { right: 0, bottom: 0 };
		return {
			right: parent.right + (side() === "right" ? 1 : 0),
			bottom: parent.bottom + (side() === "bottom" ? 1 : 0),
		};
	});
	const zIndex = createMemo(() =>
		Math.max(props.zIndex ?? 40, (parentDrawer?.zIndex() ?? 38) + 2),
	);
	const isCovered = createMemo(() => {
		for (const childSide of openChildren().values()) {
			if (childSide === side()) return true;
		}
		return false;
	});
	const coveredTransform = createMemo(() => {
		if (side() === "bottom") {
			if (!isCovered()) return "rotate(0deg)";
			return `rotate(${stackLevel() % 2 === 0 ? -0.1 : 0.1}deg)`;
		}
		if (!isCovered()) return "translateX(0)";
		return `translateX(${interfaceDirection.isLTR() ? "-24px" : "24px"})`;
	});

	const nestingState: DrawerNestingState = {
		level,
		sideDepth,
		zIndex,
		setChildOpen,
	};

	// ------------------------------
	// Effects
	createEffect(() => {
		parentDrawer?.setChildOpen(drawerId, props.open, side());
	});
	onCleanup(() => parentDrawer?.setChildOpen(drawerId, false, side()));

	let wasOpen = false;
	createEffect(() => {
		if (props.open) {
			if (!wasOpen) setLastFocusedElement(document.activeElement);
			wasOpen = true;
			setLocale(defaultLocale());
			return;
		}
		wasOpen = false;
		props.onReset?.();
	});

	createEffect(() => {
		const fallback = defaultLocale();
		if (
			!locales().some((item) => item.code === locale()) &&
			fallback !== undefined
		) {
			setLocale(fallback);
		}
	});

	// ------------------------------
	// Render
	return (
		<Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay
					data-drawer-overlay
					class={classNames(
						"fixed inset-0 animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-overlay-show",
						{
							"bg-overlay-base": stackLevel() === 0,
							"bg-transparent": stackLevel() > 0,
						},
					)}
					style={{ "z-index": zIndex() }}
				/>
				<div
					class={classNames(
						"fixed transition-transform duration-300 ease-out",
						{
							"inset-4 flex justify-end": side() === "right",
							"inset-x-4 bottom-0 flex items-end justify-center origin-bottom":
								side() === "bottom",
							"top-5 [@media(min-height:500px)]:top-20 [@media(min-height:953px)]:top-56":
								side() === "bottom" && props.size !== "full",
							"top-2 md:top-4": side() === "bottom" && props.size === "full",
						},
					)}
					style={{
						"z-index": zIndex(),
						"padding-top":
							side() === "bottom" ? `${visualLevel() * 24}px` : undefined,
						transform: coveredTransform(),
					}}
					data-nested-level={level()}
					data-covered={isCovered() ? "" : undefined}
				>
					<Dialog.Content
						data-drawer-content
						class={classNames(
							"w-full relative flex flex-col scrollbar border border-border bg-background-base outline-hidden overflow-y-auto",
							{
								"rounded-xl": side() === "right",
								"max-w-200": side() === "right" && props.size !== "full",
								"h-full rounded-t-xl animate-slide-from-bottom-out data-expanded:animate-slide-from-bottom-in":
									side() === "bottom",
								"animate-slide-from-right-out data-expanded:animate-slide-from-right-in":
									side() === "right" && interfaceDirection.isLTR(),
								"animate-slide-from-left-out data-expanded:animate-slide-from-left-in":
									side() === "right" && interfaceDirection.isRTL(),
							},
							props.class,
						)}
						onPointerDownOutside={(event) => {
							const target = event.target as HTMLElement;
							if (target.closest("[data-drawer-ignore]")) {
								event.stopPropagation();
								event.preventDefault();
							}
						}}
						onCloseAutoFocus={() => {
							let element = lastFocusedElement();
							if (
								!(element instanceof HTMLElement) ||
								element instanceof HTMLBodyElement ||
								!element.isConnected
							) {
								element = document.querySelector(
									"button:not([tabindex='-1']), a:not([tabindex='-1'])",
								);
							}
							if (element instanceof HTMLElement)
								element.focus({ preventScroll: true });
						}}
					>
						<Switch>
							<Match when={!props.open || props.loading}>
								<div class="skeleton absolute inset-4 md:inset-5 rounded-xl overflow-hidden" />
							</Match>
							<Match when={props.error}>
								<div class="flex items-center h-full justify-center">
									<ErrorState image={notifyIllustration} title={props.error} />
								</div>
							</Match>
							<Match when={props.open}>
								<DrawerNestingContext.Provider value={nestingState}>
									<LayerContext.Provider value={zIndex}>
										<DrawerContext.Provider
											value={{
												side,
												padding,
												locale,
												setLocale,
												locales,
												close,
											}}
										>
											{content()}
										</DrawerContext.Provider>
									</LayerContext.Provider>
								</DrawerNestingContext.Provider>
							</Match>
						</Switch>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
