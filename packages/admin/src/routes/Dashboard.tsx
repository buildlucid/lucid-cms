import type { Component } from "solid-js";
import { Dashboard } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import userStore from "@/store/userStore";
import T from "@/translations";

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
