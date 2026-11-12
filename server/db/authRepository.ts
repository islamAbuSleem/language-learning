import type { AuthRepository } from "../domain/auth/repository"

import { ensureSchema, getSql } from "./client"
import { createPostgresAuthRepository } from "./postgresAuthRepository"

let repositoryPromise: Promise<AuthRepository> | null = null

/**
 * The repository the app writes accounts to.
 *
 * Same shape as the progress repository: the schema is created before the
 * first query, and `scripts/migrate.mjs` applies the same file from the
 * command line.
 */
export function getAuthRepository(): Promise<AuthRepository> {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      await ensureSchema()

      return createPostgresAuthRepository(getSql())
    })().catch((error: unknown) => {
      repositoryPromise = null
      throw error
    })
  }

  return repositoryPromise
}
