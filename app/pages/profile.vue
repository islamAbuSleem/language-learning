<script setup lang="ts">
import type { AuthMethods, UserPayload } from "#shared/api/schemas"

import AppIcon from "~/components/AppIcon.vue"

const { data: session, refresh } = await useFetch<{
  user: UserPayload | null
  methods: AuthMethods
}>("/api/auth/me", { headers: useRequestHeaders(["cookie"]) })

const user = computed(() => session.value?.user ?? null)
const methods = computed(() => session.value?.methods ?? { password: true, magic: false, google: false })

const displayName = ref("")
const newPassword = ref("")
const currentPassword = ref("")
const notice = ref<string | null>(null)
const error = ref<string | null>(null)
const busy = ref(false)

watchEffect(() => {
  if (user.value && displayName.value === "") displayName.value = user.value.displayName
})

function messageOf(failure: unknown, fallback: string): string {
  if (failure && typeof failure === "object" && "data" in failure) {
    const data = (failure as { data?: { statusMessage?: string } }).data
    if (data?.statusMessage) return data.statusMessage
  }
  if (failure instanceof Error) return failure.message

  return fallback
}

async function saveName() {
  error.value = null
  notice.value = null
  busy.value = true

  try {
    await $fetch("/api/auth/profile", { method: "PATCH", body: { displayName: displayName.value } })
    await refresh()
    notice.value = "Name saved."
  } catch (failure) {
    error.value = messageOf(failure, "Could not save the name.")
  } finally {
    busy.value = false
  }
}

async function savePassword() {
  error.value = null
  notice.value = null
  busy.value = true

  try {
    await $fetch("/api/auth/password", {
      method: "POST",
      body: {
        ...(currentPassword.value ? { currentPassword: currentPassword.value } : {}),
        newPassword: newPassword.value,
      },
    })
    newPassword.value = ""
    currentPassword.value = ""
    await refresh()
    notice.value = user.value?.hasPassword ? "Password changed." : "Password set. You can use it to sign in next time."
  } catch (failure) {
    error.value = messageOf(failure, "Could not set the password.")
  } finally {
    busy.value = false
  }
}

async function signOutEverywhere() {
  error.value = null
  notice.value = null
  busy.value = true

  try {
    await $fetch("/api/auth/logout-all", { method: "POST" })
    await navigateTo("/")
  } catch (failure) {
    error.value = messageOf(failure, "Could not sign out.")
    busy.value = false
  }
}
</script>

<template>
  <main class="profile">
    <p class="profile__back"><NuxtLink to="/"><AppIcon name="back" /> Learn</NuxtLink></p>

    <h1 class="profile__title">Your profile</h1>

    <section v-if="!user" class="card profile__signedout">
      <p>You are learning anonymously. Your progress lives in this browser.</p>
      <NuxtLink class="btn btn--primary" to="/login">Sign in or make an account</NuxtLink>
    </section>

    <template v-else>
      <p v-if="notice" class="profile__notice" role="status">{{ notice }}</p>
      <p v-if="error" class="profile__error" role="alert">{{ error }}</p>

      <section class="card profile__card">
        <h2 class="profile__heading">Account</h2>
        <dl class="profile__facts">
          <div>
            <dt>Email</dt>
            <dd>{{ user.email }}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{{ user.createdAt.slice(0, 10) }}</dd>
          </div>
          <div>
            <dt>Sign-in ways</dt>
            <dd>
              <template v-if="user.hasPassword">Password</template>
              <template v-if="user.hasPassword && user.hasGoogle"> · </template>
              <template v-if="user.hasGoogle">Google</template>
              <template v-if="!user.hasPassword && !user.hasGoogle">Magic link</template>
            </dd>
          </div>
        </dl>

        <form class="profile__form" @submit.prevent="saveName">
          <label class="profile__field">
            <span>Display name</span>
            <input v-model="displayName" type="text" required maxlength="40" autocomplete="nickname" />
          </label>
          <button type="submit" class="btn btn--ghost" :disabled="busy">Save name</button>
        </form>
      </section>

      <section class="card profile__card">
        <h2 class="profile__heading">{{ user.hasPassword ? "Change password" : "Set a password" }}</h2>
        <p v-if="!user.hasPassword" class="profile__note">
          You signed in without one. Set one and you can sign in with it next time.
        </p>
        <form class="profile__form" @submit.prevent="savePassword">
          <label v-if="user.hasPassword" class="profile__field">
            <span>Current password</span>
            <input v-model="currentPassword" type="password" required autocomplete="current-password" />
          </label>
          <label class="profile__field">
            <span>{{ user.hasPassword ? "New password" : "Password" }}</span>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
          <button type="submit" class="btn btn--ghost" :disabled="busy">
            {{ user.hasPassword ? "Change password" : "Set password" }}
          </button>
        </form>
      </section>

      <section class="card profile__card">
        <h2 class="profile__heading">Sessions</h2>
        <p class="profile__note">Signed in on another device? Forget them all here.</p>
        <button type="button" class="btn btn--ghost" :disabled="busy" @click="signOutEverywhere">
          Sign out everywhere
        </button>
      </section>
    </template>
  </main>
</template>

<style scoped>
.profile {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-7);
  display: grid;
  gap: var(--space-5);
  align-content: start;
}

.profile__back {
  margin: 0;
}

.profile__back a {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-ink-soft);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
}

.profile__back a:hover {
  color: var(--color-ink);
}

.profile__title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 1.5rem + 2.5vw, 2.5rem);
  line-height: 1.08;
  font-weight: 400;
  margin: 0;
}

.profile__signedout {
  display: grid;
  gap: var(--space-4);
  justify-items: start;
}

.profile__signedout p {
  margin: 0;
  color: var(--color-ink-soft);
  max-width: 65ch;
}

.profile__notice {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-correct-soft);
  border: 1px solid var(--color-correct);
  color: var(--color-correct);
}

.profile__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-wrong-soft);
  border: 1px solid var(--color-wrong);
  color: var(--color-wrong);
}

.profile__card {
  display: grid;
  gap: var(--space-4);
}

.profile__heading {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  margin: 0;
}

.profile__facts {
  display: grid;
  gap: var(--space-3);
  margin: 0;
}

.profile__facts dt {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-soft);
}

.profile__facts dd {
  margin: var(--space-1) 0 0;
  font-weight: 600;
}

.profile__note {
  margin: 0;
  color: var(--color-ink-soft);
  font-size: 0.92rem;
  max-width: 65ch;
}

.profile__form {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
}

.profile__field {
  display: grid;
  gap: var(--space-1);
  width: 100%;
  font-size: 0.9rem;
  font-weight: 700;
}

.profile__field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 1rem;
  font-weight: 400;
}

.profile__field input:focus {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}
</style>
