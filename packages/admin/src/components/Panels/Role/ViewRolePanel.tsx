import type { Accessor, Component } from "solid-js";
import UpsertRolePanel from "./UpsertRolePanel";

interface ViewRolePanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewRolePanel: Component<ViewRolePanelProps> = (props) => {
	return <UpsertRolePanel id={props.id} state={props.state} viewOnly={true} />;
};

export default ViewRolePanel;
