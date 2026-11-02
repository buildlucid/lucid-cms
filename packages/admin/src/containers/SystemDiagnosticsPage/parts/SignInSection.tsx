import type { Diagnostics } from "@types";
import type { Component } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import T from "@/translations";

/** Which sign-in methods are on, the two-factor requirement, providers and captcha. */
const SignInSection: Component<{
	data: Diagnostics;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const yesNo = (value: boolean) =>
		value ? T()("common.yes") : T()("common.no");
	const twoFactor = () => {
		const { enabled, required } = props.data.auth.twoFactor;
		if (!enabled) return T()("diagnostics.auth.two.factor.off");
		if (required === "everyone") {
			return T()("diagnostics.auth.two.factor.everyone");
		}
		if (required === "super-admins") {
			return T()("diagnostics.auth.two.factor.super.admins");
		}
		return T()("diagnostics.auth.two.factor.optional");
	};

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.auth.title")}
			description={T()("diagnostics.auth.description")}
		>
			<InfoRow.Content>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{
							label: T()("diagnostics.auth.password"),
							value: yesNo(props.data.auth.password),
						},
						{
							label: T()("diagnostics.auth.magic.link"),
							value: yesNo(props.data.auth.magicLink),
						},
						{
							label: T()("diagnostics.auth.passkeys"),
							value: yesNo(props.data.auth.passkeys),
						},
						{
							label: T()("diagnostics.auth.two.factor"),
							value: twoFactor(),
						},
						{
							label: T()("diagnostics.auth.providers"),
							value: props.data.auth.providers.join(", ") || "-",
						},
						{
							label: T()("common.captcha"),
							value: props.data.auth.captcha ?? "-",
						},
					]}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

export default SignInSection;
