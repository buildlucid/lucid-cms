import type { Integration } from "@types";
import classNames from "classnames";
import { type Component, createMemo, Show } from "solid-js";
import type useRowTarget from "@/hooks/useRowTarget";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import ActionDropdown from "./ActionDropdown";

interface IntegrationRowProps {
	integration: Integration;
	rowTarget: ReturnType<
		typeof useRowTarget<"delete" | "update" | "regenerateAPIKey">
	>;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
}

const IntegrationRow: Component<IntegrationRowProps> = (props) => {
	// ----------------------------------------
	// Memos
	const isExpired = createMemo(
		() =>
			props.integration.expiresAt !== null &&
			new Date(props.integration.expiresAt).getTime() <= Date.now(),
	);
	const expiry = createMemo(() =>
		props.integration.expiresAt
			? dateHelpers.formatDate(props.integration.expiresAt)
			: T()("integrations.expiry.never"),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="bg-card-base p-4 rounded-md border border-border mb-2.5 last:mb-0 flex items-center justify-between">
			<div class="flex items-start">
				<span
					class={classNames("w-4 h-4 rounded-full block mr-2.5", {
						"bg-primary-base": props.integration.enabled && !isExpired(),
						"bg-error-base": !props.integration.enabled || isExpired(),
					})}
				/>
				<div>
					<h3
						class={classNames("text-base leading-none", {
							"mb-2": props.integration.description,
						})}
					>
						{props.integration.name} ({props.integration.key})
					</h3>
					<Show when={props.integration.description}>
						<p class="text-sm mb-1.5 leading-none">
							{props.integration.description}
						</p>
					</Show>
					<p class="text-xs text-unfocused">
						{T()("common.expires.at")}: {expiry()}
					</p>
				</div>
			</div>
			<ActionDropdown
				actions={[
					{
						type: "button",
						label: T()("common.update"),
						icon: "pen",
						onClick: () => {
							props.rowTarget.setTargetId(props.integration.id);
							props.rowTarget.setTrigger("update", true);
						},
						permission: props.canUpdate,
					},
					{
						type: "button",
						label: T()("common.delete"),
						icon: "trash",
						onClick: () => {
							props.rowTarget.setTargetId(props.integration.id);
							props.rowTarget.setTrigger("delete", true);
						},
						permission: props.canDelete,
					},
					{
						type: "button",
						label: T()("integrations.api.keys.regenerate.action"),
						icon: "key",
						onClick: () => {
							props.rowTarget.setTargetId(props.integration.id);
							props.rowTarget.setTrigger("regenerateAPIKey", true);
						},
						permission: props.canRegenerate,
					},
				]}
			/>
		</div>
	);
};

export default IntegrationRow;
