import classNames from "classnames";
import { type Component, Match, Switch } from "solid-js";
import type { FieldTypes } from "@types";

interface FieldTypeIconProps {
	type: FieldTypes;
}

const FieldTypeIcon: Component<FieldTypeIconProps> = (props) => {
	// -------------------------------
	// Render
	return (
		<div
			class={classNames(
				"absolute top-0 left-0 w-7 h-7 min-w-[28px] mr-2.5 flex items-center justify-center  border-opacity-40 rounded-md text-black text-opacity-50 text-sm",
				{
					"bg-[#75f175] border-[#6ae06a]":
						props.type === "text" ||
						props.type === "wysiwyg" ||
						props.type === "textarea",
					"bg-[#87b6ec] border-[#7aa6d9]":
						props.type === "number" ||
						props.type === "select" ||
						props.type === "datetime" ||
						props.type === "checkbox",
					"bg-[#e9bc81] border-[#d8ad74]": props.type === "repeater",
					"bg-[#f080ea] border-[#dd72d8]": props.type === "link",
					"bg-[#f88bbc] border-[#e17ba9]": props.type === "json",
					"bg-[#9693f8] border-[#8481e0]": props.type === "media",
					"bg-[#84f0dc] border-[#78dbc9]": props.type === "color",
					"bg-[#dae095] border-[#ccd289]": props.type === "user",
					"bg-[#f2f2f2] border-[#d8d8d8]": props.type === "document",
				},
			)}
		>
			<Switch>
				<Match when={props.type === "text"}>Aa</Match>
				<Match when={props.type === "wysiwyg"}>W</Match>
				<Match when={props.type === "textarea"}>T</Match>
				<Match when={props.type === "number"}>#</Match>
				<Match when={props.type === "select"}>S</Match>
				<Match when={props.type === "datetime"}>D</Match>
				<Match when={props.type === "checkbox"}>C</Match>
				<Match when={props.type === "repeater"}>R</Match>
				<Match when={props.type === "user"}>Ur</Match>
				<Match when={props.type === "link"}>L</Match>
				<Match when={props.type === "json"}>J</Match>
				<Match when={props.type === "media"}>M</Match>
				<Match when={props.type === "color"}>C</Match>
				<Match when={props.type === "document"}>Do</Match>
			</Switch>
		</div>
	);
};

export default FieldTypeIcon;
