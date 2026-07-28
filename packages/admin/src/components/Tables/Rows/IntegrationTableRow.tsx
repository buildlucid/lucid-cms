import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import type { TableTheme } from "@/components/Groups/Table/Table";
import { Tr } from "@/components/Groups/Table/Tr";
import DateCol from "@/components/Tables/Columns/DateCol";
import IntegrationLastUsedCol from "@/components/Tables/Columns/IntegrationLastUsedCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

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
		<Tr
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
			<PillCol
				text={
					isExpired()
						? T()("common.status.expired")
						: props.integration.enabled
							? T()("common.status.active")
							: T()("common.status.inactive")
				}
				theme={
					props.integration.enabled && !isExpired()
						? "primary-opaque"
						: "error-opaque"
				}
				options={{ include: props.include[0], padding: props.options?.padding }}
			/>
			<TextCol
				text={props.integration.name}
				options={{
					include: props.include[1],
					maxLines: 1,
					padding: props.options?.padding,
				}}
			/>
			<TextCol
				text={props.integration.key}
				options={{
					include: props.include[2],
					maxLines: 1,
					padding: props.options?.padding,
				}}
			/>
			<TextCol
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
			<DateCol
				date={props.integration.expiresAt}
				options={{ include: props.include[5], padding: props.options?.padding }}
			/>
			<DateCol
				date={props.integration.createdAt}
				options={{ include: props.include[6], padding: props.options?.padding }}
			/>
			<DateCol
				date={props.integration.updatedAt}
				options={{ include: props.include[7], padding: props.options?.padding }}
			/>
		</Tr>
	);
};

export default IntegrationTableRow;
