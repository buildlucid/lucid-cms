import T from "@/translations";
import type { Component } from "solid-js";
import api from "@/services/api";
import Layout from "@/components/Groups/Layout";
import StartingPoints from "@/components/Blocks/StartingPoints";
import Alert from "@/components/Blocks/Alert";

export const Dashboard: Component = () => {
	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {},
	});

	// ----------------------------------------
	// Render
	return (
		<Layout.DynamicContent
			options={{
				padding: "30",
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
					{
						type: "warning",
						message: T()("email_support_config_stategy_error"),
						show: settings.data?.data.email.enabled === false,
					},
				]}
			/>
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
						href: "/admin/settings",
						icon: "settings",
					},
				]}
			/>
		</Layout.DynamicContent>
	);
};
