import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createSignal } from "solid-js";
import { UserList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import { Permissions } from "@/constants/permissions";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import userStore from "@/store/userStore";
import T from "@/translations";

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
							title: T()("routes.users.title"),
							description: T()("routes.users.description"),
						}}
						actions={{
							create: [
								{
									open: openCreateUserPanel(),
									setOpen: setOpenCreateUserPanel,
									permission: userStore.get.hasPermission([
										Permissions.UsersCreate,
									]).all,
									label: T()("users.add"),
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
											label: T()("common.username"),
											key: "username",
											type: "text",
										},
										{
											label: T()("users.status.locked.label"),
											key: "isLocked",
											type: "boolean",
											trueLabel: T()("common.status.locked"),
											falseLabel: T()("common.status.unlocked"),
										},
									]}
									sorts={[
										{
											label: T()("common.created.at"),
											key: "createdAt",
										},
										{
											label: T()("users.status.locked.label"),
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
			<MediaAltGenerationModal />
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
