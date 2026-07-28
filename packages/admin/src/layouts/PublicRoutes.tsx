import type { Component, JSXElement } from "solid-js";
import AuthShell from "./AuthShell";

interface PublicRoutesProps {
	children?: JSXElement;
}

const PublicRoutes: Component<PublicRoutesProps> = (props) => {
	return <AuthShell width="wide">{props.children}</AuthShell>;
};

export default PublicRoutes;
