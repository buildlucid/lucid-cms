import type { ClientIntegration } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table/Tr";
import ClientIntegrationLastUsedCol from "@/components/Tables/Columns/ClientIntegrationLastUsedCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

interface ClientIntegrationTableRowProps extends TableRowProps {
	clientIntegration: ClientIntegration;
	include: boolean[];
	rowTarget: ReturnType<
		typeof useRowTarget<"delete" | "update" | "regenerateAPIKey">
	>;
}

const ClientIntegrationTableRow: Component<ClientIntegrationTableRowProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={[
				{
					label: T()("common.update"),
					type: "button",
					icon: "pen",
					onClick: () => {
						props.rowTarget.setTargetId(props.clientIntegration.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: userStore.get.hasPermission([
						Permissions.IntegrationsUpdate,
					]).all,
				},
				{
					label: T()("client.integrations.api.keys.regenerate.action"),
					type: "button",
					icon: "key",
					onClick: () => {
						props.rowTarget.setTargetId(props.clientIntegration.id);
						props.rowTarget.setTrigger("regenerateAPIKey", true);
					},
					permission: userStore.get.hasPermission([
						Permissions.IntegrationsRegenerate,
					]).all,
					theme: "error",
					actionExclude: true,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.clientIntegration.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: userStore.get.hasPermission([
						Permissions.IntegrationsDelete,
					]).all,
					theme: "error",
					actionExclude: true,
				},
			]}
		>
			<PillCol
				text={
					props.clientIntegration.enabled
						? T()("common.status.active")
						: T()("common.status.inactive")
				}
				theme={
					props.clientIntegration.enabled ? "primary-opaque" : "error-opaque"
				}
				options={{ include: props.include[0] }}
			/>
			<TextCol
				text={props.clientIntegration.name}
				options={{ include: props.include[1], maxLines: 1 }}
			/>
			<TextCol
				text={props.clientIntegration.key}
				options={{ include: props.include[2], maxLines: 1 }}
			/>
			<TextCol
				text={props.clientIntegration.description}
				options={{ include: props.include[3], maxLines: 2 }}
			/>
			<ClientIntegrationLastUsedCol
				clientIntegration={props.clientIntegration}
				options={{ include: props.include[4] }}
			/>
			<DateCol
				date={props.clientIntegration.createdAt}
				options={{ include: props.include[5] }}
			/>
			<DateCol
				date={props.clientIntegration.updatedAt}
				options={{ include: props.include[6] }}
			/>
		</Tr>
	);
};

export default ClientIntegrationTableRow;
