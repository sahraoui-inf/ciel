"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";

/** Clears the session cookie and sends the user back to the localized home page. */
export async function signOut() {
  await clearSession();
  redirect("/");
}
