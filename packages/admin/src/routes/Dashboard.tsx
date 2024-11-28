import T from "@/translations";
import type { Component } from "solid-js";
import userStore from "@/store/userStore";
import { FaSolidCode } from "solid-icons/fa";
import constants from "@/constants";
import { Dashboard } from "@/components/Groups/Content";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";

const DashboardRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
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
			<Dashboard />
		</Wrapper>
	);
};

export default DashboardRoute;
