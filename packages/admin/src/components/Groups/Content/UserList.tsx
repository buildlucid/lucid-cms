import T from "@/translations";
import { type Component, Index } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import {
	FaSolidT,
	FaSolidCalendar,
	FaSolidEnvelope,
	FaSolidUserTie,
	FaSolidIdCard,
} from "solid-icons/fa";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import Footers from "@/components/Groups/Footers";
import Layout from "@/components/Groups/Layout";
import UpdateUserPanel from "@/components/Panels/User/UpdateUserPanel";
import DeleteUser from "@/components/Modals/User/DeleteUser";
import TriggerPasswordReset from "@/components/Modals/User/TriggerPasswordReset";
import Table from "@/components/Groups/Table";
import UserRow from "@/components/Tables/Rows/UserRow";

export const UserList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		setOpenCreateUserPanel: (state: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			update: false,
			delete: false,
			passwordReset: false,
		},
	});

	// ----------------------------------
	// Queries
	const users = api.users.useGetMultiple({
		queryParams: {
			queryString: props.state?.searchParams.getQueryString,
		},
		enabled: () => props.state?.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<Layout.DynamicContent
			state={{
				isError: users.isError,
				isSuccess: users.isSuccess,
				isEmpty: users.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Footers.Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: users.data?.meta,
						}}
						options={{
							padding: "30",
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("no_users"),
					description: T()("no_users_description"),
					button: T()("create_user"),
				},
			}}
			callback={{
				createEntry: () => {
					props.state.setOpenCreateUserPanel(true);
				},
			}}
		>
			<Table.Root
				key={"users.list"}
				rows={users.data?.data.length || 0}
				searchParams={props.state.searchParams}
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
						label: T()("super_admin"),
						key: "superAdmin",
						icon: <FaSolidUserTie />,
					},
					{
						label: T()("email"),
						key: "email",
						icon: <FaSolidEnvelope />,
					},
					{
						label: T()("created_at"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
				]}
				state={{
					isLoading: users.isLoading,
					isSuccess: users.isSuccess,
				}}
				options={{
					isSelectable: false,
				}}
			>
				{({ include, isSelectable, selected, setSelected }) => (
					<Index each={users.data?.data || []}>
						{(user, i) => (
							<UserRow
								index={i}
								user={user()}
								include={include}
								selected={selected[i]}
								rowTarget={rowTarget}
								options={{
									isSelectable,
								}}
								callbacks={{
									setSelected: setSelected,
								}}
							/>
						)}
					</Index>
				)}
			</Table.Root>
			<UpdateUserPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<DeleteUser
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<TriggerPasswordReset
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().passwordReset,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("passwordReset", state);
					},
				}}
			/>
		</Layout.DynamicContent>
	);
};
