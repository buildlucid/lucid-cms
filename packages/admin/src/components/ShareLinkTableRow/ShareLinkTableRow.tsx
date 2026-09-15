import type { MediaShareLink } from "@types";
import type { Component } from "solid-js";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import CopyRow from "./parts/CopyRow";

interface ShareLinkRowProps extends TableRowProps {
	link: MediaShareLink;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"delete" | "update">>;
	theme?: "primary" | "secondary";
	permissions: {
		update: boolean;
		delete: boolean;
	};
}

const ShareLinkTableRow: Component<ShareLinkRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
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
					theme: "error",
					actionExclude: true,
				},
			]}
			theme={props.theme}
		>
			<CopyRow
				text={props.link.url}
				value={props.link.url}
				options={{ include: props?.include[0] }}
			/>
			<TableTextCell
				text={props.link.name || "-"}
				options={{ include: props?.include[1] }}
			/>
			<TablePillCell
				text={props.link.hasPassword ? T()("common.yes") : T()("common.no")}
				theme={props.link.hasPassword ? "primary-opaque" : "outline"}
				options={{ include: props?.include[2] }}
			/>
			<TableDateCell
				date={props.link.expiresAt}
				options={{ include: props?.include[3] }}
			/>
			<TablePillCell
				text={props.link.hasExpired ? T()("common.yes") : T()("common.no")}
				theme={props.link.hasExpired ? "error-opaque" : "outline"}
				options={{ include: props?.include[3] }}
			/>
			<TableDateCell
				date={props.link.createdAt}
				options={{ include: props?.include[4] }}
			/>
		</TableRow>
	);
};

export default ShareLinkTableRow;
