import van from "vanjs-core";
import { NavLink } from "./utils";

const { div, h1, h2, p, section } = van.tags;

const FeatureCard = (
	icon: string,
	title: string,
	description:string,
) =>
	div(
		{ class: "feature-card" },
		div({ class: "feature-icon" }, icon),
		h2(title),
		p(description),
	);

const HowItWorksStep = (
	step: number,
	title: string,
	description:string,
) =>
	div(
		{ class: "step-card" },
		div({ class: "step-number" }, step),
		h2(title),
		p(description),
	);

const HomePage = () =>
	div(
		{ class: "home-container" },
		// Hero Section
		section(
			{ class: "hero-section" },
			h1({ class: "hero-title" }, "Receiptify: Your Smart Receipt Manager"),
			p(
				{ class: "hero-subtitle" },
				"Effortlessly scan, store, and manage all your receipts in one place.",
			),
			NavLink(
				{
					path: "/login",
					class: "md3-button",
					style: "margin-top: 24px;",
				},
				"Login",
			),
		),

		// Features Section
		section(
			{ class: "features-section" },
			h2({ class: "section-title" }, "Key Features"),
			div(
				{ class: "features-grid" },
				FeatureCard(
					"📄",
					"AI-Powered Scanning",
					"Our AI automatically extracts data from your receipts, saving you time and effort.",
				),
				FeatureCard(
					"🗂️",
					"Organized Storage",
					"Keep your receipts neatly organized and easily searchable by store, date, or tags.",
				),
				FeatureCard(
					"📊",
					"Expense Tracking",
					"Gain insights into your spending habits with our detailed analytics and reports.",
				),
			),
		),

		// How It Works Section
		section(
			{ class: "how-it-works-section" },
			h2({ class: "section-title" }, "How It Works"),
			div(
				{ class: "steps-container" },
				HowItWorksStep(
					1,
					"Upload Your Receipt",
					"Snap a photo of your receipt or upload an existing image.",
				),
				HowItWorksStep(
					2,
					"AI Analysis",
					"Our AI analyzes the receipt and extracts all the important information.",
				),
				HowItWorksStep(
					3,
					"View and Manage",
					"Your receipt is now stored and ready for you to view, edit, and manage.",
				),
			),
		),
	);

export default HomePage;