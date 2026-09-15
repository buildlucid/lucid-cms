import type { Component } from "solid-js";
import { DashboardContent } from "@/components/DashboardContent/DashboardContent";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const DashboardPage: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: (
					<PageHeader
						copy={{
							title: T()("routes.dashboard.title", {
								name: userStore.get.user?.firstName
									? `, ${userStore.get.user?.firstName}`
									: "",
							}),
						}}
					/>
				),
			}}
		>
			<DashboardContent />
		</PageLayout>
	);
};

export default DashboardPage;
