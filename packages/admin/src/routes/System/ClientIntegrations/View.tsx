import { useQueryClient } from "@tanstack/solid-query";
import { type Component, createMemo, createSignal } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { ClientIntegrationsList } from "@/components/Groups/Content";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemClientIntegrationsRoute: Component = () => {
	// ----------------------------------------
	// State / Hooks
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				name: textFilter(),
				enabled: booleanFilter(),
			},
			sorts: {
				name: sort(),
				description: sort(),
				enabled: sort(),
				createdAt: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});
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
					<SystemSettingsHeader
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
					/>
				),
			}}
		>
			<DynamicContent options={{ padding: "24" }}>
				<InfoRow.Root
					title={T()("client.integrations.manage.title")}
					description={T()("routes.system.client.integrations.description")}
				>
					<InfoRow.Content>
						<div class="-mx-4 overflow-hidden">
							<QueryRow
								searchParams={searchParams}
								onRefresh={() => {
									queryClient.invalidateQueries({
										queryKey: ["clientIntegrations.getAll"],
									});
								}}
								filterSection={{
									subject: T()("client.integrations.manage.title"),
									fields: [
										{
											label: T()("common.name"),
											key: "name",
											type: "text",
										},
										{
											label: T()("common.status.active"),
											key: "enabled",
											type: "checkbox",
											trueLabel: T()("common.status.active"),
											falseLabel: T()("common.status.inactive"),
										},
									],
								}}
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
								options={{
									padding: "16",
								}}
							/>
							<ClientIntegrationsList
								state={{
									searchParams,
									openCreateClientIntegrationPanel:
										openCreateClientIntegrationPanel,
									setOpenCreateClientIntegrationPanel:
										setOpenCreateClientIntegrationPanel,
								}}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default SystemClientIntegrationsRoute;
