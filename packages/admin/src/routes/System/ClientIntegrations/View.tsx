import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import { ClientIntegrationsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import { Permissions } from "@/constants/permissions";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemClientIntegrationsRoute: Component = () => {
	// ----------------------------------------
	// State / Hooks
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				name: {
					value: "",
					type: "text",
				},
				enabled: {
					value: undefined,
					type: "boolean",
				},
			},
			sorts: {
				name: undefined,
				description: undefined,
				enabled: undefined,
				createdAt: undefined,
			},
		},
		{
			singleSort: true,
		},
	);
	const [
		openCreateClientIntegrationPanel,
		setOpenCreateClientIntegrationPanel,
	] = createSignal(false);

	// ----------------------------------------
	// Memos
	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.IntegrationsCreate]).all;
	});

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("routes.system.client.integrations.title"),
							description: T()("routes.system.client.integrations.description"),
						}}
						actions={{
							create: [
								{
									open: openCreateClientIntegrationPanel(),
									setOpen: setOpenCreateClientIntegrationPanel,
									permission: hasCreatePermission(),
									label: T()("client.integrations.create.action"),
								},
							],
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["clientIntegrations.getAll"],
										});
									}}
									filters={[
										{
											label: T()("common.name"),
											key: "name",
											type: "text",
										},
										{
											label: T()("common.status.active"),
											key: "enabled",
											type: "boolean",
											trueLabel: T()("common.status.active"),
											falseLabel: T()("common.status.inactive"),
										},
									]}
									sorts={[
										{
											label: T()("common.name"),
											key: "name",
										},
										{
											label: T()("common.description"),
											key: "description",
										},
										{
											label: T()("common.status.active"),
											key: "enabled",
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
			<ClientIntegrationsList
				state={{
					searchParams,
					openCreateClientIntegrationPanel: openCreateClientIntegrationPanel,
					setOpenCreateClientIntegrationPanel:
						setOpenCreateClientIntegrationPanel,
				}}
			/>
		</Wrapper>
	);
};

export default SystemClientIntegrationsRoute;
