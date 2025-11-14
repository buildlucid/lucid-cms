import T from "@/translations";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Switch,
} from "solid-js";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore";
import UpsertClientIntegrationPanel from "@/components/Panels/ClientIntegrations/UpsertClientIntegrationPanel";
import InfoRow from "@/components/Blocks/InfoRow";
import { Wrapper, DynamicContent } from "@/components/Groups/Layout";
import DeleteClientIntegration from "@/components/Modals/ClientIntegrations/DeleteClientIntegration";
import CopyAPIKey from "@/components/Modals/ClientIntegrations/CopyAPIKey";
import RegenerateAPIKey from "@/components/Modals/ClientIntegrations/RegenerateAPIKey";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import ClientIntegrationRow from "@/components/Partials/ClientIntegrationRow";
import { Standard } from "@/components/Groups/Headers";

const SystemClientIntegrationsRoute: Component = (props) => {
	// ----------------------------------------
	// State / Hooks
	const rowTarget = useRowTarget({
		triggers: {
			delete: false,
			regenerateAPIKey: false,
			apiKey: false,
			update: false,
		},
	});
	const [getAPIKey, setAPIKey] = createSignal<string | undefined>();

	// ----------------------------------
	// Queries
	const clientIntegrations = api.clientIntegrations.useGetAll({
		queryParams: {},
	});

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
									open: rowTarget.getTriggers().update,
									setOpen: (state) => {
										rowTarget.setTargetId(undefined);
										rowTarget.setTrigger("update", state);
									},
									permission: hasCreatePermission(),
									label: T()("create_integration"),
								},
							],
						}}
					/>
				),
			}}
		>
			<DynamicContent
				state={{
					isError: clientIntegrations.isError,
					isSuccess: clientIntegrations.isSuccess,
					isLoading: clientIntegrations.isLoading,
				}}
				options={{
					padding: "24",
				}}
			>
				<InfoRow.Root
					title={T()("manage_integrations")}
					description={T()("manage_integrations_description")}
				>
					<Switch>
						<Match
							when={
								clientIntegrations.data?.data &&
								clientIntegrations.data?.data.length > 0
							}
						>
							<For each={clientIntegrations.data?.data}>
								{(clientIntegration) => (
									<ClientIntegrationRow
										clientIntegration={clientIntegration}
										rowTarget={rowTarget}
									/>
								)}
							</For>
						</Match>
						<Match when={clientIntegrations.data?.data.length === 0}>
							<InfoRow.Content>
								<ErrorBlock
									content={{
										title: T()("no_client_integrations_found_title"),
										description: T()(
											"no_client_integrations_found_descriptions",
										),
									}}
									options={{
										contentMaxWidth: "md",
									}}
								>
									<Button
										type="submit"
										theme="primary"
										size="medium"
										onClick={() => {
											rowTarget.setTargetId(undefined);
											rowTarget.setTrigger("update", true);
										}}
										permission={hasCreatePermission()}
									>
										{T()("create_integration")}
									</Button>
								</ErrorBlock>
							</InfoRow.Content>
						</Match>
					</Switch>
				</InfoRow.Root>
			</DynamicContent>

			{/* Panels & Modals */}
			<DeleteClientIntegration
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<UpsertClientIntegrationPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						rowTarget.setTrigger("apiKey", true);
					},
				}}
			/>
			<CopyAPIKey
				apiKey={getAPIKey()}
				state={{
					open: rowTarget.getTriggers().apiKey,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("apiKey", state);
					},
				}}
				callbacks={{
					onClose: () => {
						setAPIKey(undefined);
					},
				}}
			/>
			<RegenerateAPIKey
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().regenerateAPIKey,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("regenerateAPIKey", state);
					},
				}}
				callbacks={{
					onSuccess: (key) => {
						setAPIKey(key);
						rowTarget.setTrigger("apiKey", true);
					},
				}}
			/>
		</Wrapper>
	);
};

export default SystemClientIntegrationsRoute;
