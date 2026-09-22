import classnames from "classnames";
import {
	FaSolidCalendar,
	FaSolidCommentDots,
	FaSolidEnvelope,
	FaSolidTag,
} from "solid-icons/fa";
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
import EmailTransactionTableRow from "@/components/EmailTransactionTableRow/EmailTransactionTableRow";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
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

interface ViewEmailTransactionsPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewEmailTransactionsDrawer: Component<
	ViewEmailTransactionsPanelProps
> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.email.transactions.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("panels.email.transactions.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
				<ViewEmailTransactionsPanelContent {...props} />
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

const ViewEmailTransactionsPanelContent: Component<
	ViewEmailTransactionsPanelProps
> = (props) => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				deliveryStatus: textFilter(),
				strategyIdentifier: textFilter(),
				message: textFilter(),
				createdAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				updatedAt: sort(),
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
	const transactions = api.email.useGetTransactions({
		queryParams: {
			queryString: searchParams.queryString,
			location: { emailId: props.id },
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
								{ label: T()("common.updated.at"), key: "updatedAt" },
							]}
							queryState={searchParams}
						/>
					</div>
					<PerPageSelect options={[5, 10, 20]} queryState={searchParams} />
				</div>
				<FilterPanel
					open={filterSectionOpen()}
					onOpenChange={setFilterPanelOpen}
					subject={T()("panels.email.transactions.title")}
					fields={[
						{
							label: T()("common.status"),
							key: "deliveryStatus",
							type: "select",
							options: [
								{ label: T()("common.status.sent"), value: "sent" },
								{ label: T()("common.status.delivered"), value: "delivered" },
								{ label: T()("common.status.failed"), value: "failed" },
								{ label: T()("common.status.delayed"), value: "delayed" },
								{ label: T()("common.status.bounced"), value: "bounced" },
							],
						},
						{
							label: T()("common.identifier"),
							key: "strategyIdentifier",
							type: "text",
						},
						{
							label: T()("common.message"),
							key: "message",
							type: "text",
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
					isError={transactions.isError}
					isEmpty={transactions.data?.data.length === 0}
					empty={
						<EmptyState
							title={T()("empty.states.email.transactions.title")}
							description={T()("empty.states.email.transactions.description")}
						/>
					}
					class={classnames(
						"flex-1 h-full",
						"rounded-md border border-border bg-card-base",
					)}
				>
					<Table.Root
						id="email.transactions"
						rowCount={transactions.data?.data.length ?? 0}
						queryState={searchParams}
						head={[
							{
								label: T()("common.status"),
								key: "status",
								icon: <FaSolidEnvelope />,
							},
							{
								label: T()("common.identifier"),
								key: "identifier",
								icon: <FaSolidTag />,
							},
							{
								label: T()("common.message"),
								key: "message",
								icon: <FaSolidCommentDots />,
							},
							{
								label: T()("common.created.at"),
								key: "createdAt",
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
						isLoading={transactions.isFetching}
						padding="sm"
						variant="secondary"
					>
						<Index each={transactions.data?.data ?? []}>
							{(transaction, index) => (
								<EmailTransactionTableRow
									index={index}
									transaction={transaction()}
								/>
							)}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={transactions.data?.meta}
					variant="inline"
				/>
			</Show>
		</div>
	);
};

export default ViewEmailTransactionsDrawer;
