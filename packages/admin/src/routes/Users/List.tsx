import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import userStore from "@/store/userStore";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { QueryRow } from "@/components/Groups/Query";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { UserList } from "@/components/Groups/Content";

const UsersListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
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
			},
			sorts: {
				createdAt: undefined,
			},
		},
		{
			singleSort: true,
		},
	);
	const [openCreateUserPanel, setOpenCreateUserPanel] = createSignal(false);

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
							create: {
								open: openCreateUserPanel(),
								setOpen: setOpenCreateUserPanel,
								permission: userStore.get.hasPermission(["create_user"]).all,
							},
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
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
									]}
									sorts={[
										{
											label: T()("created_at"),
											key: "createdAt",
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
