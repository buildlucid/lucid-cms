import { type Component, createSignal } from "solid-js";
import { IntegrationsList } from "@/components/IntegrationsList/IntegrationsList";
import PageLayout from "@/components/PageLayout/PageLayout";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

const SystemIntegrationsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				key: textFilter(),
				name: textFilter(),
				description: textFilter(),
				enabled: booleanFilter(),
				scope: textFilter(),
				lastUsedAt: textFilter(),
				expiresAt: textFilter(),
				lastUsedIp: textFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				name: sort(),
				description: sort(),
				enabled: sort(),
				createdAt: sort(),
			},
		},
		singleSort: true,
	});
	const [openCreateIntegrationPanel, setOpenCreateIntegrationPanel] =
		createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.integrations.title")}
				description={T()("routes.system.integrations.description")}
			/>
			<PageLayout.Body>
				<IntegrationsList
					state={{
						searchParams,
						openCreateIntegrationPanel: openCreateIntegrationPanel,
						setOpenCreateIntegrationPanel: setOpenCreateIntegrationPanel,
					}}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemIntegrationsPage;
