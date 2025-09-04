import T from "@/translations";
import type { Component } from "solid-js";
import ForgotPasswordForm from "@/components/Forms/Auth/ForgotPasswordForm";
import LogoIcon from "@assets/svgs/logo-icon.svg";

const ForgotPasswordRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<>
			<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
			<h1 class="mb-1 text-center">{T()("forgot_password_route_title")}</h1>
			<p class="text-center max-w-sm mx-auto">
				{T()("forgot_password_route_description")}
			</p>
			<div class="my-10">
				<ForgotPasswordForm showBackToLogin={true} />
			</div>
		</>
	);
};

export default ForgotPasswordRoute;
