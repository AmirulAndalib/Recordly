import { expect, test } from "@playwright/test";
import { installDesktopBridge } from "./bridge";

test("split login expands email, rejects incorrect credentials, and persists the local account until sign-out", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.goto("/?windowType=editor");
	await page.getByRole("button", { name: "Home", exact: true }).click();
	await page.getByRole("button", { name: "Sign in", exact: true }).click();
	const login = page.getByRole("dialog", { name: "Welcome back", exact: true });
	await expect(login.getByRole("button", { name: "Google", exact: true })).toBeVisible();
	await expect(login.getByRole("button", { name: "Microsoft", exact: true })).toBeVisible();
	await expect(login.getByLabel("Password", { exact: true })).toHaveCount(0);
	await page.screenshot({ path: "test-results/login.png", animations: "disabled" });
	await login.getByLabel("Email", { exact: true }).fill("test@email.com");
	await login.getByLabel("Password", { exact: true }).fill("incorrect");
	await login.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(login.getByText("Incorrect email or password.")).toBeVisible();
	await login.getByLabel("Password", { exact: true }).fill("1234");
	await page.screenshot({ path: "test-results/login-expanded.png", animations: "disabled" });
	await page.setViewportSize({ width: 800, height: 600 });
	await expect(login.getByRole("button", { name: "Sign in", exact: true })).toBeInViewport();
	await login.getByRole("button", { name: "Sign in", exact: true }).click();
	await expect(login).not.toBeVisible();
	await page.reload();
	await page.getByRole("button", { name: "Home", exact: true }).click();
	await page.getByRole("button", { name: "test@email.com", exact: true }).click();
	const account = page.getByRole("dialog", { name: "Your account", exact: true });
	await expect(account.getByText("test@email.com")).toBeVisible();
	await account.getByRole("button", { name: "Sign out", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Welcome back" })).toBeVisible();
});
