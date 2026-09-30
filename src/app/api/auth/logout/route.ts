import { NextResponse } from "next/server";

const EXPIRED = { httpOnly: true, maxAge: 0, path: "/" } as const;

export async function POST(request: Request) {
  // A plain <form> POST is a browser navigation: it must land on the home page,
  // not on a raw JSON body. Programmatic calls keep receiving JSON.
  const accept = request.headers.get("accept") || "";
  const response = accept.includes("text/html")
    ? NextResponse.redirect(new URL("/", request.url), 303)
    : NextResponse.json({ ok: true });

  response.cookies.set("session", "", EXPIRED);
  return response;
}
