import T from "@/translations";
import { type Component, For } from "solid-js";
import api from "@/services/api";
import { DynamicContent } from "@/components/Groups/Layout";
import StartingPoints from "@/components/Blocks/StartingPoints";
import Alert from "@/components/Blocks/Alert";
import constants from "@/constants";

export const Dashboard: Component = () => {
	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {},
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
						show: settings.data?.data.media.enabled === false,
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
								href: "/admin/collections",
								icon: "collection",
							},
							{
								title: T()("starting_point_media"),
								description: T()("starting_point_media_description"),
								href: "/admin/media",
								icon: "media",
							},
							{
								title: T()("starting_point_emails"),
								description: T()("starting_point_emails_description"),
								href: "/admin/emails",
								icon: "email",
							},
							{
								title: T()("starting_point_users"),
								description: T()("starting_point_users_description"),
								href: "/admin/users",
								icon: "users",
							},
							{
								title: T()("starting_point_roles"),
								description: T()("starting_point_roles_description"),
								href: "/admin/roles",
								icon: "roles",
							},
							{
								title: T()("starting_point_settings"),
								description: T()("starting_point_settings_description"),
								href: "/admin/system/overview",
								icon: "settings",
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
