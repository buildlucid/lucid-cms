import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import userStore from "@/store/userStore";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import Query from "@/components/Groups/Query";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import Layout from "@/components/Groups/Layout";
import Headers from "@/components/Groups/Headers";
import Content from "@/components/Groups/Content";

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
		<Layout.Wrapper
			slots={{
				header: (
					<Headers.Standard
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
								<Query.Row
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
			<Content.UserList
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
		</Layout.Wrapper>
	);
};

export default UsersListRoute;
