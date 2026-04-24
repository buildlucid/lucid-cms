import { FaSolidEnvelope, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import { Filter, PerPage } from "@/components/Groups/Query";
import { Table, Td, Tr } from "@/components/Groups/Table";
import UserDisplay from "@/components/Partials/UserDisplay";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import T from "@/translations";
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
				title: T()("select_user_title"),
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
	const [selectedUsers, setSelectedUsers] = createSignal<UserRelationRef[]>([]);
	const isMultiple = createMemo(() => props.multiple === true);
	const selectedUserIds = createMemo(() =>
		selectedUsers().map((user) => user.id),
	);
	const searchParams = useSearchParamsState({
		filters: {
			username: {
				value: "",
				type: "text",
			},
			firstName: {
				value: "",
				type: "text",
			},
			lastName: {
				value: "",
				type: "text",
			},
			email: {
				value: "",
				type: "text",
			},
		},
		sorts: {
			createdAt: "desc",
		},
		pagination: {
			perPage: 20,
		},
	});

	const users = api.users.useGetMultiple({
		queryParams: {
			queryString: searchParams.getQueryString,
			filters: {
				isDeleted: 0,
			},
		},
		enabled: () => searchParams.getSettled(),
	});

	const isLoading = createMemo(() => users.isLoading);

	createEffect(() => {
		if (!props.selectedRefs) {
			setSelectedUsers([]);
			return;
		}

		setSelectedUsers(props.selectedRefs);
	});

	const toggleSelectedUser = (
		user: Parameters<typeof userResponseToRef>[0],
	) => {
		const nextRef = userResponseToRef(user);

		setSelectedUsers((prev) => {
			const exists = prev.some(
				(selectedUser) => selectedUser.id === nextRef.id,
			);
			if (exists) {
				return prev.filter((selectedUser) => selectedUser.id !== nextRef.id);
			}

			if (!isMultiple()) {
				return [nextRef];
			}

			return [...prev, nextRef];
		});
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedUserIds(),
			refs: selectedUsers(),
		});
	};

	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap">
					<Filter
						filters={[
							{
								label: T()("username"),
								key: "username",
								type: "text",
							},
							{
								label: T()("first_name"),
								key: "firstName",
								type: "text",
							},
							{
								label: T()("last_name"),
								key: "lastName",
								type: "text",
							},
							{
								label: T()("email"),
								key: "email",
								type: "text",
							},
						]}
						searchParams={searchParams}
					/>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

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
						title: T()("no_users"),
						description: T()("no_users_description"),
					},
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
							label: T()("username"),
							key: "username",
							icon: <FaSolidIdCard />,
						},
						{
							label: T()("first_name"),
							key: "firstName",
							icon: <FaSolidT />,
						},
						{
							label: T()("last_name"),
							key: "lastName",
							icon: <FaSolidT />,
						},
						{
							label: T()("email"),
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
