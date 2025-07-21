import van from "vanjs-core";
import { authUser, jumpPath } from "./utils";
const { div, h1, form, label, input, button, p } = van.tags;

const LoginPage = () => {
	const email = van.state("");
	const password = van.state("");
	const error = van.state("");

	const handleLogin = async (e: Event) => {
		e.preventDefault();
		error.val = "";
		try {
			const response = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.val, password: password.val }),
			});
			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.message || "Login failed");
			}
			authUser.val = await response.json();
			jumpPath("/dashboard");
		} catch (err: any) {
			error.val = err.message || "An error occurred.";
		}
	};

	return div(
		h1("Login"),
		form(
			{ onsubmit: handleLogin },
			() => (error.val ? p({ class: "error" }, error.val) : ""),
			div(
				label("Email"),
				input({
					type: "email",
					oninput: (e) => {
						email.val = (e.target as HTMLInputElement).value;
					},
				}),
			),
			div(
				label("Password"),
				input({
					type: "password",
					oninput: (e) => {
						password.val = (e.target as HTMLInputElement).value;
					},
				}),
			),
			button({ type: "submit" }, "Login"),
		),
	);
};

export default LoginPage;
