import type { ProfilePicture } from "@types";
import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import { Show } from "solid-js";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";

export type UserSelectOptionUser = {
	username?: string | null;
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	profilePicture?: ProfilePicture | null;
};

const UserSelectOption: Component<{
	user: UserSelectOptionUser;
	label: string;
	removeValue?: () => void;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<span class="flex min-w-0 w-full items-center gap-2">
			<span class="flex min-w-0 items-center gap-2">
				<UserDisplay
					user={{
						username:
							props.user.username ??
							props.user.email ??
							props.label ??
							T()("media.types.unknown"),
						firstName: props.user.firstName,
						lastName: props.user.lastName,
						profilePicture: props.user.profilePicture,
					}}
					mode="icon"
					size="x-small"
				/>
				<span class="truncate">{props.label}</span>
			</span>
			<Show when={props.removeValue}>
				{(removeValue) => (
					<button
						type="button"
						aria-label={T()("common.remove")}
						class="ml-auto flex size-5 shrink-0 items-center justify-center rounded text-body opacity-0 transition-all group-hover:opacity-100 hover:bg-error-base hover:text-error-contrast focus:opacity-100 focus:outline-hidden focus-visible:ring-1 ring-error-base"
						onPointerDown={(event) => {
							event.preventDefault();
							event.stopPropagation();
						}}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							removeValue()();
						}}
					>
						<FaSolidXmark size={12} />
					</button>
				)}
			</Show>
		</span>
	);
};

export default UserSelectOption;
