import T from "@/translations";
import {
	type Component,
	type JSXElement,
	Show,
	createSignal,
	Switch,
	Match,
	createEffect,
	type Accessor,
} from "solid-js";
import { FaSolidXmark } from "solid-icons/fa";
import notifyIllustration from "@assets/illustrations/notify.svg";
import type { ErrorResponse } from "@types";
import contentLocaleStore from "@/store/contentLocaleStore";
import { Dialog } from "@kobalte/core";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import ContentLocaleSelect from "@/components/Partials/ContentLocaleSelect";
import classNames from "classnames";

export const Panel: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	langauge?: {
		contentLocale?: boolean;
		hascontentLocaleError?: boolean;
		useDefaultcontentLocale?: boolean;
	};
	fetchState?: {
		isLoading?: boolean;
		isError?: boolean;
	};
	mutateState?: {
		isLoading?: boolean;
		isError?: boolean;
		isDisabled?: boolean;
		errors?: ErrorResponse;
	};
	copy?: {
		title?: string;
		description?: string;
		fetchError?: string;
		submit?: string;
	};
	callbacks?: {
		onClose?: () => void;
		onSubmit?: () => void;
		reset?: () => void;
	};
	options?: {
		hideFooter?: boolean;
		padding?: "16" | "24";
		growContent?: boolean;
	};
	children: (_props?: {
		contentLocale: Accessor<string | undefined>;
		setContentLocale: (_value: string) => void;
	}) => JSXElement;
}> = (props) => {
	// ------------------------------
	// State
	const [lastFocusedElement, setLastfocusedElement] =
		createSignal<Element | null>(null);
	const [contentLocale, setContentLocale] = createSignal<string | undefined>(
		undefined,
	);

	// ------------------------------
	// Functions
	const getDefaultContentLocale = () => {
		if (!props.langauge?.useDefaultcontentLocale)
			return contentLocaleStore.get.contentLocale;
		const defaultLocale = contentLocaleStore.get.locales.find(
			(locale) => locale.isDefault,
		);
		if (defaultLocale) return defaultLocale.code;
		return contentLocaleStore.get.contentLocale;
	};

	// ------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) {
			setLastfocusedElement(document.activeElement);
			setContentLocale(getDefaultContentLocale());
		}
		if (props.state.open === false) {
			props.callbacks?.reset?.();
		}
	});

	createEffect(() => {
		const defaultLang = getDefaultContentLocale();
		if (contentLocale() === undefined && defaultLang !== undefined)
			setContentLocale(defaultLang);
	});

	// ------------------------------
	// Render
	return (
		<Dialog.Root
			open={props.state.open}
			onOpenChange={() => props.state.setOpen(!props.state.open)}
		>
			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-40 bg-background-base/80 animate-animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-animate-overlay-show" />
				<div class="fixed inset-4 z-40 flex justify-end">
					<Dialog.Content
						class="w-full relative flex flex-col rounded-xl scrollbar border border-border  max-w-[800px] bg-background-base animate-animate-slide-from-right-out data-expanded:animate-animate-slide-from-right-in outline-hidden overflow-y-auto"
						onPointerDownOutside={(e) => {
							const target = e.target as HTMLElement;
							if (target.hasAttribute("data-panel-ignore")) {
								e.stopPropagation();
								e.preventDefault();
							}
						}}
						onCloseAutoFocus={() => {
							let element = lastFocusedElement();
							if (element instanceof HTMLBodyElement || !element) {
								element = document.querySelector(
									"button:not([tabindex='-1']), a:not([tabindex='-1'])",
								);
							}
							// @ts-expect-error
							if (element && "focus" in element) element.focus();
						}}
					>
						<Switch>
							{/* Loading / Not Open */}
							<Match when={!props.state.open || props.fetchState?.isLoading}>
								<div
									class={classNames(
										"skeleton absolute rounded-xl overflow-hidden",
										{
											"inset-4": props.options?.padding === "16",
											"inset-6 md:inset-5": props.options?.padding === "24",
										},
									)}
								/>
							</Match>
							{/* Fetch Error */}
							<Match when={props.fetchState?.isError}>
								<div class="flex items-center h-full justify-center">
									<ErrorBlock
										content={{
											image: notifyIllustration,
											title: props.copy?.fetchError,
										}}
									/>
								</div>
							</Match>
							{/* Open */}
							<Match when={props.state.open}>
								{/* Header */}
								<div
									class={classNames("border-b border-border", {
										"mx-4 py-4 mb-4": props.options?.padding === "16",
										"mx-4 md:mx-6 py-4 md:pt-6 mb-4":
											props.options?.padding === "24",
									})}
								>
									<div class="flex justify-between items-start gap-x-10">
										<div>
											<Show when={props.copy?.title}>
												<h2>{props.copy?.title}</h2>
											</Show>
											<Show when={props.copy?.description}>
												<p class="mt-1 text-sm">{props.copy?.description}</p>
											</Show>
										</div>
										<Dialog.CloseButton class="flex items-center text-body hover:text-title w-6 h-6 min-w-6 rounded-full focus:outline-hidden focus-visible:ring-1 ring-primary-base bg-background-base justify-center">
											<FaSolidXmark class="text-current" />
											<span class="sr-only">{T()("back")}</span>
										</Dialog.CloseButton>
									</div>
									<Show when={props.langauge?.contentLocale}>
										<div class="mt-2">
											<ContentLocaleSelect
												value={contentLocale()}
												setValue={setContentLocale}
												hasError={props.langauge?.hascontentLocaleError}
												showShortcut={true}
											/>
										</div>
									</Show>
								</div>
								{/* Body */}
								<Show
									when={props.callbacks?.onSubmit}
									fallback={
										<div class="grow flex flex-col justify-between">
											{/* content */}
											<div
												class={classNames({
													"px-4": props.options?.padding === "16",
													"px-4 md:px-6": props.options?.padding === "24",
													grow: props.options?.growContent,
												})}
											>
												{props.children({
													contentLocale: contentLocale,
													setContentLocale: setContentLocale,
												})}
											</div>
											{/* footer */}
											<div
												class={classNames(
													"flex justify-between items-center gap-4",
													{
														"mx-4 py-4": props.options?.padding === "16",
														"mx-4 md:mx-6 py-4 md:py-6 ":
															props.options?.padding === "24",
													},
												)}
											>
												<div class="flex min-w-max gap-2">
													<Show when={props.copy?.submit}>
														<Button
															type="submit"
															theme="primary"
															size="medium"
															loading={props.mutateState?.isLoading}
															disabled={props.mutateState?.isDisabled}
														>
															{props.copy?.submit}
														</Button>
													</Show>
													<Button
														size="medium"
														theme="border-outline"
														type="button"
														onClick={() => props.state.setOpen(false)}
													>
														{T()("close")}
													</Button>
												</div>
												<Show when={props.mutateState?.errors?.message}>
													<ErrorMessage
														theme="basic"
														message={props.mutateState?.errors?.message}
													/>
												</Show>
											</div>
										</div>
									}
								>
									<form
										class="grow flex flex-col justify-between"
										onSubmit={(e) => {
											e.preventDefault();
											if (props.callbacks?.onSubmit)
												props.callbacks?.onSubmit();
										}}
									>
										{/* content */}
										<div
											class={classNames({
												"px-4": props.options?.padding === "16",
												"px-4 md:px-6": props.options?.padding === "24",
												grow: props.options?.growContent,
											})}
										>
											{props.children({
												contentLocale: contentLocale,
												setContentLocale: setContentLocale,
											})}
										</div>
										{/* footer */}
										<div
											class={classNames(
												"flex justify-between items-center gap-4",
												{
													"mx-4 py-4": props.options?.padding === "16",
													"mx-4 md:mx-6 py-4 md:py-6 ":
														props.options?.padding === "24",
												},
											)}
										>
											<div class="flex min-w-max gap-2">
												<Show when={props.copy?.submit}>
													<Button
														type="submit"
														theme="primary"
														size="medium"
														loading={props.mutateState?.isLoading}
														disabled={props.mutateState?.isDisabled}
													>
														{props.copy?.submit}
													</Button>
												</Show>
												<Button
													size="medium"
													theme="border-outline"
													type="button"
													onClick={() => props.state.setOpen(false)}
												>
													{T()("close")}
												</Button>
											</div>
											<Show when={props.mutateState?.errors?.message}>
												<ErrorMessage
													theme="basic"
													message={props.mutateState?.errors?.message}
												/>
											</Show>
										</div>
									</form>
								</Show>
							</Match>
						</Switch>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
