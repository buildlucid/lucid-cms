import classNames from "classnames";
import type { Component } from "solid-js";
import Spinner from "@/components/Partials/Spinner";

const Loading: Component = (props) => {
	return (
		<div class={classNames("flex items-center justify-center")}>
			<Spinner size="md" />
		</div>
	);
};

export default Loading;
