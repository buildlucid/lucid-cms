import type { Component } from "solid-js";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import InfoRow from "@/components/InfoRow/InfoRow";
import { JobSchedulesList } from "@/components/JobSchedulesList/JobSchedulesList";
import { JobsList } from "@/components/JobsList/JobsList";
import PageLayout from "@/components/PageLayout/PageLayout";
import SystemSettingsHeader from "@/components/SystemSettingsHeader/SystemSettingsHeader";
import T from "@/translations";

const SystemJobsPage: Component = () => {
	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<SystemSettingsHeader />
			<PageLayout.Body>
				<DynamicContent options={{ padding: "24" }}>
					<InfoRow.Root
						title={T()("routes.system.jobs.schedules.title")}
						description={T()("routes.system.jobs.schedules.description")}
					>
						<InfoRow.Content>
							<div class="-mx-4 overflow-hidden">
								<JobSchedulesList />
							</div>
						</InfoRow.Content>
					</InfoRow.Root>
					<InfoRow.Root
						title={T()("routes.system.jobs.title")}
						description={T()("routes.system.jobs.description")}
					>
						<InfoRow.Content>
							<div class="-mx-4 overflow-hidden">
								<JobsList />
							</div>
						</InfoRow.Content>
					</InfoRow.Root>
				</DynamicContent>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemJobsPage;
