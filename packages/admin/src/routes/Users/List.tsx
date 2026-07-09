import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createSignal } from "solid-js";
import { UserList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/Modals/AI/MediaImageGenerationModal";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import userStore from "@/store/userStore";
import T from "@/translations";

const UsersListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				firstName: textFilter(),
				lastName: textFilter(),
				email: textFilter(),
				username: textFilter(),
				isLocked: booleanFilter(),
			},
			sorts: {
				createdAt: sort(),
				isLocked: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});
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
									filterSection={{
										subject: T()("routes.users.title"),
										fields: [
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
												type: "checkbox",
												trueLabel: T()("common.status.locked"),
												falseLabel: T()("common.status.unlocked"),
											},
										],
									}}
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
			<MediaImageGenerationModal />
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
