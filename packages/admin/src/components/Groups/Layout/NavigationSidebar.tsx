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
					<div class="flex items-center">
						<img src={LogoIcon} alt="Lucid CMS Logo" class="h-6" />
					</div>
					<ul class="py-6">
						<IconLinkFull
							type="link"
							href="/admin"
							icon="dashboard"
							title={T()("home")}
						/>
						<IconLinkFull
							type="link"
							href="/admin/media"
							icon="media"
							title={T()("media_library")}
							permission={
								userStore.get.hasPermission([
									"create_media",
									"update_media",
									"delete_media",
								]).some
							}
						/>

						<IconLinkFull
							type="link"
							href="/admin/emails"
							icon="email"
							title={T()("email_activity")}
							permission={userStore.get.hasPermission(["read_email"]).all}
						/>

						{/* Access & Permissions */}
						<div class="w-full mt-6 mb-2">
							<span class="text-xs">{T()("access_and_permissions")}</span>
						</div>
						<IconLinkFull
							type="link"
							href="/admin/users"
							icon="users"
							title={T()("user_accounts")}
							permission={
								userStore.get.hasPermission([
									"create_user",
									"update_user",
									"delete_user",
								]).some
							}
						/>
						<IconLinkFull
							type="link"
							href="/admin/roles"
							icon="roles"
							title={T()("role_management")}
							permission={
								userStore.get.hasPermission([
									"create_role",
									"update_role",
									"delete_role",
								]).some
							}
						/>

						{/* Collections */}
						<div class="w-full mt-6 mb-2">
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
															useDrafts: collection.config.useDrafts,
															documentId: collection.documentId,
														})
													: getDocumentRoute("create", {
															collectionKey: collection.key,
															useDrafts: collection.config.useDrafts,
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
					</ul>
				</div>
				<div class="pb-6 px-4">
					<ul class="flex flex-col border-t border-border pt-6">
						<IconLinkFull
							type="link"
							href="/admin/settings"
							icon="settings"
							title={T()("settings")}
						/>
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
									class="flex items-center justify-center mt-5"
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
					<small class="text-xs leading-none bg-background-base rounded-md px-2 py-2 block text-center mt-4">
						v{packageJson.version}
					</small>
				</div>
			</div>
		</nav>
	);
};
