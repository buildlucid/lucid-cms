import { DashboardCard } from "@lucidcms/admin/components";
import type { DashboardWidgetProps } from "@lucidcms/admin/types";
import { For } from "solid-js";

/** A sample Home widget: a static checklist passed in through `options`. */
const LaunchChecklist = (props: DashboardWidgetProps<{ items: string[] }>) => {
	// ----------------------------------------
	// Render
	return (
		<DashboardCard title="Launch checklist" padding="md">
			<ul class="flex flex-col gap-2">
				<For each={props.options.items}>
					{(item) => (
						<li class="flex items-center gap-2 text-sm text-body">
							<span class="size-1.5 shrink-0 rounded-full bg-primary" />
							{item}
						</li>
					)}
				</For>
			</ul>
		</DashboardCard>
	);
};

export default LaunchChecklist;
