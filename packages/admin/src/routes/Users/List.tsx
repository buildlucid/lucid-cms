import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
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
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

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
			label:
				helpers.getTranslation(
					role.name,
					contentLocaleStore.get.contentLocale,
				) ??
				role.name[0]?.value ??
				String(role.id),
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
												falseLabel: T()(
													"users.password.reset.status.not.required",
												),
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
