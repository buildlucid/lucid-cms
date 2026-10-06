import { FaSolidTrashCan } from "solid-icons/fa";
import type { Component } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

const ShowDeletedToggle: Component<{
	value: boolean;
	onChange: (_value: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Button
			variant={props.value ? "danger" : "outline"}
			size="sm"
			shape="square"
			aria-pressed={props.value}
			aria-label={T()("actions.show.deleted")}
			title={T()("actions.show.deleted")}
			onClick={() => props.onChange(!props.value)}
		>
			<FaSolidTrashCan size={12} />
		</Button>
	);
};

export default ShowDeletedToggle;
