import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createSignal } from "solid-js";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { QueryRow } from "@/components/QueryRow/QueryRow";
import { RolesList } from "@/components/RolesList/RolesList";
import UpsertRolePanel from "@/components/UpsertRolePanel/UpsertRolePanel";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const RolesPage: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				name: textFilter(),
				description: textFilter(),
				locked: booleanFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				name: sort(),
				createdAt: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});
	const [openCreateRolePanel, setOpenCreateRolePanel] = createSignal(false);

	// ----------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: (
					<PageHeader
						copy={{
							title: T()("routes.roles.title"),
							description: T()("routes.roles.description"),
						}}
						actions={{
							create: [
								{
									open: openCreateRolePanel(),
									setOpen: setOpenCreateRolePanel,
									permission: userStore.get.hasPermission([
										Permissions.RolesCreate,
									]).all,
									label: T()("permissions.roles.create"),
								},
							],
							contentLocale: false,
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
									filterSection={{
										subject: T()("routes.roles.title"),
										fields: [
											{
												label: T()("common.name"),
												key: "name",
												type: "text",
											},
											{
												label: T()("common.description"),
												key: "description",
												type: "text",
											},
											{
												label: T()("common.status"),
												key: "locked",
												type: "checkbox",
												trueLabel: T()("common.status.locked"),
												falseLabel: T()("common.status.unlocked"),
											},
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
										],
									}}
									sorts={[
										{
											label: T()("common.name"),
											key: "name",
										},
										{
											label: T()("common.created.at"),
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
		</PageLayout>
	);
};

export default RolesPage;
