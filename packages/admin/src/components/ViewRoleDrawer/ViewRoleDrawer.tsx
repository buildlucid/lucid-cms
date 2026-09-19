import type { Accessor, Component } from "solid-js";
import UpsertRoleDrawer from "@/components/UpsertRoleDrawer/UpsertRoleDrawer";

interface ViewRolePanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewRoleDrawer: Component<ViewRolePanelProps> = (props) => {
	return <UpsertRoleDrawer id={props.id} state={props.state} viewOnly={true} />;
};

export default ViewRoleDrawer;
