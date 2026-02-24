import type { UserResponse } from "@lucidcms/core/types";
import { FaSolidEnvelope, FaSolidIdCard, FaSolidT } from "solid-icons/fa";
import { type Component, createMemo, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Filter, PerPage } from "@/components/Groups/Query";
import { Table, Tr } from "@/components/Groups/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import T from "@/translations";

interface UserSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		selected?: number;
	};
	callbacks: {
		onSelect: (user: UserResponse) => void;
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
					selected={props.state.selected}
					onSelect={(user) => {
						props.callbacks.onSelect(user);
						props.state.setOpen(false);
					}}
				/>
			)}
		</BottomPanel>
	);
};

interface UserSelectContentProps {
	selected?: number;
	onSelect: (user: UserResponse) => void;
}

const UserSelectContent: Component<UserSelectContentProps> = (props) => {
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

	return (
		<div class="flex flex-col h-full pb-4">
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
				class="bg-card-base border border-border rounded-md"
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
									onClick={() => props.onSelect(user())}
									current={user().id === props.selected}
									theme="secondary"
								>
									<TextCol
										text={user().username}
										options={{ include: include[0] }}
									/>
									<TextCol
										text={user().firstName}
										options={{ include: include[1] }}
									/>
									<TextCol
										text={user().lastName}
										options={{ include: include[2] }}
									/>
									<TextCol
										text={user().email}
										options={{ include: include[3] }}
									/>
								</Tr>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>
		</div>
	);
};

export default UserSelectPanel;
