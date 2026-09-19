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
import ErrorBlock from "@/components/ErrorBlock/ErrorBlock";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import { usePageScrollPin } from "@/hooks/usePageScrollPin/usePageScrollPin";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import {
	DrawerContext,
	DrawerNestingContext,
	type DrawerNestingState,
} from "../DrawerContext";

/** Edge the drawer slides in from. */
export type DrawerSide = "right" | "bottom";

/**
 * How much room the drawer takes. "full" fills the axis it slides along, so a
 * right hand drawer spans the full width and a bottom drawer the full height.
 */
export type DrawerSize = "md" | "full";

/** Horizontal room the header, body and footer leave around their content. */
export type DrawerPadding = "sm" | "md";

export interface DrawerRootProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** @default "right" */
	side?: DrawerSide;
	/** @default "md" */
	size?: DrawerSize;
	/** Room the regions leave around their content. @default "md" */
	padding?: DrawerPadding;
	/** Swaps the contents for a skeleton while data loads. */
	loading?: boolean;
	/** Swaps the contents for an error block. */
	error?: string;
	/** Locales the drawer can switch between. Defaults to the content locales. */
	locales?: Locale[];
	/** Opens on the collection's default locale rather than the active one. */
	useDefaultLocale?: boolean;
	/** Runs when the drawer closes, for resetting form state. */
	onReset?: () => void;
	/** Base stack layer. Drawers opened from another drawer infer this. */
	zIndex?: number;
	/** Applied to the drawer surface. */
	class?: string;
	/**
	 * Takes a function instead of markup to read the content locale the drawer
	 * is editing, in any of its regions.
	 */
	children:
		| JSXElement
		| ((_locale: Accessor<string | undefined>) => JSXElement);
}

/**
 * A panel that slides in from the edge of the screen, holding a form or a
 * detail view. Compose the contents from Drawer.Header, Drawer.Body and
 * Drawer.Footer. Drawers opened from another drawer stack automatically.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Root open={open()} onOpenChange={setOpen} loading={user.isLoading}>
 * 		<Drawer.Header>
 * 			<Drawer.Title>Edit user</Drawer.Title>
 * 		</Drawer.Header>
 * 		<Drawer.Body>
 * 			<Input id="email" name="email" type="email" label="Email" value={email()} onChange={setEmail} />
 * 		</Drawer.Body>
 * 	</Drawer.Root>
 * );
 * ```
 *
 * @example
 * Localised drawers take a function, which hands every region the locale the
 * drawer is editing.
 *
 * ```tsx
 * return (
 * 	<Drawer.Root open={open()} onOpenChange={setOpen}>
 * 		{(locale) => (
 * 			<>
 * 				<Drawer.Header>
 * 					<Drawer.Title>Edit media</Drawer.Title>
 * 					<Drawer.LocaleSelect />
 * 				</Drawer.Header>
 * 				<Drawer.Body>
 * 					<Input id="alt" name="alt" type="text" label="Alt text" value={alt[locale() ?? "en"]} onChange={setAlt} />
 * 				</Drawer.Body>
 * 			</>
 * 		)}
 * 	</Drawer.Root>
 * );
 * ```
 */
export const DrawerRoot: Component<DrawerRootProps> = (props) => {
	// ------------------------------
	// State & Hooks
	const [lastFocusedElement, setLastFocusedElement] =
		createSignal<Element | null>(null);
	const [locale, setLocale] = createSignal<string | undefined>(undefined);
	const [openChildren, setOpenChildren] = createSignal<Set<symbol>>(new Set());
	const interfaceDirection = useInterfaceDirection();
	const parentDrawer = useContext(DrawerNestingContext);
	const drawerId = Symbol("drawer");
	usePageScrollPin(() => props.open);

	// ------------------------------
	// Functions
	const setChildOpen = (id: symbol, open: boolean) => {
		setOpenChildren((current) => {
			if (current.has(id) === open) return current;
			const next = new Set(current);
			if (open) next.add(id);
			else next.delete(id);
			return next;
		});
	};
	const close = () => props.onOpenChange(false);
	/**
	 * Resolved inside the providers rather than up here, so the parts can read
	 * the drawer's context. An arity of one marks a render prop, matching how
	 * Solid itself resolves children.
	 */
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
			!props.useDefaultLocale &&
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
	/** Cap the visual offset so deeply nested drawers stay usable. */
	const visualLevel = createMemo(() => Math.min(Math.max(level(), 0), 6));
	const zIndex = createMemo(() =>
		Math.max(props.zIndex ?? 40, (parentDrawer?.zIndex() ?? 38) + 2),
	);
	const isCovered = createMemo(() => openChildren().size > 0);
	const coveredTransform = createMemo(() => {
		if (side() === "bottom") {
			if (!isCovered()) return "rotate(0deg)";
			return `rotate(${level() % 2 === 0 ? -0.1 : 0.1}deg)`;
		}
		if (!isCovered()) return "translateX(0)";
		return `translateX(${interfaceDirection.isLTR() ? "-24px" : "24px"})`;
	});

	const nestingState: DrawerNestingState = {
		level,
		zIndex,
		setChildOpen,
	};

	// ------------------------------
	// Effects
	createEffect(() => {
		parentDrawer?.setChildOpen(drawerId, props.open);
	});
	onCleanup(() => parentDrawer?.setChildOpen(drawerId, false));

	//* only capture on the closed to open transition - the locale deps below
	//* re-run this effect, and by then focus has moved inside the drawer
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
							"bg-overlay-base": level() === 0,
							"bg-transparent": level() > 0,
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
						//* focus restore runs with preventScroll, so closing the drawer
						//* never scrolls the page behind it back to the top
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
									<ErrorBlock
										content={{ image: notifyIllustration, title: props.error }}
									/>
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
