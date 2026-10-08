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
import NotificationBell from "@/components/NotificationBell/NotificationBell";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection/useInterfaceDirection";
import T from "@/translations";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";
import { NavigationMenuContent } from "./parts/NavigationMenuContent";

const NavigationLogo: Component = () => (
	<>
		<img src={LogoLight} alt="Lucid CMS Logo" class="h-5 dark:hidden" />
		<img src={LogoDark} alt="Lucid CMS Logo" class="hidden h-5 dark:block" />
	</>
);

export const Navigation: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const interfaceDirection = useInterfaceDirection();
	const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const menuButtonLabel = createMemo(() =>
		mobileMenuOpen() ? T()("common.close") : T()("navigation.menu.open"),
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const pathname = location.pathname;
		setMobileMenuOpen(false);

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
			if (event.key === "Escape") {
				setMobileMenuOpen(false);
			}
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
					<A href="/lucid" class="flex items-center min-w-0">
						<NavigationLogo />
					</A>
					<div class="flex items-center gap-1">
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
			<aside class="hidden md:flex w-sidebar flex-col bg-sidebar max-h-screen sticky top-0 z-10">
				<div class="pt-6 pb-3 ps-6 pe-4 flex items-center justify-between gap-2">
					<NavigationLogo />
					<NotificationBell />
				</div>
				<NavigationMenuContent />
			</aside>

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
