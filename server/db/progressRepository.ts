import type { ProgressRepository } from "../domain/progress/repository"

import { ensureSchema, getSql } from "./client"
import { createPostgresProgressRepository } from "./postgresProgressRepository"

let repository: ProgressRepository | null = null

/**
 * The repository the app writes progress to.
 *
 * The schema is created on first use, so a fresh database needs no manual
 * step. `scripts/migrate.mjs` does the same thing from the command line.
 */
export function getProgressRepository(): ProgressRepository {
  if (!repository) {
    repository = createPostgresProgressRepository(getSql())
    void ensureSchema().catch(() => {
      // The first real query surfaces the error with its own message.
    })
  }

  return repository
}
