import type { Deploy, DeployRun } from "@types";
import { type Component, createMemo } from "solid-js";
import DeployRunStatusPill from "@/components/DeployRunStatusPill/DeployRunStatusPill";
import Table from "@/components/Table/Table";
import { getDeployPermission } from "@/constants/permissions";
import T from "@/translations";
import {
	getDeployRunCancelLabel,
	getDeployRunDuration,
	getDeployRunSourceLabel,
	isDeployRunCancellable,
} from "@/utils/deploys";
import formatDuration from "@/utils/format-duration";

const DeployRunTableRow: Component<{
	index: number;
	run: DeployRun;
	/** Undefined once the deploy is no longer configured, when the run shows its key. */
	deploy: Deploy | undefined;
	onCancel: (deploy: Deploy) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const duration = createMemo(() =>
		formatDuration(getDeployRunDuration(props.run)),
	);

	// ----------------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					type: "link",
					label: T()("deploys.view.host"),
					icon: "link",
					href: props.run.url ?? undefined,
					target: "_blank",
					rel: "noreferrer",
					show: props.run.url !== null,
					sortOrder: 0,
				},
				{
					type: "button",
					label: props.deploy
						? getDeployRunCancelLabel(props.deploy, props.run)
						: T()("deploys.run.cancel"),
					icon: "ban",
					onClick: () => {
						if (props.deploy) props.onCancel(props.deploy);
					},
					permission: getDeployPermission(props.run.deployKey, "manage"),
					show: props.deploy !== undefined && isDeployRunCancellable(props.run),
					variant: "danger",
					sortOrder: 80,
				},
			]}
		>
			<Table.Cell column="status">
				<DeployRunStatusPill status={props.run.status} />
			</Table.Cell>
			<Table.Text
				column="deploy"
				text={props.deploy?.name ?? props.run.deployKey}
				maxLines={1}
			/>
			<Table.Text
				column="source"
				text={getDeployRunSourceLabel(props.run)}
				maxLines={1}
			/>
			<Table.Date
				column="createdAt"
				date={props.run.startedAt ?? props.run.createdAt}
			/>
			<Table.Text column="duration" text={duration() ?? "-"} />
			<Table.Text column="message" text={props.run.message} minWidth={220} />
		</Table.Row>
	);
};

export default DeployRunTableRow;
