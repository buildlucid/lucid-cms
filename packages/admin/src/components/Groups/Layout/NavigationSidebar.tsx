import T from "@/translations";
import { type Component, createMemo, Show } from "solid-js";
import api from "@/services/api";
import { useLocation } from "@solidjs/router";
import packageJson from "../../../../../../packages/core/package.json";
import { A } from "@solidjs/router";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import userStore from "@/store/userStore";
import { IconLink } from "@/components/Groups/Navigation";
import UserDisplay from "@/components/Partials/UserDisplay";
import { getDocumentRoute } from "@/utils/route-helpers";
import { CollectionSubMenu } from "@/components/Groups/Navigation/SubMenus";

export const NavigationSidebar: Component = () => {
	// ----------------------------------------
	// Mutations
	const logout = api.auth.useLogout();
	const user = createMemo(() => userStore.get.user);
	const location = useLocation();

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
	const collectionLinkHref = createMemo(() => {
		if (multiCollections().length > 0) {
			return `/admin/collections/${multiCollections()[0].key}`;
		}
		if (singleCollections().length > 0) {
			const collection = singleCollections()[0];
			if (collection.documentId) {
				return getDocumentRoute("edit", {
					collectionKey: collection.key,
					useDrafts: collection.config.useDrafts,
					documentId: collection.documentId,
				});
			}
			return getDocumentRoute("create", {
				collectionKey: collection.key,
				useDrafts: collection.config.useDrafts,
			});
		}
		return "/admin/collections";
	});
	const isCollectionsRoute = createMemo(() => {
		return location.pathname.includes("/admin/collections");
	});

	// ----------------------------------
	// Render
	return (
		<nav class="bg-container-1 max-h-screen flex sticky top-0 z-10">
			{/* Primary */}
			<div class="w-[70px] h-full flex items-center justify-between flex-col overflow-y-auto scrollbar">
				<div>
					<div class="flex items-center justify-center mt-5">
						<img src={LogoIcon} alt="logo" class="size-6" />
					</div>
					<ul class="py-15">
						<IconLink
							type="link"
							href="/admin"
							icon="dashboard"
							title={T()("home")}
						/>
						<IconLink
							type="link"
							icon="collection"
							title={T()("collections")}
							href={collectionLinkHref()}
							loading={collectionsIsLoading()}
							active={isCollectionsRoute()}
						/>
						<IconLink
							type="link"
							href="/admin/media"
							icon="media"
							title={T()("media")}
							permission={
								userStore.get.hasPermission([
									"create_media",
									"update_media",
									"delete_media",
								]).some
							}
						/>
						<IconLink
							type="link"
							href="/admin/users"
							icon="users"
							title={T()("users")}
							permission={
								userStore.get.hasPermission([
									"create_user",
									"update_user",
									"delete_user",
								]).some
							}
						/>
						<IconLink
							type="link"
							href="/admin/roles"
							icon="roles"
							title={T()("roles")}
							permission={
								userStore.get.hasPermission([
									"create_role",
									"update_role",
									"delete_role",
								]).some
							}
						/>
						<IconLink
							type="link"
							href="/admin/emails"
							icon="email"
							title={T()("emails")}
							permission={userStore.get.hasPermission(["read_email"]).all}
						/>
						<IconLink
							type="link"
							href="/admin/settings"
							icon="settings"
							title={T()("settings")}
						/>
					</ul>
				</div>
				<div class="pb-5">
					<ul class="flex flex-col items-center">
						<IconLink
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
									class="flex items-center justify-center"
								>
									<UserDisplay
										user={{
											username: user()?.username || "",
											firstName: user()?.firstName,
											lastName: user()?.lastName,
											thumbnail: undefined,
										}}
										mode="icon"
									/>
								</A>
							</li>
						</Show>
					</ul>
					<small class="text-[6px] leading-none">v{packageJson.version}</small>
				</div>
			</div>
			{/* SUbMenus */}
			<CollectionSubMenu
				state={{
					isLoading: collectionsIsLoading(),
					isError: collectionsIsError(),
					multiCollections: multiCollections(),
					singleCollections: singleCollections(),
				}}
			/>
		</nav>
	);
};
