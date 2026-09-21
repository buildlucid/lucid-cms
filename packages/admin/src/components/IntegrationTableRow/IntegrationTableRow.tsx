import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import type { TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import IntegrationLastUsedCol from "./parts/IntegrationLastUsedCol";

interface IntegrationTableRowProps extends TableRowProps {
	integration: Integration;
	include: boolean[];
	theme?: TableTheme;
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
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
			actions={[
				{
					label: T()("common.update"),
					type: "button",
					icon: "pen",
					onClick: () => {
						props.rowTarget.setTargetId(props.integration.id);
						props.rowTarget.setTrigger("update", true);
					},
					permission: userStore.get.hasPermission([
						Permissions.IntegrationsUpdate,
					]).all,
				},
				{
					label: T()("integrations.api.keys.regenerate.action"),
					type: "button",
					icon: "key",
					onClick: () => {
						props.rowTarget.setTargetId(props.integration.id);
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
						props.rowTarget.setTargetId(props.integration.id);
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
			<TablePillCell
				text={
					isExpired()
						? T()("common.status.expired")
						: props.integration.enabled
							? T()("common.status.active")
							: T()("common.status.inactive")
				}
				variant={
					props.integration.enabled && !isExpired()
						? "primary-subtle"
						: "danger-subtle"
				}
				options={{ include: props.include[0], padding: props.options?.padding }}
			/>
			<TableTextCell
				text={props.integration.name}
				options={{
					include: props.include[1],
					maxLines: 1,
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.integration.key}
				options={{
					include: props.include[2],
					maxLines: 1,
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.integration.description}
				options={{
					include: props.include[3],
					maxLines: 2,
					padding: props.options?.padding,
				}}
			/>
			<IntegrationLastUsedCol
				integration={props.integration}
				options={{ include: props.include[4], padding: props.options?.padding }}
			/>
			<TableDateCell
				date={props.integration.expiresAt}
				options={{ include: props.include[5], padding: props.options?.padding }}
			/>
			<TableDateCell
				date={props.integration.createdAt}
				options={{ include: props.include[6], padding: props.options?.padding }}
			/>
			<TableDateCell
				date={props.integration.updatedAt}
				options={{ include: props.include[7], padding: props.options?.padding }}
			/>
		</TableRow>
	);
};

export default IntegrationTableRow;
