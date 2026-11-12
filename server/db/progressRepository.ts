import type { ProgressRepository } from "../domain/progress/repository"

import { ensureSchema, getSql } from "./client"
import { createPostgresProgressRepository } from "./postgresProgressRepository"

let repositoryPromise: Promise<ProgressRepository> | null = null

/**
 * The repository the app writes progress to.
 *
 * The schema is created before the first query, not alongside it: a
 * `CREATE TABLE` holds a lock, and running one next to the first insert makes
 * that insert wait for it. `scripts/migrate.mjs` applies the same file from the
 * command line for people who prefer to migrate before starting.
 */
export function getProgressRepository(): Promise<ProgressRepository> {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      await ensureSchema()

      return createPostgresProgressRepository(getSql())
    })().catch((error: unknown) => {
      repositoryPromise = null
      throw error
    })
  }

  return repositoryPromise
}
