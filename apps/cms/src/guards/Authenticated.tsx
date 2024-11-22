import type { Component, JSXElement } from "solid-js";

interface AuthenticatedProps {
	requiredState?: boolean;
	children: JSXElement;
}

const Authenticated: Component<AuthenticatedProps> = (props) => {
	// ----------------------------------------
	// Render
	return props.children;
};

export default Authenticated;
