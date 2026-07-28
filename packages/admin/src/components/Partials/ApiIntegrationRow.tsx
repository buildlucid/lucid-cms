import type { ApiIntegration } from "@types";
import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import ActionDropdown from "./ActionDropdown";

interface ApiIntegrationRowProps {
	apiIntegration: ApiIntegration;
	rowTarget: ReturnType<
		typeof useRowTarget<"delete" | "update" | "regenerateAPIKey">
	>;
}

const ApiIntegrationRow: Component<ApiIntegrationRowProps> = (props) => {
	// ----------------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.IntegrationsUpdate]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.IntegrationsDelete]).all;
	});
	const hasRegeneratePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.IntegrationsRegenerate])
			.all;
	});

	// ----------------------------------------
	// Render
	return (
		<div class="bg-card-base p-4 rounded-md border border-border mb-2.5 last:mb-0 flex items-center justify-between">
			<div class="flex items-start">
				<span
					class={classNames("w-4 h-4 rounded-full block mr-2.5", {
						"bg-primary-base": props.apiIntegration.enabled,
						"bg-error-base": !props.apiIntegration.enabled,
					})}
				/>
				<div>
					<h3
						class={classNames("text-base leading-none", {
							"mb-2": props.apiIntegration.description,
						})}
					>
						{props.apiIntegration.name} ({props.apiIntegration.key})
					</h3>
					<Show when={props.apiIntegration.description}>
						<p class="text-sm mb-0 leading-none">
							{props.apiIntegration.description}
						</p>
					</Show>
				</div>
			</div>
			<ActionDropdown
				actions={[
					{
						type: "button",
						label: T()("common.update"),
						icon: "pen",
						onClick: () => {
							props.rowTarget.setTargetId(props.apiIntegration.id);
							props.rowTarget.setTrigger("update", true);
						},
						permission: hasUpdatePermission(),
					},
					{
						type: "button",
						label: T()("common.delete"),
						icon: "trash",
						onClick: () => {
							props.rowTarget.setTargetId(props.apiIntegration.id);
							props.rowTarget.setTrigger("delete", true);
						},
						permission: hasDeletePermission(),
					},
					{
						type: "button",
						label: T()("client.integrations.api.keys.regenerate.action"),
						icon: "key",
						onClick: () => {
							props.rowTarget.setTargetId(props.apiIntegration.id);
							props.rowTarget.setTrigger("regenerateAPIKey", true);
						},
						permission: hasRegeneratePermission(),
					},
				]}
			/>
		</div>
	);
};

export default ApiIntegrationRow;
