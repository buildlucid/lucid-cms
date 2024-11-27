import T from "@/translations";
import type { Component } from "solid-js";
import ForgotPasswordForm from "@/components/Forms/Auth/ForgotPasswordForm";

const ForgotPasswordRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<>
			<h1 class="mb-2 text-center">{T()("forgot_password_route_title")}</h1>
			<p class="mb-10 text-center">
				{T()("forgot_password_route_description")}
			</p>
			<div class="mb-10">
				<ForgotPasswordForm showBackToLogin={true} />
			</div>
		</>
	);
};

export default ForgotPasswordRoute;
