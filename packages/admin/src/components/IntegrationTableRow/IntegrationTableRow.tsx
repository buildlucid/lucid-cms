import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";
import IntegrationLastUsedCell from "./parts/IntegrationLastUsedCell";

interface IntegrationTableRowProps {
	index: number;
	integration: Integration;
	rowTarget: ReturnType<
		typeof useRowTarget<"delete" | "update" | "regenerateAPIKey">
	>;
}

const IntegrationTableRow: Component<IntegrationTableRowProps> = (props) => {
	// ----------------------------------------
	// Memos
	const isExpired = createMemo(
		() =>
			props.integration.expiresAt !== null &&
			new Date(props.integration.expiresAt).getTime() <= Date.now(),
	);

	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.update"),
					type: "button",
					icon: "pen",
					onClick: () => {
						props.rowTarget.setTargetId(props.integration.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: Permissions.IntegrationsUpdate,
					sortOrder: 0,
				},
				{
					label: T()("integrations.api.keys.regenerate.action"),
					type: "button",
					icon: "key",
					onClick: () => {
						props.rowTarget.setTargetId(props.integration.id);
						props.rowTarget.setTrigger("regenerateAPIKey", true);
					},
					permission: Permissions.IntegrationsRegenerate,
					excludeFromRowClick: true,
					variant: "danger",
					sortOrder: 70,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.integration.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: Permissions.IntegrationsDelete,
					excludeFromRowClick: true,
					variant: "danger",
					sortOrder: 80,
				},
			]}
		>
			<Table.Pill
				column="enabled"
				text={
					isExpired()
						? T()("common.status.expired")
						: props.integration.enabled
							? T()("common.status.active")
							: T()("common.status.inactive")
				}
				variant={
					props.integration.enabled && !isExpired()
						? "success-subtle"
						: "danger-subtle"
				}
			/>
			<Table.Text column="name" text={props.integration.name} maxLines={1} />
			<Table.Text column="key" text={props.integration.key} maxLines={1} />
			<Table.Text
				column="description"
				text={props.integration.description}
				maxLines={2}
			/>
			<IntegrationLastUsedCell
				column="lastUsed"
				integration={props.integration}
			/>
			<Table.Date column="expiresAt" date={props.integration.expiresAt} />
			<Table.Date column="createdAt" date={props.integration.createdAt} />
			<Table.Date column="updatedAt" date={props.integration.updatedAt} />
		</Table.Row>
	);
};

export default IntegrationTableRow;
