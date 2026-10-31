import { type Component, createMemo, Show } from "solid-js";
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
				<div class="flex items-center gap-2">
					<ErrorMessage
						theme="inline"
						message={T()("captcha.unavailable")}
						classes="min-w-0 flex-1"
					/>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={props.captcha.retry}
					>
						{T()("common.try.again")}
					</Button>
				</div>
			</Show>
		</>
	);
};

export default CaptchaWidget;
