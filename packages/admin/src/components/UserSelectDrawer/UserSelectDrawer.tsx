import classnames from "classnames";
import { FaSolidEnvelope, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	type JSXElement,
	Show,
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
import ResetFilters from "@/components/ResetFilters/ResetFilters";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import Table from "@/components/Table/Table";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import type { UserRelationRef } from "@/utils/relation-field-helpers";
import { userResponseToRef } from "@/utils/relation-field-helpers";

interface UserSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		zIndex?: number;
		multiple?: boolean;
		selected?: number[];
		selectedRefs?: UserRelationRef[];
	};
	callbacks: {
		onSelect: (selection: { value: number[]; refs: UserRelationRef[] }) => void;
	};
}

/** Renders the reusable user selector in a bottom panel. */
const UserSelectDrawer: Component<UserSelectPanelProps> = (props) => {
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
				<Drawer.Title>{T()("users.select.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<UserSelectContent
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

interface UserSelectContentProps {
	multiple?: boolean;
	selected?: number[];
	selectedRefs?: UserRelationRef[];
	topbarSlot?: JSXElement;
	onClose: () => void;
	onSelect: (selection: { value: number[]; refs: UserRelationRef[] }) => void;
}

export const UserSelectContent: Component<UserSelectContentProps> = (props) => {
	//* ids drive selection - refs only exist for users picked this session, so
	//* URL-hydrated ids without refs still pre-select their rows
	const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
	const [selectedUsers, setSelectedUsers] = createSignal<UserRelationRef[]>([]);
	const [filterSectionOpen, setFilterPanelOpen] = createSignal(false);
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedUserIds = createMemo(() => selectedIds());
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				username: textFilter(),
				firstName: textFilter(),
				lastName: textFilter(),
				email: textFilter(),
				roleIds: numberFilter(),
				isLocked: booleanFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				firstName: sort(),
				lastName: sort(),
				email: sort(),
				username: sort(),
				isLocked: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
	});

	const users = api.users.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			filters: {
				isDeleted: 0,
			},
		},
		enabled: () => searchParams.ready(),
	});
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: { permissions: false },
			perPage: -1,
		},
	});

	const isLoading = createMemo(() => users.isLoading);
	const roleOptions = createMemo(() =>
		(roles.data?.data ?? []).map((role) => ({
			value: String(role.id),
			label: role.name,
		})),
	);

	createEffect(() => {
		const refs = props.selectedRefs ?? [];
		setSelectedIds(props.selected ?? refs.map((user) => user.id));
		setSelectedUsers(refs);
	});

	const toggleSelectedUser = (
		user: Parameters<typeof userResponseToRef>[0],
	) => {
		const nextRef = userResponseToRef(user);

		if (selectedIds().includes(nextRef.id)) {
			setSelectedIds((ids) => ids.filter((id) => id !== nextRef.id));
			setSelectedUsers((refs) => refs.filter((ref) => ref.id !== nextRef.id));
			return;
		}
		if (!isMultiple()) {
			setSelectedIds([nextRef.id]);
			setSelectedUsers([nextRef]);
			return;
		}
		setSelectedIds((ids) => [...ids, nextRef.id]);
		setSelectedUsers((refs) => [...refs, nextRef]);
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedIds(),
			refs: selectedUsers(),
		});
	};

	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap items-center">
					<FilterToggle
						open={filterSectionOpen()}
						onOpenChange={setFilterPanelOpen}
						queryState={searchParams}
						active={searchParams.hasFiltersApplied()}
					/>
					<QuerySort
						sorts={[
							{
								label: T()("common.username"),
								key: "username",
							},
							{
								label: T()("common.first.name"),
								key: "firstName",
							},
							{
								label: T()("common.last.name"),
								key: "lastName",
							},
							{
								label: T()("common.email"),
								key: "email",
							},
							{
								label: T()("users.status.locked.label"),
								key: "isLocked",
							},
							{
								label: T()("common.created.at"),
								key: "createdAt",
							},
						]}
						queryState={searchParams}
					/>
					{props.topbarSlot}
					<Show when={searchParams.hasFiltersApplied()}>
						<ResetFilters onReset={searchParams.clearFilters} />
					</Show>
				</div>
				<PerPageSelect options={[10, 20, 40]} queryState={searchParams} />
			</div>

			<FilterPanel
				open={filterSectionOpen()}
				onOpenChange={setFilterPanelOpen}
				subject={T()("common.user")}
				fields={[
					{
						label: T()("common.username"),
						key: "username",
						type: "text",
					},
					{
						label: T()("common.first.name"),
						key: "firstName",
						type: "text",
					},
					{
						label: T()("common.last.name"),
						key: "lastName",
						type: "text",
					},
					{
						label: T()("common.email"),
						key: "email",
						type: "text",
					},
					{
						label: T()("common.role"),
						key: "roleIds",
						type: "select",
						options: roleOptions(),
					},
					{
						label: T()("users.status.locked.label"),
						key: "isLocked",
						type: "checkbox",
						trueLabel: T()("common.status.locked"),
						falseLabel: T()("common.status.unlocked"),
					},
				]}
				queryState={searchParams}
				embedded={true}
			/>

			<QueryBoundary
				isError={users.isError}
				isEmpty={users.data?.data.length === 0}
				queryState={searchParams}
				onResetFilters={searchParams.clearFilters}
				empty={
					<EmptyState
						title={T()("empty.states.users.title")}
						description={T()("empty.states.users.description")}
					/>
				}
				class={classnames(
					"flex-1 h-full",
					"grow bg-card-base border border-border rounded-md",
				)}
			>
				<Table.Root
					id="users.select"
					rowCount={users.data?.data.length || 0}
					queryState={searchParams}
					head={[
						{
							label: "",
							key: "select",
						},
						{
							label: T()("common.username"),
							key: "username",
							icon: <FaSolidIdCard />,
						},
						{
							label: T()("common.first.name"),
							key: "firstName",
							icon: <FaSolidT />,
						},
						{
							label: T()("common.last.name"),
							key: "lastName",
							icon: <FaSolidT />,
						},
						{
							label: T()("common.email"),
							key: "email",
							icon: <FaSolidEnvelope />,
						},
					]}
					isLoading={isLoading()}
					padding="sm"
					variant="secondary"
				>
					<Index each={users.data?.data || []}>
						{(user, i) => (
							<Table.Row index={i} onClick={() => toggleSelectedUser(user())}>
								<TableSelectionCell
									column="select"
									type="td"
									value={selectedUserIds().includes(user().id)}
									onChange={() => toggleSelectedUser(user())}
								/>
								<Table.Cell column="username">
									<UserDisplay
										user={{
											username: user().username,
											firstName: user().firstName,
											lastName: user().lastName,
											profilePicture: user().profilePicture,
										}}
										variant="horizontal"
										size="sm"
										nameFormat="username-only"
									/>
								</Table.Cell>
								<Table.Text column="firstName" text={user().firstName} />
								<Table.Text column="lastName" text={user().lastName} />
								<Table.Text column="email" text={user().email} />
							</Table.Row>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={searchParams}
				meta={users.data?.meta}
				variant="inline"
			/>

			<Drawer.Footer class="-mx-4 md:-mx-6">
				<div class="flex flex-wrap items-center gap-3">
					<p class="text-sm text-subtitle">
						{selectedUserIds().length} {T()("common.selected").toLowerCase()}
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

export default UserSelectDrawer;
