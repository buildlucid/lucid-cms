import { type Component, createMemo, For } from "solid-js";
import Alert from "@/components/Blocks/Alert";
import StartingPoints from "@/components/Blocks/StartingPoints";
import { DynamicContent } from "@/components/Groups/Layout";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

export const Dashboard: Component = () => {
	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				media: true,
			},
		},
	});

	// ----------------------------------------
	// Local
	const docsLinks: Array<{ label: string; href: string }> = [
		{
			label: T()("configuring_lucid_cms"),
			href: `${constants.documentationUrl}/configuration/configuring-lucid-cms/`,
		},
		{
			label: T()("collection_builder"),
			href: `${constants.documentationUrl}/configuration/collection-builder/`,
		},
		{
			label: T()("brick_builder"),
			href: `${constants.documentationUrl}/configuration/brick-builder/`,
		},
		{
			label: T()("fetching_data"),
			href: `${constants.documentationUrl}/fetching-data/rest-api/`,
		},
		{
			label: T()("hooks"),
			href: `${constants.documentationUrl}/extending-lucid/hooks/`,
		},
		{
			label: T()("plugins"),
			href: `${constants.documentationUrl}/extending-lucid/plugins/`,
		},
	];
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadCollections = createMemo(
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

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			options={{
				padding: "24",
			}}
		>
			<Alert
				style="block"
				alerts={[
					{
						type: "warning",
						message: T()("media_support_config_stategy_error"),
						show: settings.data?.data?.media?.enabled === false,
					},
				]}
			/>
			<div class="flex flex-col lg:flex-row lg:items-start gap-6">
				<div class="flex-1">
					<StartingPoints
						links={[
							{
								title: T()("starting_point_collections"),
								description: T()("starting_point_collections_description"),
								href: "/lucid/collections",
								icon: "collection",
								permission: canReadCollections(),
							},
							{
								title: T()("starting_point_media"),
								description: T()("starting_point_media_description"),
								href: "/lucid/media",
								icon: "media",
								permission: canReadMedia(),
							},
							{
								title: T()("starting_point_emails"),
								description: T()("starting_point_emails_description"),
								href: "/lucid/emails",
								icon: "email",
								permission: canReadEmails(),
							},
							{
								title: T()("starting_point_users"),
								description: T()("starting_point_users_description"),
								href: "/lucid/users",
								icon: "users",
								permission: canReadUsers(),
							},
							{
								title: T()("starting_point_roles"),
								description: T()("starting_point_roles_description"),
								href: "/lucid/roles",
								icon: "roles",
								permission: canReadRoles(),
							},
							{
								title: T()("starting_point_settings"),
								description: T()("starting_point_settings_description"),
								href: "/lucid/system/overview",
								icon: "settings",
								permission: canReadSystemOverview(),
							},
						]}
					/>
				</div>
				<aside class="w-full lg:max-w-[260px] lg:sticky lg:top-4 self-start">
					<h2 class="mb-4">{T()("documentation")}</h2>
					<ul>
						<For each={docsLinks}>
							{(link) => (
								<li>
									<a
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										class="first:border-t px-2 group flex items-center justify-between text-sm text-title hover:text-primary-hover border-b border-border py-4"
									>
										<span>{link.label}</span>
										<span
											aria-hidden="true"
											class="transition-transform group-hover:translate-x-0.5"
										>
											&rarr;
										</span>
									</a>
								</li>
							)}
						</For>
					</ul>
				</aside>
			</div>
		</DynamicContent>
	);
};
