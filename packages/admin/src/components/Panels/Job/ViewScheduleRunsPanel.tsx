import { FaSolidCalendar, FaSolidListOl, FaSolidT } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import {
	FilterSection,
	FilterSectionToggle,
} from "@/components/Groups/Query/FilterSection";
import { PerPage } from "@/components/Groups/Query/PerPage";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import JobRow from "@/components/Tables/Rows/JobRow";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import T from "@/translations";

interface ViewScheduleRunsPanelProps {
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewScheduleRunsPanel: Component<ViewScheduleRunsPanelProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<BottomPanel
			state={{ open: props.state.open, setOpen: props.state.setOpen }}
			fetchState={{ isLoading: false, isError: false }}
			options={{ padding: "24", growContent: true }}
			copy={{
				title: T()("panels.jobs.schedules.runs.title"),
				description: T()("panels.jobs.schedules.runs.description"),
			}}
		>
			{() => <ViewScheduleRunsPanelContent {...props} />}
		</BottomPanel>
	);
};

const ViewScheduleRunsPanelContent: Component<ViewScheduleRunsPanelProps> = (
	props,
) => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				status: textFilter(),
				createdAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				attempts: sort(),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		options: { singleSort: true },
	});
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const canFetch = createMemo(
		() => props.state.open && props.id() !== undefined && searchParams.ready(),
	);

	// ----------------------------------
	// Queries
	const jobs = api.jobs.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			filters: { scheduleKey: props.id },
		},
		enabled: canFetch,
	});

	// ----------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<Show when={props.id() !== undefined}>
				<div class="mb-4 flex flex-wrap items-center justify-between gap-2.5">
					<div class="flex gap-2.5">
						<FilterSectionToggle
							open={filterSectionOpen()}
							onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
							searchParams={searchParams}
						/>
						<Sort
							sorts={[
								{ label: T()("common.created.at"), key: "createdAt" },
								{ label: T()("common.attempts"), key: "attempts" },
							]}
							searchParams={searchParams}
						/>
					</div>
					<PerPage options={[5, 10, 20]} searchParams={searchParams} />
				</div>
				<FilterSection
					open={filterSectionOpen()}
					setOpen={setFilterSectionOpen}
					subject={T()("panels.jobs.schedules.runs.title")}
					fields={[
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: [
								{ label: T()("common.status.queued"), value: "queued" },
								{ label: T()("common.status.running"), value: "running" },
								{
									label: T()("common.status.completed"),
									value: "completed",
								},
								{ label: T()("common.status.failed"), value: "failed" },
								{
									label: T()("common.status.cancelled"),
									value: "cancelled",
								},
							],
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							type: "datetime",
						},
					]}
					searchParams={searchParams}
					embedded
				/>
				<DynamicContent
					class="rounded-md border border-border bg-card-base"
					state={{
						isError: jobs.isError,
						isSuccess: jobs.isSuccess,
						isEmpty: jobs.data?.data.length === 0,
						searchParams,
					}}
					slot={{
						footer: (
							<Paginated
								state={{ searchParams, meta: jobs.data?.meta }}
								options={{ embedded: true }}
							/>
						),
					}}
					copy={{
						noEntries: {
							title: T()("empty.states.jobs.title"),
							description: T()("empty.states.jobs.description"),
						},
					}}
				>
					<Table
						key="jobs.schedule-runs"
						rows={jobs.data?.data.length ?? 0}
						searchParams={searchParams}
						head={[
							{
								label: T()("common.status"),
								key: "status",
								icon: <FaSolidT />,
							},
							{
								label: T()("common.job"),
								key: "job",
								icon: <FaSolidT />,
								minWidth: 260,
							},
							{
								label: T()("jobs.trigger.type"),
								key: "trigger",
								icon: <FaSolidT />,
							},
							{
								label: T()("common.attempts"),
								key: "attempts",
								icon: <FaSolidListOl />,
								sortable: true,
							},
							{
								label: T()("common.created.at"),
								key: "createdAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
							{
								label: T()("common.finished.at"),
								key: "finishedAt",
								icon: <FaSolidCalendar />,
							},
						]}
						state={{ isLoading: jobs.isFetching, isSuccess: jobs.isSuccess }}
						options={{ isSelectable: false, padding: "16" }}
						theme="secondary"
					>
						{({ include, isSelectable, selected, setSelected }) => (
							<Index each={jobs.data?.data ?? []}>
								{(job, index) => (
									<JobRow
										index={index}
										job={job()}
										include={include}
										selected={selected[index]}
										options={{ isSelectable, padding: "16" }}
										callbacks={{ setSelected }}
										theme="secondary"
									/>
								)}
							</Index>
						)}
					</Table>
				</DynamicContent>
			</Show>
		</div>
	);
};

export default ViewScheduleRunsPanel;
