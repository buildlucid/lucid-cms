import T from "@/translations";
import type { Component } from "solid-js";
import userStore from "@/store/userStore";
import { FaSolidCode } from "solid-icons/fa";
import constants from "@/constants";
import Content from "@/components/Groups/Content";
import Layout from "@/components/Groups/Layout";
import Headers from "@/components/Groups/Headers";

const DashboardRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Layout.Wrapper
			slots={{
				header: (
					<Headers.Standard
						copy={{
							title: T()("dashboard_route_title", {
								name: userStore.get.user?.firstName
									? `, ${userStore.get.user?.firstName}`
									: "",
							}),
							description: T()("dashboard_route_description"),
						}}
						actions={{
							link: {
								href: constants.documentationUrl,
								label: T()("documentation"),
								permission: true,
								icon: <FaSolidCode />,
								newTab: true,
							},
						}}
					/>
				),
			}}
		>
			<Content.Dashboard />
		</Layout.Wrapper>
	);
};

export default DashboardRoute;
