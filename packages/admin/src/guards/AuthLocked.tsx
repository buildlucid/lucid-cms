import type { Component, JSXElement } from "solid-js";

interface AuthLockedProps {
	children: JSXElement;
}

const AuthLocked: Component<AuthLockedProps> = (props) => {
	// ----------------------------------------
	// Render
	return props.children;
};

export default AuthLocked;
