import type { AiUsageSessionType } from "@types";
import {
	TbOutlineCalendar,
	TbOutlineChartBar,
	TbOutlineClock,
	TbOutlineCoins,
	TbOutlineCpu,
	TbOutlineLetterT,
} from "solid-icons/tb";
import {
	type Accessor,
	type Component,
	createMemo,
	Index,
	Show,
} from "solid-js";
import AiUsageRecordTableRow from "@/components/AiUsageRecordTableRow/AiUsageRecordTableRow";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import Link from "@/components/Link/Link";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import Table from "@/components/Table/Table";
import useQueryState, {
	pagination,
	sort,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import { getAiUsageSessionTypeLabel } from "@/utils/ai-usage";
import helpers from "@/utils/helpers";

interface AiUsageSessionDrawerProps {
	session: Accessor<{ type: AiUsageSessionType; id: string } | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const AiUsageSessionDrawer: Component<AiUsageSessionDrawerProps> = (props) => {
	// ----------------------------------------
	// Queries
	const session = api.ai.useGetUsageSession({
		type: () => props.session()?.type,
		id: () => props.session()?.id,
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Memos
	const data = createMemo(() => session.data?.data);
	const description = createMemo(() => {
		const current = data();
		if (!current) return undefined;
		return [
			getAiUsageSessionTypeLabel(current.type),
			helpers.formatUserName(current.user, "name") ||
				T()("ai.usage.session.user.system"),
		].join(" · ");
	});

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
			loading={session.isLoading}
			error={session.isError ? T()("errors.generic.message") : undefined}
		>
			<Drawer.Header>
				<Drawer.Title>
					{data()?.conversation?.title ?? T()("panels.ai.usage.session.title")}
				</Drawer.Title>
				<Show when={description()}>
					{(text) => <Drawer.Description>{text()}</Drawer.Description>}
				</Show>
			</Drawer.Header>
			<Drawer.Body>
				<div class="flex h-full flex-col gap-4">
					<AiUsageSessionRecords
						session={props.session}
						open={props.state.open}
					/>
				</div>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Show when={data()?.conversation}>
						{(conversation) => (
							<Link
								href={`/lucid/agent/chats/${conversation().id}`}
								variant="secondary"
								size="md"
							>
								{T()("ai.usage.session.open.chat")}
							</Link>
						)}
					</Show>
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

const AiUsageSessionRecords: Component<{
	session: AiUsageSessionDrawerProps["session"];
	open: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	const records = api.ai.useGetUsageSessionRecords({
		type: () => props.session()?.type,
		id: () => props.session()?.id,
		queryParams: { queryString: searchParams.queryString },
		enabled: () => props.open && searchParams.ready(),
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<div class="flex flex-wrap items-center justify-between gap-2.5">
				<QuerySort
					sorts={[{ label: T()("common.created.at"), key: "createdAt" }]}
					queryState={searchParams}
				/>
				<PerPageSelect options={[10, 20, 50]} queryState={searchParams} />
			</div>
			<QueryBoundary
				error={records.isError}
				empty={records.data?.data.length === 0}
				queryState={searchParams}
				emptyFallback={
					<EmptyState
						title={T()("empty.states.ai.usage.title")}
						description={T()("empty.states.ai.usage.description")}
					/>
				}
				class="h-full flex-1 rounded-md border border-border bg-card"
			>
				<Table.Root
					id="ai-usage.session.records"
					rowCount={records.data?.data.length ?? 0}
					queryState={searchParams}
					columns={[
						{
							label: T()("ai.usage.feature"),
							key: "request",
							icon: <TbOutlineLetterT />,
							minWidth: 200,
						},
						{
							label: T()("ai.usage.usage"),
							key: "usage",
							icon: <TbOutlineChartBar />,
						},
						{
							label: T()("ai.usage.model"),
							key: "model",
							icon: <TbOutlineCpu />,
						},
						{
							label: T()("ai.usage.credits"),
							key: "credits",
							icon: <TbOutlineCoins />,
						},
						{
							label: T()("ai.usage.duration"),
							key: "duration",
							icon: <TbOutlineClock />,
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							icon: <TbOutlineCalendar />,
							sortable: true,
							minWidth: 170,
						},
					]}
					loading={records.isFetching}
					padding="sm"
					variant="secondary"
				>
					<Index each={records.data?.data ?? []}>
						{(record, index) => (
							<AiUsageRecordTableRow index={index} record={record()} />
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={searchParams}
				meta={records.data?.meta}
				variant="inline"
			/>
		</>
	);
};

export default AiUsageSessionDrawer;
