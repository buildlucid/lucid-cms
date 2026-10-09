import type { Component } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import { JobSchedulesList } from "@/components/JobSchedulesList/JobSchedulesList";
import { JobsList } from "@/components/JobsList/JobsList";
import PageLayout from "@/components/PageLayout/PageLayout";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import T from "@/translations";

const SystemJobsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.jobs.title"));

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.jobs.title")}
				description={T()("routes.system.jobs.description")}
			/>
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
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
				</div>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemJobsPage;
