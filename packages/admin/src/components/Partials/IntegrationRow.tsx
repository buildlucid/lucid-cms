import type { Integration } from "@types";
import classNames from "classnames";
import { FaSolidKey } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import IconContainer from "@/components/Partials/IconContainer";
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
	const status = createMemo(() => {
		if (isExpired()) return T()("common.status.expired");
		if (!props.integration.enabled) return T()("common.status.inactive");
		return T()("common.status.active");
	});

	// ----------------------------------------
	// Render
	return (
		<article class="flex items-start justify-between gap-3 border-b border-border p-4 last:border-b-0">
			<div class="flex min-w-0 items-start gap-3">
				<IconContainer>
					<FaSolidKey class="size-3.5 text-primary-base" />
				</IconContainer>
				<div class="min-w-0">
					<h3 class="truncate text-sm font-semibold text-title">
						{props.integration.name}
					</h3>
					<Show when={props.integration.description}>
						<p class="mt-0.5 line-clamp-2 text-xs">
							{props.integration.description}
						</p>
					</Show>
					<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-unfocused">
						<code class="font-mono text-xs text-body">
							{props.integration.key}
						</code>
						<span class="inline-flex items-center gap-1.5">
							<span
								class={classNames("size-1.5 rounded-full", {
									"bg-primary-base": props.integration.enabled && !isExpired(),
									"bg-error-base": !props.integration.enabled || isExpired(),
								})}
							/>
							{status()}
						</span>
						<span>
							{T()("common.expires.at")}: {expiry()}
						</span>
					</div>
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
				options={{ raised: true }}
			/>
		</article>
	);
};

export default IntegrationRow;
