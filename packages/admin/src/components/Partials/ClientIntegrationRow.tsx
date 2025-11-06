import T from "@/translations";
import { type Component, Show, createMemo } from "solid-js";
import classNames from "classnames";
import userStore from "@/store/userStore";
import ActionDropdown from "./ActionDropdown";
import type useRowTarget from "@/hooks/useRowTarget";
import type { ClientIntegrationResponse } from "@types";

interface ClientIntegrationRow {
	clientIntegration: ClientIntegrationResponse;
	rowTarget: ReturnType<
		typeof useRowTarget<"delete" | "update" | "regenerateAPIKey">
	>;
}

const ClientIntegrationRow: Component<ClientIntegrationRow> = (props) => {
	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission(["update_client_integration"]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission(["delete_client_integration"]).all;
	});
	const hasRegeneratePermission = createMemo(() => {
		return userStore.get.hasPermission(["regenerate_client_integration"]).all;
	});

	// ----------------------------------
	// Render
	return (
		<div class="bg-card-base p-4 rounded-md border border-border mb-2.5 last:mb-0 flex items-center justify-between">
			<div class="flex items-start">
				<span
					class={classNames("w-4 h-4 rounded-full block mr-2.5", {
						"bg-primary-base": props.clientIntegration.enabled,
						"bg-error-base": !props.clientIntegration.enabled,
					})}
				/>
				<div>
					<h3
						class={classNames("text-base leading-none", {
							"mb-2": props.clientIntegration.description,
						})}
					>
						{props.clientIntegration.name} ({props.clientIntegration.key})
					</h3>
					<Show when={props.clientIntegration.description}>
						<p class="text-sm mb-0 leading-none">
							{props.clientIntegration.description}
						</p>
					</Show>
				</div>
			</div>
			<ActionDropdown
				actions={[
					{
						type: "button",
						label: T()("update"),
						onClick: () => {
							props.rowTarget.setTargetId(props.clientIntegration.id);
							props.rowTarget.setTrigger("update", true);
						},
						permission: hasUpdatePermission(),
					},
					{
						type: "button",
						label: T()("delete"),
						onClick: () => {
							props.rowTarget.setTargetId(props.clientIntegration.id);
							props.rowTarget.setTrigger("delete", true);
						},
						permission: hasDeletePermission(),
					},
					{
						type: "button",
						label: T()("regenerate_api_key"),
						onClick: () => {
							props.rowTarget.setTargetId(props.clientIntegration.id);
							props.rowTarget.setTrigger("regenerateAPIKey", true);
						},
						permission: hasRegeneratePermission(),
					},
				]}
			/>
		</div>
	);
};

export default ClientIntegrationRow;
