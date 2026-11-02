import type { Diagnostics } from "@types";
import type { Component } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import T from "@/translations";

/** The queue adapter, schedules, and jobs waiting or recently failed. */
const JobsSection: Component<{
	data: Diagnostics;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.jobs.title")}
			description={T()("diagnostics.jobs.description")}
		>
			<InfoRow.Content>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{ label: T()("common.queue"), value: props.data.jobs.queue },
						{
							label: T()("diagnostics.jobs.schedules"),
							value: props.data.jobs.schedules,
						},
						{
							label: T()("diagnostics.jobs.pending"),
							value: props.data.jobs.pending,
						},
						{
							label: T()("diagnostics.jobs.failed"),
							value: (
								<span
									class={
										props.data.jobs.failedRecently > 0
											? "text-danger"
											: undefined
									}
								>
									{props.data.jobs.failedRecently}
								</span>
							),
						},
					]}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default JobsSection;
