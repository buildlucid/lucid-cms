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
import EmailTransactionRow from "@/components/Tables/Rows/EmailTransactionRow";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import T from "@/translations";

interface ViewEmailTransactionsPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewEmailTransactionsPanel: Component<ViewEmailTransactionsPanelProps> = (
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
				title: T()("panels.email.transactions.title"),
				description: T()("panels.email.transactions.description"),
			}}
		>
			{() => <ViewEmailTransactionsPanelContent {...props} />}
		</BottomPanel>
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
						<FilterSectionToggle
							open={filterSectionOpen()}
							onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
							searchParams={searchParams}
						/>
						<Sort
							sorts={[
								{ label: T()("common.created.at"), key: "createdAt" },
								{ label: T()("common.updated.at"), key: "updatedAt" },
							]}
							searchParams={searchParams}
						/>
					</div>
					<PerPage options={[5, 10, 20]} searchParams={searchParams} />
				</div>
				<FilterSection
					open={filterSectionOpen()}
					setOpen={setFilterSectionOpen}
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
					searchParams={searchParams}
					embedded
				/>
				<DynamicContent
					class="rounded-md border border-border bg-card-base"
					state={{
						isError: transactions.isError,
						isSuccess: transactions.isSuccess,
						isEmpty: transactions.data?.data.length === 0,
						searchParams,
					}}
					slot={{
						footer: (
							<Paginated
								state={{ searchParams, meta: transactions.data?.meta }}
								options={{ embedded: true }}
							/>
						),
					}}
					copy={{
						noEntries: {
							title: T()("empty.states.email.transactions.title"),
							description: T()("empty.states.email.transactions.description"),
						},
					}}
				>
					<Table
						key="email.transactions"
						rows={transactions.data?.data.length ?? 0}
						searchParams={searchParams}
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
						state={{
							isLoading: transactions.isFetching,
							isSuccess: transactions.isSuccess,
						}}
						options={{ isSelectable: false, padding: "16" }}
						theme="secondary"
					>
						{({ include, isSelectable, selected, setSelected }) => (
							<Index each={transactions.data?.data ?? []}>
								{(transaction, index) => (
									<EmailTransactionRow
										index={index}
										transaction={transaction()}
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

export default ViewEmailTransactionsPanel;
