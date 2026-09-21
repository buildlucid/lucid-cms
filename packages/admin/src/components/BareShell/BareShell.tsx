import type { ParentComponent } from "solid-js";

/** Gives extension routes the viewport without the admin's navigation or panel. */
const BareShell: ParentComponent = (props) => {
	// ----------------------------------
	// Render
	return <main class="min-h-screen">{props.children}</main>;
};

export default BareShell;
