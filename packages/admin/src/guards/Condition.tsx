import { Navigate } from "@solidjs/router";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";

type GuardValue<T> = T | (() => T);

const resolveGuardValue = <T,>(value: GuardValue<T>) => {
	return typeof value === "function" ? (value as () => T)() : value;
};

const ConditionGuard: Component<{
	condition: GuardValue<boolean>;
	redirect: GuardValue<string>;
	fallback?: JSXElement;
	children: JSXElement;
}> = (props) => {
	const condition = createMemo(() => resolveGuardValue(props.condition));
	const redirect = createMemo(() => resolveGuardValue(props.redirect));

	return (
		<Show
			when={condition()}
			fallback={props.fallback ?? <Navigate href={redirect()} />}
		>
			{props.children}
		</Show>
	);
};

export default ConditionGuard;
