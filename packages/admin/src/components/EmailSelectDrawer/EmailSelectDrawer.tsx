import type { Email, EmailRef } from "@types";
import classnames from "classnames";
import {
	TbOutlineAt,
	TbOutlineCalendar,
	TbOutlineCircleCheck,
	TbOutlineLetterT,
	TbOutlineStack2,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import FilterPanel from "@/components/FilterPanel/FilterPanel";
import FilterToggle from "@/components/FilterToggle/FilterToggle";
import Pagination from "@/components/Pagination/Pagination";
import PerPageSelect from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QuerySort from "@/components/QuerySort/QuerySort";
import RelationCount from "@/components/RelationCount/RelationCount";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import Table from "@/components/Table/Table";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import { emailStatusPills } from "@/utils/emails";
import { emailResponseToRef } from "@/utils/relation-field-helpers";

interface EmailSelectDrawerProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		zIndex?: number;
		multiple?: boolean;
		maxItems?: number;
		allowInternal?: boolean;
		selected?: number[];
		selectedRefs?: EmailRef[];
	};
	callbacks: {
		onSelect: (selection: { value: number[]; refs: EmailRef[] }) => void;
	};
}

const EmailSelectDrawer: Component<EmailSelectDrawerProps> = (props) => {
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
				<Drawer.Title>{T()("emails.select.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<EmailSelectContent
					multiple={props.state.multiple}
					maxItems={props.state.maxItems}
					allowInternal={props.state.allowInternal}
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

interface EmailSelectContentProps {
	multiple?: boolean;
	maxItems?: number;
	allowInternal?: boolean;
	selected?: number[];
	selectedRefs?: EmailRef[];
	onClose: () => void;
	onSelect: (selection: { value: number[]; refs: EmailRef[] }) => void;
}

const EmailSelectContent: Component<EmailSelectContentProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	//* ids drive selection, so saved ids without refs still pre-select their rows
	const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
	const [selectedEmails, setSelectedEmails] = createSignal<EmailRef[]>([]);
	const [filterSectionOpen, setFilterPanelOpen] = createSignal(false);
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				subject: textFilter(),
				toAddress: textFilter(),
				template: textFilter(),
				currentStatus: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				lastAttemptedAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	//* internal emails are listed only when the field opts in, and system notification emails never are
	const emails = api.email.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			filters: {
				type: () =>
					props.allowInternal === true
						? ["external", "internal"]
						: ["external"],
				isSystem: 0,
			},
		},
		enabled: () => searchParams.ready(),
	});

	// ----------------------------------------
	// Memos
	const isMultiple = createMemo(() => props.multiple === true);
	const hasReachedMaxItems = createMemo(
		() =>
			isMultiple() &&
			typeof props.maxItems === "number" &&
			selectedIds().length >= props.maxItems,
	);

	// ----------------------------------------
	// Functions
	const toggleSelectedEmail = (email: Email) => {
		const nextRef = emailResponseToRef(email);

		if (selectedIds().includes(nextRef.id)) {
			setSelectedIds((ids) => ids.filter((id) => id !== nextRef.id));
			setSelectedEmails((refs) => refs.filter((ref) => ref.id !== nextRef.id));
			return;
		}
		if (!isMultiple()) {
			setSelectedIds([nextRef.id]);
			setSelectedEmails([nextRef]);
			return;
		}
		if (hasReachedMaxItems()) return;

		setSelectedIds((ids) => [...ids, nextRef.id]);
		setSelectedEmails((refs) => [...refs, nextRef]);
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedIds(),
			refs: selectedEmails(),
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const refs = props.selectedRefs ?? [];
		setSelectedIds(props.selected ?? refs.map((email) => email.id));
		setSelectedEmails(refs);
	});

	// ----------------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap items-center">
					<FilterToggle
						open={filterSectionOpen()}
						onOpenChange={setFilterPanelOpen}
						queryState={searchParams}
						active={searchParams.hasFiltersApplied()}
						onReset={searchParams.clearFilters}
					/>
					<QuerySort
						sorts={[
							{
								label: T()("common.created.at"),
								key: "createdAt",
							},
							{
								label: T()("common.last.attempt.at"),
								key: "lastAttemptedAt",
							},
						]}
						queryState={searchParams}
					/>
				</div>
				<PerPageSelect options={[10, 20, 40]} queryState={searchParams} />
			</div>

			<FilterPanel
				open={filterSectionOpen()}
				onOpenChange={setFilterPanelOpen}
				subject={T()("common.email")}
				fields={[
					{
						label: T()("common.subject"),
						key: "subject",
						type: "text",
					},
					{
						label: T()("common.to"),
						key: "toAddress",
						type: "text",
					},
					{
						label: T()("email.templates.singular"),
						key: "template",
						type: "text",
					},
					{
						label: T()("common.status"),
						key: "currentStatus",
						type: "select",
						options: [
							{ label: T()("common.status.sent"), value: "sent" },
							{ label: T()("common.status.delivered"), value: "delivered" },
							{ label: T()("common.status.failed"), value: "failed" },
							{ label: T()("common.status.delayed"), value: "delayed" },
							{ label: T()("common.status.complained"), value: "complained" },
							{ label: T()("common.status.bounced"), value: "bounced" },
							{ label: T()("common.status.clicked"), value: "clicked" },
							{ label: T()("common.status.opened"), value: "opened" },
							{ label: T()("common.status.scheduled"), value: "scheduled" },
						],
					},
				]}
				queryState={searchParams}
				embedded={true}
			/>

			<QueryBoundary
				error={emails.isError}
				empty={emails.data?.data.length === 0}
				queryState={searchParams}
				onResetFilters={searchParams.clearFilters}
				emptyFallback={
					<EmptyState
						title={T()("empty.states.emails.title")}
						description={T()("empty.states.emails.description")}
					/>
				}
				class={classnames(
					"flex-1 h-full",
					"grow bg-card border border-border rounded-md",
				)}
			>
				<Table.Root
					id="emails.select"
					rowCount={emails.data?.data.length || 0}
					queryState={searchParams}
					columns={[
						{
							label: "",
							key: "select",
						},
						{
							label: T()("common.status"),
							key: "currentStatus",
							icon: <TbOutlineCircleCheck />,
						},
						{
							label: T()("common.subject"),
							key: "subject",
							icon: <TbOutlineLetterT />,
						},
						{
							label: T()("common.to"),
							key: "toAddress",
							icon: <TbOutlineAt />,
						},
						{
							label: T()("email.templates.singular"),
							key: "template",
							icon: <TbOutlineStack2 />,
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							icon: <TbOutlineCalendar />,
						},
					]}
					loading={emails.isLoading}
					padding="sm"
					variant="secondary"
				>
					<Index each={emails.data?.data || []}>
						{(email, i) => (
							<Table.Row index={i} onClick={() => toggleSelectedEmail(email())}>
								<TableSelectionCell
									column="select"
									type="td"
									value={selectedIds().includes(email().id)}
									onChange={() => toggleSelectedEmail(email())}
									disabled={
										hasReachedMaxItems() && !selectedIds().includes(email().id)
									}
								/>
								<Table.Pill
									column="currentStatus"
									text={email().currentStatus}
									variant={emailStatusPills[email().currentStatus]}
								/>
								<Table.Text
									column="subject"
									text={email().mailDetails.subject}
									maxLines={1}
								/>
								<Table.Text
									column="toAddress"
									text={email().mailDetails.to}
									maxLines={1}
								/>
								<Table.Text
									column="template"
									text={email().mailDetails.template}
									maxLines={1}
								/>
								<Table.Date column="createdAt" date={email().createdAt} />
							</Table.Row>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={searchParams}
				meta={emails.data?.meta}
				variant="inline"
			/>

			<Drawer.Footer class="-mx-4 md:-mx-6">
				<div class="flex flex-wrap items-center gap-3">
					<p class="text-sm text-subtitle">
						<RelationCount
							count={selectedIds().length}
							max={isMultiple() ? props.maxItems : undefined}
						/>{" "}
						{T()("common.selected").toLowerCase()}
					</p>
				</div>
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
					>
						{T()("common.confirm")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</div>
	);
};

export default EmailSelectDrawer;
