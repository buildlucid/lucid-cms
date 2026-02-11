import notifyIllustration from "@assets/illustrations/notify.svg";
import { useParams } from "@solidjs/router";
import {
	FaSolidCalendar,
	FaSolidDownload,
	FaSolidFile,
	FaSolidFileAudio,
	FaSolidFileLines,
	FaSolidFileVideo,
	FaSolidFileZipper,
} from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Form, InputFull } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { LucidError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";

const ShareRoute: Component = () => {
	const params = useParams<{ token: string }>();
	const [password, setPassword] = createSignal("");

	const token = createMemo(() => params.token);
	const shareAccess = api.share.useGetAccess({
		queryParams: {
			location: {
				token,
			},
		},
		enabled: () => token() !== undefined,
	});
	const authorizeShare = api.share.useAuthorize();
	const requestDownload = api.share.useRequestDownload();

	const accessData = createMemo(() => shareAccess.data?.data);
	const accessError = createMemo(() => {
		const error = shareAccess.error;
		if (error instanceof LucidError) return error.errorRes;
		return undefined;
	});
	const grantedAccess = createMemo(() => {
		const access = accessData();
		if (!access || access.passwordRequired) return undefined;
		return access;
	});
	const shareUrl = createMemo(() => grantedAccess()?.media.shareUrl ?? "");
	const isExpired = createMemo(() => {
		if (accessError()?.status === 410) return true;
		return grantedAccess()?.hasExpired === true;
	});
	const canRenderInlinePreview = createMemo(() => {
		const access = grantedAccess();
		if (!access) return false;
		return access.media.previewable;
	});
	const formattedExpiresAt = createMemo(() => {
		const expiresAt = grantedAccess()?.expiresAt;
		if (!expiresAt) return T()("share_route_no_expiry");
		return (
			dateHelpers.formatFullDate(expiresAt) || T()("share_route_no_expiry")
		);
	});

	return (
		<Switch>
			<Match when={shareAccess.isLoading}>
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match when={isExpired()}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("share_link_expired_title"),
						description: T()("share_link_expired_message"),
					}}
				/>
			</Match>
			<Match when={shareAccess.isError}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("share_route_error_title"),
						description: T()("share_route_error_description"),
					}}
				/>
			</Match>
			<Match when={shareAccess.isSuccess && accessData() !== undefined}>
				<div class="w-full">
					<Show
						when={accessData()?.passwordRequired}
						fallback={
							<div class="w-full max-w-lg mx-auto space-y-3">
								<div class="rounded-md border border-border bg-card-base overflow-hidden">
									<div class="w-full max-w-full flex items-center justify-center rectangle-background">
										<div class="relative z-10 w-full max-w-full flex items-center justify-center">
											<Switch>
												<Match
													when={
														canRenderInlinePreview() &&
														grantedAccess()?.media.type === "image"
													}
												>
													<img
														src={shareUrl()}
														alt={grantedAccess()?.name || ""}
														class="max-w-full max-h-[40vh] object-contain"
													/>
												</Match>
												<Match
													when={
														canRenderInlinePreview() &&
														grantedAccess()?.media.type === "video"
													}
												>
													<div class="w-full aspect-video flex items-center justify-center min-w-0">
														{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
														<video
															src={shareUrl()}
															class="w-full h-full object-contain"
															controls
														/>
													</div>
												</Match>
												<Match
													when={
														canRenderInlinePreview() &&
														grantedAccess()?.media.type === "audio"
													}
												>
													<div class="w-full p-4 flex flex-col items-center gap-2">
														{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
														<audio
															src={shareUrl()}
															class="w-full max-w-xs"
															controls
														/>
													</div>
												</Match>
												<Match when={true}>
													<div class="flex flex-col gap-2 items-center justify-center text-icon-fade p-4">
														<Switch>
															<Match
																when={grantedAccess()?.media.type === "archive"}
															>
																<FaSolidFileZipper size={40} />
															</Match>
															<Match
																when={grantedAccess()?.media.type === "audio"}
															>
																<FaSolidFileAudio size={40} />
															</Match>
															<Match
																when={grantedAccess()?.media.type === "video"}
															>
																<FaSolidFileVideo size={40} />
															</Match>
															<Match
																when={
																	grantedAccess()?.media.type === "document"
																}
															>
																<FaSolidFileLines size={40} />
															</Match>
															<Match when={true}>
																<FaSolidFile size={40} />
															</Match>
														</Switch>
														<p class="text-sm text-body">
															{T()("share_route_preview_not_available")}
														</p>
													</div>
												</Match>
											</Switch>
										</div>
									</div>
								</div>
								<div class="rounded-md border border-border bg-card-base p-4 space-y-4">
									<div>
										<h2 class="text-base truncate">
											{grantedAccess()?.name || T()("untitled")}
										</h2>
										<Show when={grantedAccess()?.description}>
											<p class="text-sm text-body mt-1">
												{grantedAccess()?.description}
											</p>
										</Show>
									</div>

									{/* Media metadata */}
									<div class="space-y-2 text-sm">
										<div class="flex justify-between gap-4">
											<span class="text-body">{T()("file_size")}</span>
											<span>
												{helpers.bytesToSize(grantedAccess()?.media.fileSize)}
											</span>
										</div>
										<div class="flex justify-between gap-4">
											<span class="text-body">{T()("type")}</span>
											<span class="truncate">
												{grantedAccess()?.media.mimeType}
											</span>
										</div>
									</div>

									{/* Share link metadata */}
									<div class="border-t border-border pt-4 space-y-2 text-sm">
										<div class="flex justify-between gap-4 items-start">
											<span class="text-body flex items-center gap-1.5">
												<FaSolidCalendar class="shrink-0 mt-0.5" />
												{T()("expires_at")}
											</span>
											<span class="text-right">{formattedExpiresAt()}</span>
										</div>
									</div>
								</div>
								<Button
									theme="border-outline"
									size="medium"
									loading={requestDownload.action.isPending}
									onClick={() => {
										if (!token()) return;
										requestDownload.action.mutate({ token: token() });
									}}
									classes="w-full"
								>
									<span class="flex items-center justify-center gap-2">
										<FaSolidDownload />
										<span>{T()("share_route_download")}</span>
									</span>
								</Button>
							</div>
						}
					>
						<div class="max-w-md mx-auto">
							<h2 class="mb-1 text-center">
								{T()("share_route_password_title")}
							</h2>
							<p class="text-sm text-body text-center mb-5">
								{T()("share_route_password_description")}
							</p>
						</div>
						<div class="max-w-md mx-auto mt-4">
							<Form
								state={{
									isLoading: authorizeShare.action.isPending,
									errors: authorizeShare.errors(),
								}}
								content={{
									submit: T()("share_route_password_button"),
								}}
								options={{
									buttonFullWidth: true,
									buttonSize: "large",
								}}
								onSubmit={() => {
									if (!token()) return;
									authorizeShare.action.mutate(
										{
											token: token(),
											body: { password: password() },
										},
										{
											onSuccess: () => {
												setPassword("");
												shareAccess.refetch();
											},
										},
									);
								}}
							>
								<InputFull
									id="sharePassword"
									name="sharePassword"
									type="password"
									value={password()}
									onChange={setPassword}
									copy={{
										label: T()("password"),
									}}
									required={true}
									autoFoucs={true}
									autoComplete="current-password"
								/>
							</Form>
						</div>
					</Show>
				</div>
			</Match>
		</Switch>
	);
};

export default ShareRoute;
