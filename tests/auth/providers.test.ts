import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { H3Event } from "h3"
import { describe, expect, it, vi } from "vitest"

import {
  completeGoogleSignIn,
  redeemMagicLink,
  requestMagicLink,
} from "../../server/services/authService"
import { googleStart } from "../../server/services/googleAuth"

const url = process.env.DATABASE_URL
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const statements = JSON.parse(
  readFileSync(join(root, "server", "db", "schema.json"), "utf8"),
) as string[]

/**
 * The account ways in, against the real database.
 *
 * Google's servers are not involved: fetch is stubbed to answer like the
 * token and profile endpoints, so what is proven is our side of the
 * handshake — the URL we send the browser to, the state binding, the
 * link-or-create rules, the single-use links, and the merge. Run with:
 *
 *   node --env-file=.env node_modules/vitest/vitest.mjs run tests/auth/providers.test.ts
 */
describe.skipIf(!url)("sign-in providers", () => {
  const OLD_ENV = { ...process.env }

  async function withSql<T>(run: (sql: unknown) => Promise<T>): Promise<T> {
    const { default: postgres } = await import("postgres")
    const sql = postgres(url as string, { ssl: "require", max: 1, onnotice: () => {} })

    try {
      for (const statement of statements) {
        await sql.unsafe(statement)
      }

      return await run(sql)
    } finally {
      await sql.end({ timeout: 5 })
    }
  }

  /** Enough of an event for cookies, the client address and the origin. */
  function fakeEvent(cookie = ""): H3Event {
    const headers: Record<string, string | string[]> = {}
    const reqHeaders: Record<string, string> = {
      host: "test.local",
      "x-forwarded-for": "203.0.113.9",
    }
    if (cookie) reqHeaders.cookie = cookie

    return {
      path: "/",
      context: {},
      node: {
        req: {
          headers: reqHeaders,
          socket: { remoteAddress: "203.0.113.9" },
          originalUrl: "/",
        },
        res: {
          getHeader: (name: string) => headers[name.toLowerCase()],
          setHeader: (name: string, value: string | string[]) => {
            headers[name.toLowerCase()] = value
          },
          appendHeader: (name: string, value: string | string[]) => {
            const key = name.toLowerCase()
            const current = headers[key]
            const extra = Array.isArray(value) ? value : [value]
            headers[key] = current === undefined ? extra : [...(Array.isArray(current) ? current : [String(current)]), ...extra]
          },
          removeHeader: (name: string) => {
            delete headers[name.toLowerCase()]
          },
        },
      },
    } as unknown as H3Event
  }

  function sessionCookieOf(event: H3Event): string | null {
    const raw = (
      event.node.res as unknown as { getHeader: (name: string) => unknown }
    ).getHeader("set-cookie")
    const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : []

    for (const entry of list) {
      const match = /^session=([^;]+)/.exec(entry)
      if (match) return `session=${match[1]}`
    }

    return null
  }

  async function cleanup(prefixes: string[]): Promise<void> {
    await withSql(async (raw) => {
      const sql = raw as {
        unsafe: (statement: string) => Promise<unknown>
      }
      for (const prefix of prefixes) {
        await sql.unsafe(
          `DELETE FROM item_states WHERE learner_id IN (SELECT id FROM users WHERE email LIKE '${prefix}%')`,
        )
        await sql.unsafe(
          `DELETE FROM practice_days WHERE learner_id IN (SELECT id FROM users WHERE email LIKE '${prefix}%')`,
        )
        await sql.unsafe(
          `DELETE FROM learners WHERE id IN (SELECT id FROM users WHERE email LIKE '${prefix}%')`,
        )
        await sql.unsafe(
          `DELETE FROM magic_links WHERE email_norm LIKE '${prefix}%'`,
        )
        await sql.unsafe(`DELETE FROM users WHERE email LIKE '${prefix}%'`)
        await sql.unsafe(
          `DELETE FROM learners WHERE id LIKE '${prefix}%' AND id NOT IN (SELECT id FROM users)`,
        )
      }
    })
  }

  it("builds the Google start URL and binds the state cookie", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.NODE_ENV = "development"

    try {
      const event = fakeEvent()
      const target = (await import("../../server/services/googleAuth")).googleStart(event)

      expect(target.startsWith("https://accounts.google.com/o/oauth2/v2/auth?")).toBe(true)
      expect(target).toContain("client_id=test-client-id")
      expect(target).toContain(encodeURIComponent("http://test.local/api/auth/google/callback"))

      const setCookie = (
        event.node.res as unknown as { getHeader: (name: string) => unknown }
      ).getHeader("set-cookie")
      expect(String(setCookie)).toContain("oauth_state=")
    } finally {
      process.env = { ...OLD_ENV }
    }
  })

  it("refuses to start Google without a client id", async () => {
    delete process.env.GOOGLE_CLIENT_ID

    const { googleStart: start } = await import("../../server/services/googleAuth")

    expect(() => start(fakeEvent())).toThrowError(/not configured/)
    process.env = { ...OLD_ENV }
  })

  it("signs in with Google, new inbox first", async () => {
    const email = `prov-g-${randomUUID().slice(0, 8)}@example.com`
    const realFetch = globalThis.fetch
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-secret"

    globalThis.fetch = (async (input: unknown) => {
      const target = String(input)
      if (target.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 })
      }
      return new Response(
        JSON.stringify({ sub: "google-sub-1", email, email_verified: true, name: "Prov" }),
        { status: 200 },
      )
    }) as typeof fetch

    try {
      const event = fakeEvent()
      const { fetchGoogleProfile } = await import("../../server/services/googleAuth")
      const profile = await fetchGoogleProfile("code", "http://test.local/api/auth/google/callback")

      const user = await completeGoogleSignIn(event, profile)

      expect(user.email).toBe(email)
      expect(user.hasGoogle).toBe(true)
      expect(sessionCookieOf(event)).not.toBeNull()
    } finally {
      globalThis.fetch = realFetch
      process.env = { ...OLD_ENV }
      await cleanup(["prov-g-"])
    }
  }, 30_000)

  it("links Google to a matching verified inbox, never to an unverified one", async () => {
    const owned = `prov-owned-${randomUUID().slice(0, 8)}@example.com`
    const realFetch = globalThis.fetch
    process.env.GOOGLE_CLIENT_ID = "test-client-id"
    process.env.GOOGLE_CLIENT_SECRET = "test-secret"
    const profileFor = (email: string, verified: boolean) =>
      new Response(
        JSON.stringify({ sub: "google-sub-2", email, email_verified: verified }),
        { status: 200 },
      )

    try {
      const { fetchGoogleProfile } = await import("../../server/services/googleAuth")

      // A password account owns this inbox first.
      const { signupWithPassword } = await import("../../server/services/authService")
      await signupWithPassword(fakeEvent(), { email: owned, password: "correct horse 123" })

      // Verified Google mail for the same inbox links instead of doubling.
      globalThis.fetch = (async (input: unknown) =>
        String(input).includes("oauth2.googleapis.com/token")
          ? new Response(JSON.stringify({ access_token: "tok" }), { status: 200 })
          : profileFor(owned, true)) as typeof fetch
      const linked = await completeGoogleSignIn(
        fakeEvent(),
        await fetchGoogleProfile("code", "http://x/callback"),
      )
      expect(linked.hasGoogle).toBe(true)

      // An unverified claim on the same inbox from a *different* Google
      // account stops instead of stealing: only a verified inbox links.
      globalThis.fetch = (async (input: unknown) =>
        String(input).includes("oauth2.googleapis.com/token")
          ? new Response(JSON.stringify({ access_token: "tok" }), { status: 200 })
          : new Response(
              JSON.stringify({ sub: "google-sub-3", email: owned, email_verified: false }),
              { status: 200 },
            )) as typeof fetch
      await expect(
        completeGoogleSignIn(
          fakeEvent(),
          await fetchGoogleProfile("code", "http://x/callback"),
        ),
      ).rejects.toThrowError(/already registered/)
    } finally {
      globalThis.fetch = realFetch
      process.env = { ...OLD_ENV }
      await cleanup(["prov-owned-"])
    }
  }, 30_000)

  it("issues a magic link and redeems it once", async () => {
    const email = `prov-m-${randomUUID().slice(0, 8)}@example.com`

    const asked = await requestMagicLink(fakeEvent(), { email })
    expect(asked.sent).toBe(false)
    expect(typeof asked.link).toBe("string")

    const token = new URL(asked.link as string).searchParams.get("token") as string
    const signedIn = fakeEvent()
    const user = await redeemMagicLink(signedIn, token)

    expect(user.email).toBe(email)
    expect(sessionCookieOf(signedIn)).not.toBeNull()

    await expect(redeemMagicLink(fakeEvent(), token)).rejects.toThrowError(/used up or expired/)
    await expect(redeemMagicLink(fakeEvent(), "nope")).rejects.toThrowError(/used up or expired/)

    await cleanup(["prov-m-"])
  }, 30_000)

  it("merges anonymous progress into the magic account", async () => {
    const email = `prov-mm-${randomUUID().slice(0, 8)}@example.com`
    const { getProgressRepository } = await import("../../server/db/progressRepository")
    const { getAuthRepository } = await import("../../server/db/authRepository")
    const { createItemState } = await import("../../server/domain/srs/mastery")
    const { randomUUID: uuid } = await import("node:crypto")

    const repository = await getProgressRepository()
    const anonId = uuid()
    await repository.recordExercise(anonId, createItemState("es/a1/u1/select/a", 1), {
      xp: 2,
      streak: 1,
      lastPracticeDate: "2026-11-12",
    }, { date: "2026-11-12", answers: 1, correct: 1, xp: 2 })

    // The browser that did the exercises is the browser that redeems.
    const withCookie = fakeEvent(`learner=${anonId}`)
    const asked = await requestMagicLink(withCookie, { email })
    const token = new URL(asked.link as string).searchParams.get("token") as string
    await redeemMagicLink(withCookie, token)

    const auth = await getAuthRepository()
    const user = await auth.findUserByEmailNorm(email)
    expect(user).not.toBeNull()
    expect((await repository.listItems(user!.id)).map((item) => item.itemId)).toEqual([
      "es/a1/u1/select/a",
    ])

    await cleanup(["prov-mm-"])
  }, 30_000)
})
