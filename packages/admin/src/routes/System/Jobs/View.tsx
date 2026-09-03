import type { Component } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { JobSchedulesList, JobsList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import T from "@/translations";

const SystemJobsRoute: Component = () => {
	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
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
		</Wrapper>
	);
};

export default SystemJobsRoute;
