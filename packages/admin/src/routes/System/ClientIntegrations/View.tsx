import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import { ClientIntegrationsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query";
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
		return userStore.get.hasPermission(["create_client_integration"]).all;
	});

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("system_client_integrations_route_title"),
							description: T()("system_client_integrations_route_description"),
						}}
						actions={{
							create: [
								{
									open: openCreateClientIntegrationPanel(),
									setOpen: setOpenCreateClientIntegrationPanel,
									permission: hasCreatePermission(),
									label: T()("create_integration"),
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
											label: T()("name"),
											key: "name",
											type: "text",
										},
										{
											label: T()("active"),
											key: "enabled",
											type: "boolean",
											trueLabel: T()("active"),
											falseLabel: T()("inactive"),
										},
									]}
									sorts={[
										{
											label: T()("name"),
											key: "name",
										},
										{
											label: T()("description"),
											key: "description",
										},
										{
											label: T()("active"),
											key: "enabled",
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
