import { FaSolidEnvelope, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import {
	FilterSection,
	FilterSectionToggle,
} from "@/components/Groups/Query/FilterSection";
import { PerPage } from "@/components/Groups/Query/PerPage";
import { ResetFilters } from "@/components/Groups/Query/ResetFilters";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import { Td } from "@/components/Groups/Table/Td";
import { Tr } from "@/components/Groups/Table/Tr";
import UserDisplay from "@/components/Partials/UserDisplay";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { UserRelationRef } from "@/utils/relation-field-helpers";
import { userResponseToRef } from "@/utils/relation-field-helpers";

interface UserSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		multiple?: boolean;
		selected?: number[];
		selectedRefs?: UserRelationRef[];
	};
	callbacks: {
		onSelect: (selection: { value: number[]; refs: UserRelationRef[] }) => void;
	};
}

const UserSelectPanel: Component<UserSelectPanelProps> = (props) => {
	return (
		<BottomPanel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			options={{
				padding: "24",
				hideFooter: true,
				growContent: true,
			}}
			copy={{
				title: T()("users.select.title"),
			}}
		>
			{() => (
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
			)}
		</BottomPanel>
	);
};

interface UserSelectContentProps {
	multiple?: boolean;
	selected?: number[];
	selectedRefs?: UserRelationRef[];
	onClose: () => void;
	onSelect: (selection: { value: number[]; refs: UserRelationRef[] }) => void;
}

const UserSelectContent: Component<UserSelectContentProps> = (props) => {
	//* ids drive selection - refs only exist for users picked this session, so
	//* URL-hydrated ids without refs still pre-select their rows
	const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
	const [selectedUsers, setSelectedUsers] = createSignal<UserRelationRef[]>([]);
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);
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
			label:
				helpers.getTranslation(
					role.name,
					contentLocaleStore.get.contentLocale,
				) ??
				role.name[0]?.value ??
				String(role.id),
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
					<FilterSectionToggle
						open={filterSectionOpen()}
						onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
						searchParams={searchParams}
						active={searchParams.hasFiltersApplied()}
					/>
					<Sort
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
						searchParams={searchParams}
					/>
					<Show when={searchParams.hasFiltersApplied()}>
						<ResetFilters onReset={searchParams.clearFilters} />
					</Show>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<FilterSection
				open={filterSectionOpen()}
				setOpen={setFilterSectionOpen}
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
				searchParams={searchParams}
				embedded={true}
			/>

			<DynamicContent
				class="grow bg-card-base border border-border rounded-md"
				state={{
					isError: users.isError,
					isSuccess: users.isSuccess,
					isEmpty: users.data?.data.length === 0,
					searchParams: searchParams,
				}}
				slot={{
					footer: (
						<Paginated
							state={{
								searchParams: searchParams,
								meta: users.data?.meta,
							}}
							options={{
								embedded: true,
							}}
						/>
					),
				}}
				copy={{
					noEntries: {
						title: T()("empty.states.users.title"),
						description: T()("empty.states.users.description"),
					},
				}}
				callback={{
					resetFilters: searchParams.clearFilters,
				}}
			>
				<Table
					key={"users.select"}
					rows={users.data?.data.length || 0}
					searchParams={searchParams}
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
					state={{
						isLoading: isLoading(),
						isSuccess: users.isSuccess,
					}}
					options={{
						isSelectable: false,
						padding: "16",
					}}
					theme="secondary"
				>
					{({ include, isSelectable, selected, setSelected }) => (
						<Index each={users.data?.data || []}>
							{(user, i) => (
								<Tr
									index={i}
									selected={selected[i]}
									options={{
										isSelectable,
										padding: "16",
									}}
									callbacks={{
										setSelected,
									}}
									onClick={() => toggleSelectedUser(user())}
									theme="secondary"
								>
									<SelectCol
										type="td"
										value={selectedUserIds().includes(user().id)}
										onChange={() => toggleSelectedUser(user())}
										theme="secondary"
										padding="16"
									/>
									<Td
										options={{
											include: include[1],
											padding: "16",
										}}
									>
										<UserDisplay
											user={{
												username: user().username,
												firstName: user().firstName,
												lastName: user().lastName,
												profilePicture: user().profilePicture,
											}}
											mode="short"
											size="small"
											nameFormat="username-only"
										/>
									</Td>
									<TextCol
										text={user().firstName}
										options={{ include: include[2] }}
									/>
									<TextCol
										text={user().lastName}
										options={{ include: include[3] }}
									/>
									<TextCol
										text={user().email}
										options={{ include: include[4] }}
									/>
								</Tr>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>

			<PanelFooterActions
				selectedCount={selectedUserIds().length}
				onClose={props.onClose}
				onConfirm={confirmSelection}
			/>
		</div>
	);
};

export default UserSelectPanel;
