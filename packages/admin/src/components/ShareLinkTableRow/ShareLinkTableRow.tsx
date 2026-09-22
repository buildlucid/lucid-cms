import type { MediaShareLink } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";
import CopyCell from "./parts/CopyCell";

interface ShareLinkRowProps {
	index: number;
	link: MediaShareLink;
	rowTarget: ReturnType<typeof useRowTarget<"delete" | "update">>;
	permissions: {
		update: boolean;
		delete: boolean;
	};
}

const ShareLinkTableRow: Component<ShareLinkRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.update"),
					type: "button",
					icon: "pen",
					permission: props.permissions.update,
					onClick: () => {
						props.rowTarget.setTargetId(props.link.id);
						props.rowTarget.setTrigger("update", true);
					},
					sortOrder: 0,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					permission: props.permissions.delete,
					onClick: () => {
						props.rowTarget.setTargetId(props.link.id);
						props.rowTarget.setTrigger("delete", true);
					},
					excludeFromRowClick: true,
					variant: "danger",
					sortOrder: 70,
				},
			]}
		>
			<CopyCell column="url" text={props.link.url} value={props.link.url} />
			<Table.Text column="name" text={props.link.name || "-"} />
			<Table.Pill
				column="hasPassword"
				text={props.link.hasPassword ? T()("common.yes") : T()("common.no")}
				variant={props.link.hasPassword ? "primary-subtle" : "outline"}
			/>
			<Table.Date column="expiresAt" date={props.link.expiresAt} />
			<Table.Pill
				column="hasExpired"
				text={props.link.hasExpired ? T()("common.yes") : T()("common.no")}
				variant={props.link.hasExpired ? "danger-subtle" : "outline"}
			/>
			<Table.Date column="createdAt" date={props.link.createdAt} />
		</Table.Row>
	);
};

export default ShareLinkTableRow;
