import type { User } from "@types";
import { type Component, Show } from "solid-js";
import Table from "@/components/Table/Table";
import helpers from "@/utils/helpers";
import mediaUrl from "@/utils/media-url";

interface UserIdentityCellProps {
	column?: string;
	user: User;
	username: string;
}

const UserIdentityCell: Component<UserIdentityCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={260}>
			<div class="flex min-w-0 items-center gap-2.5">
				<span class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-input-base text-[9px] font-bold text-title">
					<Show
						when={props.user.profilePicture}
						fallback={helpers.formatUserInitials({
							firstName: props.user.firstName,
							lastName: props.user.lastName,
							username: props.user.username,
						})}
					>
						{(profilePicture) => (
							<img
								src={mediaUrl(profilePicture(), "thumbnail-small")}
								alt=""
								class="h-full w-full rounded-full object-cover"
								loading="lazy"
							/>
						)}
					</Show>
				</span>
				<div class="flex min-w-0 flex-col gap-0.5">
					<span class="truncate text-sm text-title" title={props.username}>
						{props.username || "-"}
					</span>
					<span class="truncate text-xs text-body" title={props.user.email}>
						{props.user.email || "-"}
					</span>
				</div>
			</div>
		</Table.Cell>
	);
};

export default UserIdentityCell;
