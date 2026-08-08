import LogoDark from "@assets/svgs/text-logo-dark.svg?url";
import LogoLight from "@assets/svgs/text-logo-light.svg?url";
import { A, useLocation } from "@solidjs/router";
import classNames from "classnames";
import { FaSolidGripLines, FaSolidXmark } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { NavigationMenuContent } from "@/components/Groups/Layout/NavigationMenuContent";
import { Permissions } from "@/constants/permissions";
import { useInterfaceDirection } from "@/hooks/useInterfaceDirection";
import api from "@/services/api";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import {
	isNavigationLinkActive,
	setNavigationLinkActiveState,
} from "@/utils/navigation";

const NavigationLogo: Component = () => (
	<>
		<img src={LogoLight} alt="Lucid CMS Logo" class="h-5 dark:hidden" />
		<img src={LogoDark} alt="Lucid CMS Logo" class="hidden h-5 dark:block" />
	</>
);

export const NavigationChrome: Component = () => {
	// ----------------------------------------
	// Hooks
	const location = useLocation();
	const interfaceDirection = useInterfaceDirection();

	// ----------------------------------------
	// Mutations
	const logout = api.auth.useLogout();
	const user = createMemo(() => userStore.get.user);
	const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
	const canReadMedia = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaRead]).all,
	);
	const canReadEmails = createMemo(
		() => userStore.get.hasPermission([Permissions.EmailRead]).all,
	);
	const canReadUsers = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersRead]).all,
	);
	const canReadRoles = createMemo(
		() => userStore.get.hasPermission([Permissions.RolesRead]).all,
	);
	const canReadJobs = createMemo(
		() => userStore.get.hasPermission([Permissions.JobsRead]).all,
	);
	const canReadPublishOperations = createMemo(
		() => userStore.get.hasPermission([Permissions.PublishOperationsRead]).all,
	);
	const canManageConnection = createMemo(
		() => userStore.get.hasPermission([Permissions.ConnectionUpdate]).all,
	);
	const canReadIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadAiUsage = createMemo(
		() => canReadSystemOverview() && siteStore.get.hasAnyAiFeatureEnabled(),
	);
	const showAccessAndPermissions = createMemo(
		() => canReadUsers() || canReadRoles(),
	);

	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	// ----------------------------------
	// Memos
	const collectionsIsLoading = createMemo(() => {
		return collections.isLoading;
	});
	const collectionsIsError = createMemo(() => {
		return collections.isError;
	});
	const multiCollections = createMemo(() => {
		return (
			collections.data?.data.filter(
				(collection) => collection.mode === "multiple",
			) || []
		);
	});
	const singleCollections = createMemo(() => {
		return (
			collections.data?.data.filter(
				(collection) =>
					collection.mode === "single" &&
					userStore.get.hasPermission([
						collection.permissions.read,
						collection.documentId
							? collection.permissions.update
							: collection.permissions.create,
					]).all,
			) || []
		);
	});
	const showCollections = createMemo(() => {
		return (
			collectionsIsLoading() ||
			collectionsIsError() ||
			multiCollections().length > 0 ||
			singleCollections().length > 0
		);
	});
	const showPublishRequests = createMemo(
		() =>
			canReadPublishOperations() &&
			(collections.data?.data ?? []).some(
				(collection) =>
					(collection.review?.requiredFor?.length ?? 0) > 0 &&
					userStore.get.hasPermission([collection.permissions.review]).all,
			),
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
				<div class="px-2 py-4 bg-sidebar-base flex items-center justify-between gap-2">
					<A href="/lucid" class="flex items-center min-w-0">
						<NavigationLogo />
					</A>
					<div class="flex items-center gap-4">
						<button
							type="button"
							class="h-9 rounded-lg text-icon-base hover:text-icon-hover flex items-center justify-center transition-colors"
							onClick={() => setMobileMenuOpen((open) => !open)}
							aria-label={mobileMenuOpen() ? T()("common.close") : "Open menu"}
							title={mobileMenuOpen() ? T()("common.close") : "Open menu"}
						>
							<Show
								when={mobileMenuOpen()}
								fallback={
									<span class="h-4 flex items-center justify-center">
										<FaSolidGripLines class="size-4" />
									</span>
								}
							>
								<span class="h-4 flex items-center justify-center">
									<FaSolidXmark class="size-4" />
								</span>
							</Show>
						</button>
					</div>
				</div>
			</header>

			{/* Desktop Navigation */}
			<div class="hidden md:flex bg-sidebar-base max-h-screen sticky top-0 z-10">
				<div class="w-55 h-full flex flex-col overflow-y-auto scrollbar">
					<div class="pt-6 px-4">
						<div class="flex items-center pl-2">
							<NavigationLogo />
						</div>
					</div>
					<NavigationMenuContent
						class="w-55 flex-1"
						logoutPending={logout.action.isPending}
						onLogout={() => logout.action.mutate({})}
						user={user() || undefined}
						canReadDocuments={showCollections()}
						canReadPublishRequests={showPublishRequests()}
						canReadMedia={canReadMedia()}
						canReadEmails={canReadEmails()}
						canReadUsers={canReadUsers()}
						canReadRoles={canReadRoles()}
						canReadJobs={canReadJobs()}
						canReadAiUsage={canReadAiUsage()}
						canManageConnection={canManageConnection()}
						canReadIntegrations={canReadIntegrations()}
						canReadSystemOverview={canReadSystemOverview()}
						showAccessAndPermissions={showAccessAndPermissions()}
						collectionsIsLoading={collectionsIsLoading()}
						collectionsIsError={collectionsIsError()}
						multiCollections={multiCollections()}
						singleCollections={singleCollections()}
					/>
				</div>
			</div>

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
							"absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200",
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
							"relative h-full w-full max-w-[320px] border-border bg-sidebar-base shadow-[0_20px_70px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out",
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
						<div class="h-full flex flex-col overflow-y-auto scrollbar">
							<div class="px-6 pt-4">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<NavigationLogo />
									</div>
									<button
										type="button"
										class="h-9 w-9 rounded-lg text-title/80 hover:text-title flex items-center justify-center transition-colors"
										aria-label={T()("common.close")}
										onClick={() => setMobileMenuOpen(false)}
									>
										<FaSolidXmark class="size-3.5" />
									</button>
								</div>
							</div>
							<NavigationMenuContent
								class="flex-1"
								onNavigate={() => setMobileMenuOpen(false)}
								logoutPending={logout.action.isPending}
								onLogout={() => logout.action.mutate({})}
								user={user() || undefined}
								canReadDocuments={showCollections()}
								canReadPublishRequests={showPublishRequests()}
								canReadMedia={canReadMedia()}
								canReadEmails={canReadEmails()}
								canReadUsers={canReadUsers()}
								canReadRoles={canReadRoles()}
								canReadJobs={canReadJobs()}
								canReadAiUsage={canReadAiUsage()}
								canManageConnection={canManageConnection()}
								canReadIntegrations={canReadIntegrations()}
								canReadSystemOverview={canReadSystemOverview()}
								showAccessAndPermissions={showAccessAndPermissions()}
								collectionsIsLoading={collectionsIsLoading()}
								collectionsIsError={collectionsIsError()}
								multiCollections={multiCollections()}
								singleCollections={singleCollections()}
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
