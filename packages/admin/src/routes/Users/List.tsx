import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import userStore from "@/store/userStore";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { QueryRow } from "@/components/Groups/Query";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { UserList } from "@/components/Groups/Content";
import { useQueryClient } from "@tanstack/solid-query";

const UsersListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
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
				username: {
					value: "",
					type: "text",
				},
				isLocked: {
					value: undefined,
					type: "boolean",
				},
			},
			sorts: {
				createdAt: undefined,
				isLocked: undefined,
			},
		},
		{
			singleSort: true,
		},
	);
	const [openCreateUserPanel, setOpenCreateUserPanel] = createSignal(false);
	const [showingDeleted, setShowingDeleted] = createSignal(false);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("users_route_title"),
							description: T()("users_route_description"),
						}}
						actions={{
							create: [
								{
									open: openCreateUserPanel(),
									setOpen: setOpenCreateUserPanel,
									permission: userStore.get.hasPermission(["create_user"]).all,
									label: T()("add_user"),
								},
							],
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									showingDeleted={showingDeleted}
									setShowingDeleted={setShowingDeleted}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["users.getMultiple"],
										});
									}}
									filters={[
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
										{
											label: T()("username"),
											key: "username",
											type: "text",
										},
										{
											label: T()("is_locked"),
											key: "isLocked",
											type: "boolean",
											trueLabel: T()("locked"),
											falseLabel: T()("unlocked"),
										},
									]}
									sorts={[
										{
											label: T()("created_at"),
											key: "createdAt",
										},
										{
											label: T()("is_locked"),
											key: "isLocked",
										},
									]}
									perPage={[]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<UserList
				state={{
					searchParams: searchParams,
					setOpenCreateUserPanel: setOpenCreateUserPanel,
					showingDeleted: showingDeleted,
				}}
			/>
			<CreateUserPanel
				state={{
					open: openCreateUserPanel(),
					setOpen: setOpenCreateUserPanel,
				}}
			/>
		</Wrapper>
	);
};

export default UsersListRoute;
