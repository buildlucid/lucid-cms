import type { ProfilePicture } from "@types";
import classNames from "classnames";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import T from "@/translations";
import helpers from "@/utils/helpers";
import mediaUrl from "@/utils/media-url";

export type UserDisplayVariant = "icon" | "horizontal" | "stacked";
export type UserDisplaySize = "xs" | "sm" | "md" | "lg";
export type UserNameFormat = "username" | "name" | "username-and-name";

export interface UserDisplayUser {
	username?: string | null;
	/** Shown when there is no username. */
	email?: string | null;
	firstName?: string | null;
	lastName?: string | null;
	profilePicture?: ProfilePicture | null;
}

export interface UserDisplayProps {
	user: UserDisplayUser;
	/** @default "horizontal" */
	variant?: UserDisplayVariant;
	/** @default "md" */
	size?: UserDisplaySize;
	/** Used by the `horizontal` variant. @default "username-and-name" */
	nameFormat?: UserNameFormat;
	class?: string;
}

/** The avatar circle's classes, shared with avatars standing in for a user. */
export const userAvatarClasses = (props: {
	variant: UserDisplayVariant;
	size: UserDisplaySize;
	bordered: boolean;
}) =>
	classNames(
		"flex items-center justify-center overflow-hidden rounded-full bg-input font-bold text-title",
		{
			"border border-border": props.bordered,
			"h-16 w-16 min-w-16 text-sm":
				props.variant === "icon" && props.size === "lg",
			"h-10 w-10 min-w-10 text-[10px]":
				(props.variant === "icon" && props.size === "md") ||
				(props.variant === "stacked" && props.size === "lg"),
			"h-8 w-8 min-w-8 text-[10px]":
				props.variant === "stacked" && props.size === "md",
			"h-7 w-7 min-w-7 text-[8px]":
				(props.variant === "icon" && props.size === "sm") ||
				(props.variant === "stacked" && props.size === "sm"),
			"h-5 w-5 min-w-5 text-[7px]":
				(props.variant === "icon" && props.size === "xs") ||
				(props.variant === "stacked" && props.size === "xs"),
			"me-2 h-5 w-5 min-w-5 text-[7px]":
				props.variant === "horizontal" && props.size === "xs",
			"me-2 h-7 w-7 min-w-7 text-[8px]":
				props.variant === "horizontal" && props.size === "sm",
			"me-2.5 h-8 w-8 min-w-8 text-[10px]":
				props.variant === "horizontal" &&
				(props.size === "md" || props.size === "lg"),
		},
	);

/**
 * A user's profile picture or initials, with their name.
 *
 * @example
 * ```tsx
 * import { UserDisplay } from "@lucidcms/admin/components";
 *
 * return <UserDisplay user={redirect.createdBy} size="sm" nameFormat="name" />;
 * ```
 */
const UserDisplay: Component<UserDisplayProps> = (props) => {
	// ----------------------------------------
	// Memos
	const variant = createMemo<UserDisplayVariant>(
		() => props.variant ?? "horizontal",
	);
	const size = createMemo<UserDisplaySize>(() => props.size ?? "md");
	const hasUser = createMemo(() => !!(props.user.username || props.user.email));
	const username = createMemo(
		() => props.user.username ?? props.user.email ?? T()("common.unknown"),
	);
	const hasProfilePicture = createMemo(() => !!props.user.profilePicture?.url);
	const avatarClasses = createMemo(() =>
		userAvatarClasses({
			variant: variant(),
			size: size(),
			bordered: !hasProfilePicture(),
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<Show when={hasUser()}>
			<div
				data-user-display
				class={classNames(
					"flex items-center",
					{ "w-full": variant() === "stacked" },
					props.class,
				)}
			>
				<span data-user-display-avatar class={avatarClasses()}>
					<Show
						when={props.user.profilePicture}
						fallback={helpers.formatUserInitials({
							firstName: props.user.firstName,
							lastName: props.user.lastName,
							username: username(),
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
				<Switch>
					<Match when={variant() === "horizontal"}>
						<span data-user-display-name class="text-sm">
							{helpers.formatUserName(
								{ ...props.user, username: username() },
								props.nameFormat,
							)}
						</span>
					</Match>
					<Match when={variant() === "stacked"}>
						<div data-user-display-name class="ms-2 flex min-w-0 flex-col">
							<p
								class={classNames("truncate text-title", {
									"text-xs leading-tight": size() === "sm" || size() === "xs",
									"text-sm": size() !== "sm" && size() !== "xs",
								})}
							>
								{username()}
							</p>
							<Show when={props.user.firstName}>
								<p
									class={classNames("truncate", {
										"text-[11px] leading-tight":
											size() === "sm" || size() === "xs",
										"text-xs": size() !== "sm" && size() !== "xs",
									})}
								>
									{props.user.firstName} {props.user.lastName}
								</p>
							</Show>
						</div>
					</Match>
				</Switch>
			</div>
		</Show>
	);
};

export default UserDisplay;
