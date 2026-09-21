import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import PageLayout from "@/components/PageLayout/PageLayout";
import { QueryRow } from "@/components/QueryRow/QueryRow";
import { RolesList } from "@/components/RolesList/RolesList";
import UpsertRoleDrawer from "@/components/UpsertRoleDrawer/UpsertRoleDrawer";
import { Permissions } from "@/constants/permissions";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import { queryKeys } from "@/services/query-keys";
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
		singleSort: true,
	});
	const [openCreateRolePanel, setOpenCreateRolePanel] = createSignal(false);

	// ----------------------------------
	// Memos
	const canCreate = createMemo(
		() => userStore.get.hasPermission([Permissions.RolesCreate]).all,
	);
	const createActions = createMemo<CreateMenuAction[]>(() =>
		canCreate()
			? [
					{
						type: "button",
						label: T()("permissions.roles.create"),
						onClick: () => setOpenCreateRolePanel(true),
					},
				]
			: [],
	);

	// ----------------------------------
	// Hooks
	useKeyboardShortcuts({
		newEntry: {
			permission: () => canCreate(),
			callback: () => setOpenCreateRolePanel(true),
		},
	});

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.roles.title")}
				description={T()("routes.roles.description")}
				actions={<CreateMenu actions={createActions()} />}
			>
				<QueryRow
					searchParams={searchParams}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.roles.list(),
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
			</PageLayout.Header>
			<PageLayout.Body>
				<RolesList
					state={{
						searchParams: searchParams,
						setOpenCreateRolePanel: setOpenCreateRolePanel,
					}}
				/>
				{/* Modals */}
				<UpsertRoleDrawer
					state={{
						open: openCreateRolePanel(),
						setOpen: setOpenCreateRolePanel,
					}}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default RolesPage;
