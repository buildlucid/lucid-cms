import T from "@/translations";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import api from "@/services/api";
import packageJson from "../../../../../../packages/core/package.json" with {
	type: "json",
};
import { A } from "@solidjs/router";
import LogoIcon from "@assets/svgs/text-logo-dark.svg";
import userStore from "@/store/userStore";
import { IconLinkFull } from "@/components/Groups/Navigation";
import UserDisplay from "@/components/Partials/UserDisplay";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export const NavigationSidebar: Component = () => {
	// ----------------------------------------
	// Mutations
	const logout = api.auth.useLogout();
	const user = createMemo(() => userStore.get.user);
	const canReadDocuments = createMemo(
		() => userStore.get.hasPermission(["read_content"]).all,
	);
	const canReadMedia = createMemo(
		() => userStore.get.hasPermission(["read_media"]).all,
	);
	const canReadEmails = createMemo(
		() => userStore.get.hasPermission(["read_email"]).all,
	);
	const canReadUsers = createMemo(
		() => userStore.get.hasPermission(["read_user"]).all,
	);
	const canReadRoles = createMemo(
		() => userStore.get.hasPermission(["read_role"]).all,
	);
	const canReadJobs = createMemo(
		() => userStore.get.hasPermission(["read_job"]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission(["update_license"]).all,
	);
	const canReadClientIntegrations = createMemo(
		() => userStore.get.hasPermission(["read_client_integration"]).all,
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
	// Render
	return (
		<nav class="bg-sidebar-base max-h-screen flex sticky top-0 z-10">
			{/* Primary */}
			<div class="w-[220px] h-full flex justify-between flex-col overflow-y-auto scrollbar">
				<div class="pt-6 px-4">
					<div class="flex items-center pl-2">
						<img src={LogoIcon} alt="Lucid CMS Logo" class="h-6" />
					</div>
					<ul class="py-6">
						<IconLinkFull
							type="link"
							href="/admin"
							icon="dashboard"
							title={T()("dashboard")}
						/>
						<IconLinkFull
							type="link"
							href="/admin/media"
							icon="media"
							title={T()("media_library")}
							permission={canReadMedia()}
						/>

						<IconLinkFull
							type="link"
							href="/admin/emails"
							icon="email"
							title={T()("email_activity")}
							permission={canReadEmails()}
						/>

						{/* Collections */}
						<Show when={canReadDocuments()}>
							<>
								<div class="w-full mt-4 mb-2">
									<span class="text-xs">{T()("collections")}</span>
								</div>
								<Switch>
									<Match when={collectionsIsLoading()}>
										<span class="skeleton block h-8 w-full mb-1" />
										<span class="skeleton block h-8 w-full mb-1" />
										<span class="skeleton block h-8 w-full mb-1" />
									</Match>
									<Match when={collectionsIsError()}>
										<div class="bg-background-base rounded-md p-2">
											<p class="text-xs text-center">
												{T()("error_loading_collections")}
											</p>
										</div>
									</Match>
									<Match when={true}>
										<For each={multiCollections()}>
											{(collection) => (
												<IconLinkFull
													type="link"
													href={`/admin/collections/${collection.key}`}
													icon="collection-multiple"
													title={helpers.getLocaleValue({
														value: collection.details.name,
													})}
												/>
											)}
										</For>
										<For each={singleCollections()}>
											{(collection) => (
												<IconLinkFull
													type="link"
													href={
														collection.documentId
															? getDocumentRoute("edit", {
																	collectionKey: collection.key,
																	documentId: collection.documentId,
																})
															: getDocumentRoute("create", {
																	collectionKey: collection.key,
																})
													}
													icon="collection-single"
													title={helpers.getLocaleValue({
														value: collection.details.name,
													})}
												/>
											)}
										</For>
									</Match>
								</Switch>
							</>
						</Show>

						{/* Access & Permissions */}
						<Show when={showAccessAndPermissions()}>
							<div class="w-full mt-4 mb-2">
								<span class="text-xs">{T()("access_and_permissions")}</span>
							</div>
						</Show>
						<IconLinkFull
							type="link"
							href="/admin/users"
							icon="users"
							title={T()("user_accounts")}
							permission={canReadUsers()}
						/>
						<IconLinkFull
							type="link"
							href="/admin/roles"
							icon="roles"
							title={T()("role_management")}
							permission={canReadRoles()}
						/>

						{/* System */}
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">{T()("system")}</span>
						</div>
						<IconLinkFull
							type="link"
							href="/admin/system/overview"
							icon="overview"
							title={T()("overview")}
						/>
						<IconLinkFull
							type="link"
							href="/admin/system/client-integrations"
							icon="client-integrations"
							title={T()("client_integrations")}
							permission={canReadClientIntegrations()}
						/>
						<IconLinkFull
							type="link"
							href="/admin/system/license"
							icon="license"
							title={T()("manage_license")}
							permission={canManageLicense()}
						/>
						<IconLinkFull
							type="link"
							href="/admin/system/queue-observability"
							icon="queue"
							title={T()("queue_observability")}
							permission={canReadJobs()}
						/>
					</ul>
				</div>
				<div class="pb-6 px-4">
					<ul class="flex flex-col border-t border-border pt-6">
						<IconLinkFull
							type="button"
							icon="logout"
							loading={logout.action.isPending}
							onClick={() => logout.action.mutate({})}
							title={T()("logout")}
						/>
						<Show when={user()}>
							<li>
								<A
									href="/admin/account"
									class="flex items-center justify-center mt-6"
								>
									<UserDisplay
										user={{
											username: user()?.username || "",
											firstName: user()?.firstName,
											lastName: user()?.lastName,
											thumbnail: undefined,
										}}
										mode="long"
									/>
								</A>
							</li>
						</Show>
					</ul>
					<div class="mt-4 flex flex-col gap-2">
						<Show when={showLicenseAlert()}>
							<div class="bg-warning-base/10 border border-warning-base/20 rounded-md px-2 py-2 text-center">
								<p class="text-xs">{T()("license_invalid_message")}</p>
							</div>
						</Show>
						<small class="text-xs leading-none bg-background-base rounded-md px-2 py-2 block text-center">
							v{packageJson.version}
						</small>
					</div>
				</div>
			</div>
		</nav>
	);
};
