import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import userStore from "@/store/userStore";
import { QueryRow } from "@/components/Groups/Query";
import UpsertRolePanel from "@/components/Panels/Role/UpsertRolePanel";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { RolesList } from "@/components/Groups/Content";
import { useQueryClient } from "@tanstack/solid-query";

const RolesListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				name: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				name: undefined,
				createdAt: undefined,
			},
		},
		{
			singleSort: true,
		},
	);
	const [openCreateRolePanel, setOpenCreateRolePanel] = createSignal(false);

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("roles_route_title"),
							description: T()("roles_route_description"),
						}}
						actions={{
							create: [
								{
									open: openCreateRolePanel(),
									setOpen: setOpenCreateRolePanel,
									permission: userStore.get.hasPermission(["create_role"]).all,
									label: T()("create_role"),
								},
							],
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["roles.getMultiple"],
										});
									}}
									filters={[
										{
											label: T()("name"),
											key: "name",
											type: "text",
										},
									]}
									sorts={[
										{
											label: T()("name"),
											key: "name",
										},
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
			<RolesList
				state={{
					searchParams: searchParams,
					setOpenCreateRolePanel: setOpenCreateRolePanel,
				}}
			/>
			{/* Modals */}
			<UpsertRolePanel
				state={{
					open: openCreateRolePanel(),
					setOpen: setOpenCreateRolePanel,
				}}
			/>
		</Wrapper>
	);
};

export default RolesListRoute;
