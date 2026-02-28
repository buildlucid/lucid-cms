import LogoIcon from "@assets/svgs/text-logo-dark.svg";
import { A, useLocation } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidGripLines,
	FaSolidRightFromBracket,
	FaSolidXmark,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import { NavigationMenuContent } from "@/components/Groups/Layout/NavigationMenuContent";
import UserDisplay from "@/components/Partials/UserDisplay";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

export const NavigationChrome: Component = () => {
	// ----------------------------------------
	// Hooks
	const location = useLocation();

	// ----------------------------------------
	// Mutations
	const logout = api.auth.useLogout();
	const user = createMemo(() => userStore.get.user);
	const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
	const canReadDocuments = createMemo(
		() => userStore.get.hasPermission([Permissions.DocumentsRead]).all,
	);
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
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);
	const canReadClientIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const showAccessAndPermissions = createMemo(
		() => canReadUsers() || canReadRoles(),
	);

	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	const license = api.license.useGetStatus({
		queryParams: {},
	});

	// ----------------------------------
	// Memos
	const showLicenseAlert = createMemo(() => {
		return license.data?.data.valid === false;
	});
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
				(collection) => collection.mode === "single",
			) || []
		);
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		location.pathname;
		setMobileMenuOpen(false);
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
						<img src={LogoIcon} alt="Lucid CMS Logo" class="h-5" />
					</A>
					<div class="flex items-center gap-4">
						<Show when={user()}>
							{(currentUser) => (
								<A
									href="/lucid/account"
									class="h-8 px-0.5 rounded-lg flex items-center text-title/80 hover:text-title transition-colors"
									aria-label="Account"
								>
									<UserDisplay
										user={{
											username: currentUser().username || "",
											firstName: currentUser().firstName,
											lastName: currentUser().lastName,
											thumbnail: undefined,
										}}
										mode="icon"
										size="small"
									/>
								</A>
							)}
						</Show>
						<button
							type="button"
							class="h-9 rounded-lg text-icon-base hover:text-icon-hover flex items-center justify-center transition-colors"
							onClick={() => logout.action.mutate({})}
							disabled={logout.action.isPending}
							aria-label={T()("logout")}
							title={T()("logout")}
						>
							<span class="h-4 flex items-center justify-center">
								<FaSolidRightFromBracket class="size-3" />
							</span>
						</button>
						<button
							type="button"
							class="h-9 rounded-lg text-icon-base hover:text-icon-hover flex items-center justify-center transition-colors"
							onClick={() => setMobileMenuOpen((open) => !open)}
							aria-label={mobileMenuOpen() ? T()("close") : "Open menu"}
							title={mobileMenuOpen() ? T()("close") : "Open menu"}
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
				<div class="w-[220px] h-full flex flex-col overflow-y-auto scrollbar">
					<div class="pt-6 px-4">
						<div class="flex items-center pl-2">
							<img src={LogoIcon} alt="Lucid CMS Logo" class="h-6" />
						</div>
					</div>
					<NavigationMenuContent
						class="w-[220px] flex-1"
						showLicenseAlert={showLicenseAlert()}
						logoutPending={logout.action.isPending}
						onLogout={() => logout.action.mutate({})}
						user={user() || undefined}
						canReadDocuments={canReadDocuments()}
						canReadMedia={canReadMedia()}
						canReadEmails={canReadEmails()}
						canReadUsers={canReadUsers()}
						canReadRoles={canReadRoles()}
						canReadJobs={canReadJobs()}
						canManageLicense={canManageLicense()}
						canReadClientIntegrations={canReadClientIntegrations()}
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
						aria-label={T()("close")}
						onClick={() => setMobileMenuOpen(false)}
					/>

					{/* Mobile Navigation Content */}
					<div
						class={classNames(
							"relative h-full w-full max-w-[320px] border-r border-border bg-sidebar-base shadow-[0_20px_70px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out",
							{
								"translate-x-0": mobileMenuOpen(),
								"-translate-x-full": !mobileMenuOpen(),
							},
						)}
					>
						<div class="h-full flex flex-col overflow-y-auto scrollbar">
							<div class="px-6 pt-4 flex items-center justify-between">
								<div class="flex items-center gap-2">
									<img
										src={LogoIcon}
										alt="Lucid CMS Logo"
										class="h-5"
										loading="lazy"
									/>
								</div>
								<button
									type="button"
									class="h-9 w-9 rounded-lg text-title/80 hover:text-title flex items-center justify-center transition-colors"
									aria-label={T()("close")}
									onClick={() => setMobileMenuOpen(false)}
								>
									<FaSolidXmark class="size-3.5" />
								</button>
							</div>
							<NavigationMenuContent
								class="flex-1"
								showFooterActions={false}
								onNavigate={() => setMobileMenuOpen(false)}
								showLicenseAlert={showLicenseAlert()}
								canReadDocuments={canReadDocuments()}
								canReadMedia={canReadMedia()}
								canReadEmails={canReadEmails()}
								canReadUsers={canReadUsers()}
								canReadRoles={canReadRoles()}
								canReadJobs={canReadJobs()}
								canManageLicense={canManageLicense()}
								canReadClientIntegrations={canReadClientIntegrations()}
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
