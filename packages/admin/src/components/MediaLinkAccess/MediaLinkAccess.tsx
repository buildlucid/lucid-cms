import type { ErrorResult, FieldError } from "@types";
import type { Component } from "solid-js";
import RadioCards from "@/components/RadioCards/RadioCards";
import T from "@/translations";

/** Chooses whether a library file's URL is public or needs sign in or a share link. */
const MediaLinkAccess: Component<{
	id: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	errors?: ErrorResult | FieldError;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<RadioCards
			id={props.id}
			name={props.id}
			value={props.value ? "public" : "private"}
			onChange={(value) => props.onChange(value === "public")}
			label={T()("media.access.link")}
			columns={2}
			options={[
				{
					value: "public",
					label: T()("common.public"),
					description: T()("media.access.public.description"),
				},
				{
					value: "private",
					label: T()("common.private"),
					description: T()("media.access.private.description"),
				},
			]}
			errors={props.errors}
			disabled={props.disabled}
		/>
	);
};

export default MediaLinkAccess;
