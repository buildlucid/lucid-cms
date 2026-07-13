import type { User } from "@types";
import { type Component, Show } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import helpers from "@/utils/helpers";
import { getProcessedImageUrl } from "@/utils/media-url";

interface UserIdentityColProps {
	user: User;
	username: string;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const UserIdentityCol: Component<UserIdentityColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: 260,
			}}
		>
			<div class="flex min-w-0 items-center gap-2.5">
				<span class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-input-base text-[9px] font-bold text-title">
					<Show
						when={props.user.profilePicture?.file.url}
						fallback={helpers.formatUserInitials({
							firstName: props.user.firstName,
							lastName: props.user.lastName,
							username: props.user.username,
						})}
					>
						{(url) => (
							<img
								src={getProcessedImageUrl(url(), {
									preset: "thumbnail-small",
									format: "webp",
								})}
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
		</Td>
	);
};

export default UserIdentityCol;
