import { TbOutlineRefresh } from "solid-icons/tb";
import { type Component, createMemo, onCleanup, Show } from "solid-js";
import { captchaSlots } from "virtual:lucid-admin";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { resolveSlots } from "@/extensions/slot-policy";
import type { CaptchaState } from "@/hooks/useCaptcha/useCaptcha";
import themeStore from "@/store/themeStore/themeStore";
import T from "@/translations";

/** Renders the configured captcha adapter's widget on a protected form, with a retry when it fails. */
const CaptchaWidget: Component<{
	captcha: CaptchaState;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const widget = createMemo(() => {
		const settings = props.captcha.settings();
		if (!settings || !props.captcha.enabled()) return undefined;

		const entry = resolveSlots(captchaSlots, { adapter: settings.adapter })[0];
		if (!entry) return undefined;

		//* a new object on each retry mounts the widget again
		props.captcha.revision();
		return { entry, settings };
	});

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		props.captcha.unregister();
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Show when={widget()} keyed>
				{(current) => (
					<div data-admin-slot={current.entry.key}>
						<AdminExtensionBoundary
							name={current.entry.key}
							placement="content"
						>
							<current.entry.component
								slot="captcha.widget"
								key={current.entry.key}
								client={current.settings.client}
								form={props.captcha.form}
								action={current.settings.forms[props.captcha.form].action}
								theme={themeStore.resolved()}
								options={current.entry.options}
								register={props.captcha.register}
								onError={props.captcha.onError}
							/>
						</AdminExtensionBoundary>
					</div>
				)}
			</Show>
			<Show when={props.captcha.failed()}>
				<ErrorMessage
					theme="inline"
					message={T()("captcha.unavailable")}
					classes="w-full"
					action={
						<Button
							type="button"
							variant="ghost"
							size="sm"
							shape="square"
							class="text-danger-low-foreground! hover:bg-danger-low-border/60!"
							onClick={props.captcha.retry}
							aria-label={T()("common.try.again")}
							title={T()("common.try.again")}
						>
							<TbOutlineRefresh size={16} />
						</Button>
					}
				/>
			</Show>
		</>
	);
};

export default CaptchaWidget;
