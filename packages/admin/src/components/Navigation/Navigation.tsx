import LogoDark from "@assets/svgs/text-logo-dark.svg?url";
import LogoLight from "@assets/svgs/text-logo-light.svg?url";
import { A, useLocation } from "@solidjs/router";
import classNames from "classnames";
import { TbOutlineGripHorizontal, TbOutlineX } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import HoverRevealBar from "@/components/HoverRevealBar/HoverRevealBar";
import NotificationBell from "@/components/NotificationBell/NotificationBell";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { useHoverReveal } from "@/hooks/useHoverReveal/useHoverReveal";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import { usePointerNear } from "@/hooks/usePointerNear/usePointerNear";
import navigationStore from "@/store/navigationStore/navigationStore";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";
import { AgentPanelToggle } from "./parts/AgentPanelToggle";
import { NavigationMenuContent } from "./parts/NavigationMenuContent";
import { SiteLink } from "./parts/SiteLink";

const NavigationLogo: Component = () => (
	<>
		<img src={LogoLight} alt="Lucid CMS Logo" class="h-4 dark:hidden" />
		<img src={LogoDark} alt="Lucid CMS Logo" class="hidden h-4 dark:block" />
	</>
);

export const Navigation: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const interfaceDirection = useInterfaceDirection();
	const session = useAgentSession();
	const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
	let panelRef: HTMLDivElement | undefined;
	let edgeRef: HTMLDivElement | undefined;
	//* while the page builder's preview or a comparison takes its width, the sidebar slides in from the edge
	const tuck = useHoverReveal({
		element: () => panelRef,
		enabled: () => navigationStore.get.tucked,
	});
	//* its edge marker shows once the pointer heads for it
	const nearEdge = usePointerNear({
		element: () => edgeRef,
		enabled: () => navigationStore.get.tucked,
	});

	// ----------------------------------------
	// Memos
	const menuButtonLabel = createMemo(() =>
		mobileMenuOpen() ? T()("common.close") : T()("navigation.menu.open"),
	);
	//* the bell always shows; once others join, the sidebar moves them all into a row below the logo
	//* the agent toggle counts wherever it is allowed, so the row keeps its shape on agent pages
	const showActionRow = createMemo(
		() => session.panel.allowed() || siteStore.get.siteUrl !== null,
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const pathname = location.pathname;
		setMobileMenuOpen(false);
		tuck.conceal();

		if (typeof document === "undefined") return;
		const synchronizeLinks = () => {
			for (const link of document.querySelectorAll<HTMLAnchorElement>(
				"a[data-navigation-href]",
			)) {
				const active =
					link.dataset.navigationForceActive === "true" ||
					isNavigationLinkActive(
						pathname,
						link.dataset.navigationHref || link.href,
						link.dataset.navigationExact === "true",
					);
				setNavigationLinkActiveState(link, active);
			}
		};

		synchronizeLinks();
		queueMicrotask(synchronizeLinks);
	});

	createEffect(() => {
		if (typeof document === "undefined") return;
		if (!mobileMenuOpen()) return;

		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		onCleanup(() => {
			document.body.style.overflow = originalOverflow;
		});
	});

	createEffect(() => {
		if (typeof window === "undefined") return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setMobileMenuOpen(false);
			//* a menu opened from the sidebar closes on Escape first, returning focus inside it
			if (
				event.target instanceof Element &&
				event.target.closest("[role='menu']")
			) {
				return;
			}
			if (
				tuck.revealed() &&
				document.activeElement instanceof HTMLElement &&
				panelRef?.contains(document.activeElement)
			) {
				document.activeElement.blur();
			}
			tuck.conceal();
		};

		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});

	// ----------------------------------
	// Render
	return (
		<>
			<header class="md:hidden z-32 px-4">
				<div class="px-2 py-4 bg-sidebar flex items-center justify-between gap-2">
					<A href="/admin" class="flex items-center min-w-0">
						<NavigationLogo />
					</A>
					<div class="flex items-center gap-1">
						<SiteLink size="md" />
						<AgentPanelToggle size="md" />
						<NotificationBell size="md" />
						<button
							type="button"
							class="size-9 rounded-lg text-icon hover:text-icon-hover flex items-center justify-center transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
							onClick={() => setMobileMenuOpen((open) => !open)}
							aria-label={menuButtonLabel()}
							aria-expanded={mobileMenuOpen()}
							title={menuButtonLabel()}
						>
							<Show
								when={mobileMenuOpen()}
								fallback={<TbOutlineGripHorizontal class="size-4" />}
							>
								<TbOutlineX class="size-4" />
							</Show>
						</button>
					</div>
				</div>
			</header>

			{/* Desktop Navigation */}
			<aside
				class={classNames("hidden md:block max-h-screen sticky top-0", {
					"z-40 w-sidebar": !navigationStore.get.tucked,
					"z-50 w-0": navigationStore.get.tucked,
				})}
			>
				<div
					ref={panelRef}
					class={classNames(
						"flex h-full w-sidebar flex-col bg-sidebar transition-[translate,box-shadow] duration-300 ease-emphasized motion-reduce:transition-none",
						{
							"translate-x-0": !navigationStore.get.tucked || tuck.revealed(),
							"fixed inset-y-0 inset-s-0 border-e border-border":
								navigationStore.get.tucked,
							"shadow-[0_20px_70px_rgba(0,0,0,0.45)]":
								navigationStore.get.tucked && tuck.revealed(),
							"-translate-x-full rtl:translate-x-full":
								navigationStore.get.tucked && !tuck.revealed(),
						},
					)}
					onPointerEnter={tuck.handlers.onPointerEnter}
					onPointerLeave={tuck.handlers.onPointerLeave}
					onFocusIn={tuck.handlers.onFocusIn}
					onFocusOut={tuck.handlers.onFocusOut}
				>
					<div class="pt-6 pb-3">
						<div class="ps-6 pe-4 flex min-h-8 items-center justify-between gap-2">
							<NavigationLogo />
							<Show when={!showActionRow()}>
								<NotificationBell />
							</Show>
						</div>
						<Show when={showActionRow()}>
							<div class="px-4 mt-4 grid grid-flow-col auto-cols-fr gap-1.5">
								<SiteLink variant="tile" />
								<AgentPanelToggle variant="tile" />
								<NotificationBell variant="tile" />
							</div>
						</Show>
					</div>
					<NavigationMenuContent />
				</div>
			</aside>
			<Show when={navigationStore.get.tucked}>
				<div
					ref={edgeRef}
					aria-hidden="true"
					class="group fixed inset-y-0 inset-s-0 z-40 hidden w-6 md:block"
					onPointerEnter={tuck.handlers.onPointerEnter}
					onPointerLeave={tuck.handlers.onPointerLeave}
				>
					<HoverRevealBar
						orientation="vertical"
						hidden={tuck.revealed() || !nearEdge()}
						class="top-1/2 inset-s-1.5 -translate-y-1/2"
					/>
				</div>
				{/* below the edge, so covering the page doesn't count as the pointer leaving it */}
				<Show when={tuck.revealed()}>
					<div
						aria-hidden="true"
						class="fixed inset-0 z-39 hidden md:block"
						onClick={tuck.conceal}
					/>
				</Show>
			</Show>

			{/* Mobile Navigation */}
			<div
				class={classNames(
					"md:hidden fixed inset-0 z-50 transition-[visibility] duration-200",
					{
						visible: mobileMenuOpen(),
						"invisible pointer-events-none": !mobileMenuOpen(),
					},
				)}
				aria-hidden={!mobileMenuOpen()}
			>
				<div class="relative h-full w-full">
					{/* Overlay */}
					<button
						type="button"
						class={classNames(
							"absolute inset-0 bg-overlay backdrop-blur-[2px] transition-opacity duration-200",
							{
								"opacity-100": mobileMenuOpen(),
								"opacity-0": !mobileMenuOpen(),
							},
						)}
						aria-label={T()("common.close")}
						onClick={() => setMobileMenuOpen(false)}
					/>

					{/* Mobile Navigation Content */}
					<div
						class={classNames(
							"relative h-full w-full max-w-[320px] flex flex-col border-border bg-sidebar shadow-[0_20px_70px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out",
							{
								"translate-x-0": mobileMenuOpen(),
								"border-r -translate-x-full":
									interfaceDirection.isLTR() && !mobileMenuOpen(),
								"border-r": interfaceDirection.isLTR() && mobileMenuOpen(),
								"border-l translate-x-full":
									interfaceDirection.isRTL() && !mobileMenuOpen(),
								"border-l": interfaceDirection.isRTL() && mobileMenuOpen(),
								"ml-auto": interfaceDirection.isRTL(),
							},
						)}
					>
						<div class="px-6 pt-4 pb-3 flex items-center justify-between">
							<NavigationLogo />
							<button
								type="button"
								class="size-9 rounded-lg text-title/80 hover:text-title flex items-center justify-center transition-colors outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
								aria-label={T()("common.close")}
								onClick={() => setMobileMenuOpen(false)}
							>
								<TbOutlineX class="size-3.5" />
							</button>
						</div>
						<NavigationMenuContent
							onNavigate={() => setMobileMenuOpen(false)}
						/>
					</div>
				</div>
			</div>
		</>
	);
};
