import type { ProfilePicture } from "@types";
import { type Component, For, Show } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
import helpers from "@/utils/helpers";

export type UserStackColUser = {
	id?: number | null;
	email?: string | null;
	username?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	profilePicture?: ProfilePicture | null;
};

const UserStackCol: Component<{
	users: UserStackColUser[];
	options?: {
		include?: boolean;
		padding?: "16" | "24";
		minWidth?: number;
	};
	maxVisible?: number;
}> = (props) => {
	// ----------------------------------
	// Functions
	const displayName = (user: UserStackColUser) => {
		return helpers.formatUserName(user, "simple") || T()("unknown");
	};

	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: props.options?.minWidth,
			}}
		>
			<Show
				when={props.users.length > 0}
				fallback={<span class="text-sm text-body">{T()("none")}</span>}
			>
				<div class="flex min-w-45 items-center gap-3">
					<div class="flex shrink-0 -space-x-2">
						<For each={props.users.slice(0, props.maxVisible ?? 4)}>
							{(user) => (
								<span class="rounded-full ring-2 ring-card-base">
									<UserDisplay
										user={{
											username: displayName(user),
											firstName: user.firstName,
											lastName: user.lastName,
											profilePicture: user.profilePicture,
										}}
										mode="icon"
										size="x-small"
									/>
								</span>
							)}
						</For>
					</div>
					<div class="min-w-0">
						<p class="truncate text-sm text-subtitle">
							<For each={props.users}>
								{(user, index) => (
									<>
										{index() > 0 ? ", " : ""}
										{displayName(user)}
									</>
								)}
							</For>
						</p>
						<Show when={props.users.length > (props.maxVisible ?? 4)}>
							<p class="text-xs text-body">
								+{props.users.length - (props.maxVisible ?? 4)}
							</p>
						</Show>
					</div>
				</div>
			</Show>
		</Td>
	);
};

export default UserStackCol;
