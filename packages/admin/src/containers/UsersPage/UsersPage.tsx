import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import CreateUserDrawer from "@/components/CreateUserDrawer/CreateUserDrawer";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import PageLayout from "@/components/PageLayout/PageLayout";
import { QueryRow } from "@/components/QueryRow/QueryRow";
import { UserList } from "@/components/UserList/UserList";
import { Permissions } from "@/constants/permissions";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import useQueryState, {
	booleanFilter,
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const UsersPage: Component = () => {
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
				roleIds: numberFilter(),
				isLocked: booleanFilter(),
				invitationAccepted: booleanFilter(),
				superAdmin: booleanFilter(),
				triggerPasswordReset: booleanFilter(),
				deletedBy: numberFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				createdAt: sort(),
				firstName: sort(),
				lastName: sort(),
				email: sort(),
				username: sort(),
				isLocked: sort(),
			},
		},
		singleSort: true,
	});
	const [openCreateUserPanel, setOpenCreateUserPanel] = createSignal(false);
	const [showingDeleted, setShowingDeleted] = createSignal(false);

	// ----------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: { permissions: false },
			perPage: -1,
		},
	});

	// ----------------------------------
	// Memos
	const roleOptions = createMemo(() =>
		(roles.data?.data ?? []).map((role) => ({
			value: String(role.id),
			label: role.name,
		})),
	);
	createEffect(() => {
		if (!showingDeleted()) searchParams.clearFilter("deletedBy");
		if (
			!userStore.get.user?.superAdmin &&
			searchParams.getFilter("superAdmin") !== undefined
		) {
			searchParams.clearFilter("superAdmin");
		}
	});

	// ----------------------------------
	// Memos
	const canCreate = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersCreate]).all,
	);
	const createActions = createMemo<CreateMenuAction[]>(() =>
		canCreate()
			? [
					{
						type: "button",
						label: T()("users.add"),
						onClick: () => setOpenCreateUserPanel(true),
					},
				]
			: [],
	);

	// ----------------------------------
	// Hooks
	useKeyboardShortcuts({
		newEntry: {
			permission: () => canCreate(),
			callback: () => setOpenCreateUserPanel(true),
		},
	});

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.users.title")}
				description={T()("routes.users.description")}
				actions={<CreateMenu actions={createActions()} />}
			>
				<QueryRow
					searchParams={searchParams}
					showingDeleted={showingDeleted}
					setShowingDeleted={setShowingDeleted}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.users.list(),
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
							{
								label: T()("common.role"),
								key: "roleIds",
								type: "select",
								options: roleOptions(),
							},
							{
								label: T()("users.invitations.status.label"),
								key: "invitationAccepted",
								type: "checkbox",
								trueLabel: T()("users.invitations.status.accepted"),
								falseLabel: T()("common.status.pending"),
							},
							{
								label: T()("users.password.reset.status.label"),
								key: "triggerPasswordReset",
								type: "checkbox",
								trueLabel: T()("auth.password.reset.required.title"),
								falseLabel: T()("users.password.reset.status.not.required"),
							},
							...(userStore.get.user?.superAdmin
								? [
										{
											label: T()("users.super.admin.label"),
											key: "superAdmin",
											type: "checkbox" as const,
											trueLabel: T()("users.super.admin.title"),
											falseLabel: T()("common.standard"),
										},
									]
								: []),
							{
								label: T()("common.created.at"),
								key: "createdAt",
								type: "datetime",
							},
							{
								label: T()("common.updated.at"),
								key: "updatedAt",
								type: "datetime",
							},
							...(showingDeleted()
								? [
										{
											label: T()("common.deleted.by"),
											key: "deletedBy",
											type: "user" as const,
										},
									]
								: []),
						],
					}}
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
					perPage={[]}
				/>
			</PageLayout.Header>
			<PageLayout.Body>
				<MediaAltGenerationModal />
				<MediaImageGenerationModal />
				<UserList
					state={{
						searchParams: searchParams,
						setOpenCreateUserPanel: setOpenCreateUserPanel,
						showingDeleted: showingDeleted,
					}}
				/>
				<CreateUserDrawer
					state={{
						open: openCreateUserPanel(),
						setOpen: setOpenCreateUserPanel,
					}}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default UsersPage;
