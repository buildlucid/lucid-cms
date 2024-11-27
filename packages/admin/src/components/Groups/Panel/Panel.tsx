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
import { FaSolidArrowRight } from "solid-icons/fa";
import notifyIllustration from "@/assets/illustrations/notify.svg";
import type { ErrorResponse } from "@lucidcms/core/types";
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
		padding?: "15" | "30";
	};
	children: (_props?: {
		contentLocale: Accessor<string | undefined>;
		setContentLocale: (_value: string) => void;
	}) => JSXElement;
}> = (props) => {
	// ------------------------------
	// State
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
				<Dialog.Overlay class="fixed inset-0 z-40 bg-black/80 animate-animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-animate-overlay-show" />
				<div class="fixed inset-15 z-40 flex justify-end">
					<Dialog.Content
						class="w-full relative flex flex-col rounded-xl scrollbar border border-border  max-w-[800px] bg-container-3 animate-animate-slide-from-right-out data-expanded:animate-animate-slide-from-right-in outline-hidden overflow-y-auto"
						onPointerDownOutside={(e) => {
							const target = e.target as HTMLElement;
							if (target.hasAttribute("data-panel-ignore")) {
								e.stopPropagation();
								e.preventDefault();
							}
						}}
					>
						<Switch>
							{/* Loading / Not Open */}
							<Match when={!props.state.open || props.fetchState?.isLoading}>
								<div class="skeleton absolute inset-15 rounded-xl overflow-hidden" />
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
								<div class="border-b border-border mx-15 md:mx-30 py-15 md:py-30">
									<div class="flex justify-between items-start gap-x-10">
										<div>
											<Show when={props.copy?.title}>
												<h2>{props.copy?.title}</h2>
											</Show>
											<Show when={props.copy?.description}>
												<p class="mt-1">{props.copy?.description}</p>
											</Show>
										</div>
										<Dialog.CloseButton class="flex items-center w-10 h-10 min-w-10 rounded-full focus:outline-hidden focus:ring-1 ring-primary-base bg-container-4 border border-border hover:bg-container-3 justify-center">
											<FaSolidArrowRight class="text-title" />
											<span class="sr-only">{T()("back")}</span>
										</Dialog.CloseButton>
									</div>
									<Show when={props.langauge?.contentLocale}>
										<div class="mt-5">
											<ContentLocaleSelect
												value={contentLocale()}
												setValue={setContentLocale}
												hasError={props.langauge?.hascontentLocaleError}
											/>
										</div>
									</Show>
								</div>
								{/* Body */}
								<form
									class="grow flex flex-col justify-between"
									onSubmit={(e) => {
										e.preventDefault();
										if (props.callbacks?.onSubmit) props.callbacks?.onSubmit();
									}}
								>
									{/* content */}
									<div
										class={classNames({
											"p-15": props.options?.padding === "15",
											"p-15 md:p-30": props.options?.padding === "30",
										})}
									>
										{props.children({
											contentLocale: contentLocale,
											setContentLocale: setContentLocale,
										})}
									</div>
									{/* footer */}
									<div class="border-t border-border mx-15 md:mx-30 py-15 md:py-30 flex justify-between items-center gap-30">
										<div class="flex min-w-max">
											<Show when={props.copy?.submit}>
												<Button
													type="submit"
													theme="primary"
													size="medium"
													classes="mr-15"
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
							</Match>
						</Switch>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
