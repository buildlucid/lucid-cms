import type { Component } from "solid-js";
import { DashboardContent } from "@/components/DashboardContent/DashboardContent";
import PageLayout from "@/components/PageLayout/PageLayout";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const DashboardPage: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.dashboard.title", {
					name: userStore.get.user?.firstName
						? `, ${userStore.get.user?.firstName}`
						: "",
				})}
			/>
			<PageLayout.Body>
				<DashboardContent />
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default DashboardPage;
