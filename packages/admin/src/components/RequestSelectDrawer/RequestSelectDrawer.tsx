import type { RequestSummary } from "@types";
import {
	TbOutlineCalendar,
	TbOutlineCircleCheck,
	TbOutlineLetterT,
	TbOutlineTag,
	TbOutlineUser,
	TbOutlineUsers,
} from "solid-icons/tb";
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

/** The picked request IDs, with the requests that were shown when picked. */
type RequestSelection = { value: number[]; refs: RequestSummary[] };

interface RequestSelectDrawerProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		/** Only lists requests this document can be added to. Open requests are listed without it. */
		document?: { collectionKey: string; documentId: number };
		multiple?: boolean;
		selected?: number[];
		/** Details of already selected requests, so confirming them again keeps them. */
		selectedRefs?: RequestSummary[];
		zIndex?: number;
	};
	callbacks: {
		onSelect: (selection: RequestSelection) => void;
	};
}

/** Picks open requests in a bottom panel, eg. a publish request to add a document to. */
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
					multiple={props.state.multiple}
					selected={props.state.selected}
					selectedRefs={props.state.selectedRefs}
					onClose={() => props.state.setOpen(false)}
					onSelect={(selection) => {
						props.callbacks.onSelect(selection);
						props.state.setOpen(false);
					}}
				/>
			</Drawer.Body>
		</Drawer.Root>
	);
};

const RequestSelectContent: Component<{
	document?: { collectionKey: string; documentId: number };
	multiple?: boolean;
	selected?: number[];
	selectedRefs?: RequestSummary[];
	onClose: () => void;
	onSelect: (selection: RequestSelection) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [selected, setSelected] = createSignal<number[]>([]);
	//* picked requests, kept so they still come back after changing page
	const picked = new Map<number, RequestSummary>();
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
					props.document
						? `${props.document.collectionKey}:${props.document.documentId}`
						: undefined,
				status: () => (props.document ? undefined : "open"),
			},
		},
		enabled: () => searchParams.ready(),
	});
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Functions
	const toggleSelected = (request: RequestSummary) => {
		picked.set(request.id, request);
		setSelected((current) => {
			if (current.includes(request.id)) {
				return current.filter((id) => id !== request.id);
			}
			return props.multiple ? [...current, request.id] : [request.id];
		});
	};
	const confirmSelection = () =>
		props.onSelect({
			value: selected(),
			refs: selected().flatMap((id) => {
				const request =
					picked.get(id) ??
					requests.data?.data.find((candidate) => candidate.id === id);
				return request ? [request] : [];
			}),
		});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		for (const request of props.selectedRefs ?? []) {
			picked.set(request.id, request);
		}
		setSelected(props.selected ?? []);
	});

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
							icon: <TbOutlineLetterT />,
							minWidth: 280,
						},
						{
							label: T()("requests.type"),
							key: "type",
							icon: <TbOutlineTag />,
						},
						{
							label: T()("common.status"),
							key: "status",
							icon: <TbOutlineCircleCheck />,
						},
						{
							label: T()("requests.reviewers"),
							key: "reviewers",
							icon: <TbOutlineUsers />,
						},
						{
							label: T()("common.created.by"),
							key: "createdBy",
							icon: <TbOutlineUser />,
						},
						{
							label: T()("common.scheduled.for"),
							key: "scheduledAt",
							icon: <TbOutlineCalendar />,
							sortable: true,
						},
						{
							label: T()("common.updated.at"),
							key: "updatedAt",
							icon: <TbOutlineCalendar />,
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
									selected: selected().includes(request().id),
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
						disabled={!props.multiple && selected().length === 0}
					>
						{T()("common.confirm")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</div>
	);
};

export default RequestSelectDrawer;
