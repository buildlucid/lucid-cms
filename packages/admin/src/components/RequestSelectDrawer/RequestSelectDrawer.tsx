import type { RequestSummary } from "@types";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidT,
	FaSolidTag,
	FaSolidUser,
	FaSolidUsers,
} from "solid-icons/fa";
import { type Component, createEffect, createSignal, Index } from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import RequestTableRow from "@/components/RequestTableRow/RequestTableRow";
import Table from "@/components/Table/Table";
import useQueryState, {
	booleanFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

interface RequestSelectDrawerProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		/** Only requests this document can be added to are listed. */
		document: { collectionKey: string; documentId: number };
		selected?: RequestSummary;
		zIndex?: number;
	};
	callbacks: {
		onSelect: (request: RequestSummary) => void;
	};
}

/** Picks an open publish request for a document in a bottom panel. */
const RequestSelectDrawer: Component<RequestSelectDrawerProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
			zIndex={props.state.zIndex}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("requests.select.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<RequestSelectContent
					document={props.state.document}
					selected={props.state.selected}
					onClose={() => props.state.setOpen(false)}
					onSelect={(request) => {
						props.callbacks.onSelect(request);
						props.state.setOpen(false);
					}}
				/>
			</Drawer.Body>
		</Drawer.Root>
	);
};

const RequestSelectContent: Component<{
	document: { collectionKey: string; documentId: number };
	selected?: RequestSummary;
	onClose: () => void;
	onSelect: (request: RequestSummary) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [selected, setSelected] = createSignal<RequestSummary>();
	const [filterPanelOpen, setFilterPanelOpen] = createSignal(false);
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				title: textFilter(),
				approval: textFilter(),
				assignedToMe: booleanFilter(),
				scheduled: booleanFilter(),
			},
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
				scheduledAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	const requests = api.requests.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			filters: {
				addable: () =>
					`${props.document.collectionKey}:${props.document.documentId}`,
			},
		},
		enabled: () => searchParams.ready(),
	});
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Functions
	const toggleSelected = (request: RequestSummary) => {
		setSelected((current) =>
			current?.id === request.id ? undefined : request,
		);
	};
	const confirmSelection = () => {
		const request = selected();
		if (request) props.onSelect(request);
	};

	// ----------------------------------------
	// Effects
	createEffect(() => setSelected(props.selected));

	// ----------------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap items-center">
					<FilterToggle
						open={filterPanelOpen()}
						onOpenChange={setFilterPanelOpen}
						queryState={searchParams}
						active={searchParams.hasFiltersApplied()}
						onReset={searchParams.clearFilters}
					/>
					<QuerySort
						sorts={[
							{ label: T()("common.updated.at"), key: "updatedAt" },
							{ label: T()("common.created.at"), key: "createdAt" },
							{ label: T()("common.scheduled.for"), key: "scheduledAt" },
						]}
						queryState={searchParams}
					/>
				</div>
				<PerPageSelect options={[10, 20, 40]} queryState={searchParams} />
			</div>

			<FilterPanel
				open={filterPanelOpen()}
				onOpenChange={setFilterPanelOpen}
				subject={T()("requests.title")}
				fields={[
					{ label: T()("common.title"), key: "title", type: "text" },
					{
						label: T()("requests.filter.approval"),
						key: "approval",
						type: "select",
						options: [
							{ label: T()("requests.state.approved"), value: "approved" },
							{ label: T()("requests.state.pending"), value: "pending" },
						],
					},
					{
						label: T()("requests.filter.assigned"),
						key: "assignedToMe",
						type: "checkbox",
					},
					{
						label: T()("requests.filter.scheduled"),
						key: "scheduled",
						type: "checkbox",
					},
				]}
				queryState={searchParams}
				embedded={true}
			/>

			<QueryBoundary
				error={requests.isError}
				empty={requests.data?.data.length === 0}
				queryState={searchParams}
				onResetFilters={searchParams.clearFilters}
				emptyFallback={
					<EmptyState
						title={T()("requests.empty.title")}
						description={T()("requests.select.empty.description")}
					/>
				}
				class="flex-1 h-full grow bg-card border border-border rounded-md"
			>
				<Table.Root
					id="requests.select"
					rowCount={requests.data?.data.length ?? 0}
					queryState={searchParams}
					columns={[
						{ label: "", key: "select" },
						{
							label: T()("requests.request"),
							key: "title",
							icon: <FaSolidT />,
							minWidth: 280,
						},
						{
							label: T()("requests.type"),
							key: "type",
							icon: <FaSolidTag />,
						},
						{
							label: T()("common.status"),
							key: "status",
							icon: <FaSolidCircleCheck />,
						},
						{
							label: T()("requests.reviewers"),
							key: "reviewers",
							icon: <FaSolidUsers />,
						},
						{
							label: T()("common.created.by"),
							key: "createdBy",
							icon: <FaSolidUser />,
						},
						{
							label: T()("common.scheduled.for"),
							key: "scheduledAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
						{
							label: T()("common.updated.at"),
							key: "updatedAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
					]}
					loading={requests.isFetching}
					padding="sm"
					variant="secondary"
				>
					<Index each={requests.data?.data ?? []}>
						{(request, index) => (
							<RequestTableRow
								index={index}
								request={request()}
								collections={collections.data?.data ?? []}
								onClick={() => toggleSelected(request())}
								selection={{
									selected: selected()?.id === request().id,
									onChange: () => toggleSelected(request()),
								}}
							/>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={searchParams}
				meta={requests.data?.meta}
				variant="inline"
			/>

			<Drawer.Footer class="-mx-4 md:-mx-6">
				<Drawer.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						onClick={props.onClose}
					>
						{T()("common.close")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={confirmSelection}
						disabled={selected() === undefined}
					>
						{T()("common.confirm")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</div>
	);
};

export default RequestSelectDrawer;
