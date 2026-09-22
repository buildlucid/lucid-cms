import classnames from "classnames";
import { FaSolidCalendar, FaSolidListOl, FaSolidT } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import JobTableRow from "@/components/JobTableRow/JobTableRow";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import Table from "@/components/Table/Table";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

interface ViewScheduleRunsPanelProps {
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewScheduleRunsDrawer: Component<ViewScheduleRunsPanelProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.jobs.schedules.runs.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("panels.jobs.schedules.runs.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
				<ViewScheduleRunsPanelContent {...props} />
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
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
		singleSort: true,
	});
	const [filterSectionOpen, setFilterPanelOpen] = createSignal(false);

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
						<FilterToggle
							open={filterSectionOpen()}
							onOpenChange={setFilterPanelOpen}
							queryState={searchParams}
						/>
						<QuerySort
							sorts={[
								{ label: T()("common.created.at"), key: "createdAt" },
								{ label: T()("common.attempts"), key: "attempts" },
							]}
							queryState={searchParams}
						/>
					</div>
					<PerPageSelect options={[5, 10, 20]} queryState={searchParams} />
				</div>
				<FilterPanel
					open={filterSectionOpen()}
					onOpenChange={setFilterPanelOpen}
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
					queryState={searchParams}
					embedded
				/>
				<QueryBoundary
					error={jobs.isError}
					empty={jobs.data?.data.length === 0}
					emptyFallback={
						<EmptyState
							title={T()("empty.states.jobs.title")}
							description={T()("empty.states.jobs.description")}
						/>
					}
					class={classnames(
						"flex-1 h-full",
						"rounded-md border border-border bg-card",
					)}
				>
					<Table.Root
						id="jobs.schedule-runs"
						rowCount={jobs.data?.data.length ?? 0}
						queryState={searchParams}
						columns={[
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
						loading={jobs.isFetching}
						padding="sm"
						variant="secondary"
					>
						<Index each={jobs.data?.data ?? []}>
							{(job, index) => <JobTableRow index={index} job={job()} />}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={jobs.data?.meta}
					variant="inline"
				/>
			</Show>
		</div>
	);
};

export default ViewScheduleRunsDrawer;
