import T from "@/translations";
import type { Component } from "solid-js";
import type { MediaShareLinkResponse } from "@types";
import type { TableRowProps } from "@/types/components";
import type useRowTarget from "@/hooks/useRowTarget";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import CopyRow from "@/components/Tables/Columns/CopyRow";
import { Tr } from "@/components/Groups/Table";

interface ShareLinkRowProps extends TableRowProps {
	link: MediaShareLinkResponse;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"delete" | "update">>;
	theme?: "primary" | "secondary";
	permissions: {
		update: boolean;
		delete: boolean;
	};
}

const ShareLinkRow: Component<ShareLinkRowProps> = (props) => {
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
					label: T()("update"),
					type: "button",
					permission: props.permissions.update,
					onClick: () => {
						props.rowTarget.setTargetId(props.link.id);
						props.rowTarget.setTrigger("update", true);
					},
				},
				{
					label: T()("delete"),
					type: "button",
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
			<TextCol
				text={props.link.name || "-"}
				options={{ include: props?.include[1] }}
			/>
			<PillCol
				text={props.link.hasPassword ? T()("yes") : T()("no")}
				theme={props.link.hasPassword ? "primary" : "grey"}
				options={{ include: props?.include[2] }}
			/>
			<DateCol
				date={props.link.expiresAt}
				options={{ include: props?.include[3] }}
			/>
			<PillCol
				text={props.link.hasExpired ? T()("yes") : T()("no")}
				theme={props.link.hasExpired ? "red" : "grey"}
				options={{ include: props?.include[3] }}
			/>
			<DateCol
				date={props.link.createdAt}
				options={{ include: props?.include[4] }}
			/>
		</Tr>
	);
};

export default ShareLinkRow;
