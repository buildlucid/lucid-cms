import T from "@/translations";
import type { Component } from "solid-js";
import userStore from "@/store/userStore";
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
					/>
				),
			}}
		>
			<Dashboard />
		</Wrapper>
	);
};

export default DashboardRoute;
