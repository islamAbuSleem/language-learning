<script setup lang="ts">
import type { AuthMethods, UserPayload } from "#shared/api/schemas"

const route = useRoute()

const { data: initial } = await useFetch<{ user: UserPayload | null; methods: AuthMethods }>(
  "/api/auth/me",
  { headers: useRequestHeaders(["cookie"]) },
)

const methods = computed<AuthMethods>(
  () => initial.value?.methods ?? { password: true, magic: false, google: false },
)

/** `login` or `signup`: one form, two intentions. */
const mode = ref<"login" | "signup">("login")
const email = ref("")
const password = ref("")
const displayName = ref("")
const magicEmail = ref("")
const error = ref<string | null>(null)
const busy = ref(false)
const magicSent = ref(false)

function messageOf(failure: unknown): string {
  if (failure && typeof failure === "object" && "data" in failure) {
    const data = (failure as { data?: { statusMessage?: string; message?: string } }).data
    if (data?.statusMessage) return data.statusMessage
    if (data?.message) return data.message
  }
  if (failure instanceof Error) return failure.message

  return "Something went wrong. Try again."
}

async function submitPassword() {
  error.value = null
  busy.value = true

  try {
    const path = mode.value === "login" ? "/api/auth/login" : "/api/auth/signup"

    await $fetch(path, {
      method: "POST",
      body: {
        email: email.value,
        password: password.value,
        ...(displayName.value.trim() ? { displayName: displayName.value.trim() } : {}),
      },
    })

    await navigateTo("/")
  } catch (failure) {
    error.value = messageOf(failure)
  } finally {
    busy.value = false
  }
}

async function submitMagic() {
  error.value = null
  busy.value = true

  try {
    await $fetch("/api/auth/magic", { method: "POST", body: { email: magicEmail.value } })
    magicSent.value = true
  } catch (failure) {
    error.value = messageOf(failure)
  } finally {
    busy.value = false
  }
}

function startGoogle() {
  window.location.href = "/api/auth/google"
}
</script>

<template>
  <main class="auth">
    <p class="auth__back"><NuxtLink to="/">← Learn</NuxtLink></p>

    <h1 class="auth__title">{{ mode === "login" ? "Welcome back" : "Make an account" }}</h1>
    <p class="auth__note">
      {{
        mode === "login"
          ? "Pick up where you left off, on any device."
          : "Your progress so far comes with you."
      }}
    </p>

    <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
    <p v-else-if="route.query.magic === 'invalid'" class="auth__error" role="alert">
      That link is used up or expired. Ask for a fresh one below.
    </p>

    <section v-if="methods.password" class="auth__block">
      <div class="auth__tabs" role="tablist" aria-label="Sign in or sign up">
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          :class="{ 'is-active': mode === 'login' }"
          @click="mode = 'login'; error = null"
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'signup'"
          :class="{ 'is-active': mode === 'signup' }"
          @click="mode = 'signup'; error = null"
        >
          Sign up
        </button>
      </div>

      <form class="auth__form" @submit.prevent="submitPassword">
        <label class="auth__field">
          <span>Email</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label v-if="mode === 'signup'" class="auth__field">
          <span>Name <em>(optional)</em></span>
          <input
            v-model="displayName"
            type="text"
            autocomplete="nickname"
            placeholder="What should we call you?"
          />
        </label>

        <label class="auth__field">
          <span>Password</span>
          <input
            v-model="password"
            type="password"
            required
            :minlength="mode === 'signup' ? 8 : undefined"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="At least 8 characters"
          />
        </label>

        <button type="submit" class="btn btn--primary btn--large" :disabled="busy">
          {{ mode === "login" ? "Sign in" : "Create account" }}
        </button>
      </form>
    </section>

    <section v-if="methods.magic" class="auth__block">
      <h2 class="auth__heading">Or use a link</h2>
      <p v-if="magicSent" class="auth__sent">
        If that address can sign in, a link is on its way. It works once and
        expires in fifteen minutes.
      </p>
      <form v-else class="auth__form" @submit.prevent="submitMagic">
        <label class="auth__field">
          <span>Email</span>
          <input
            v-model="magicEmail"
            type="email"
            required
            autocomplete="email"
            placeholder="you@example.com"
          />
        </label>
        <button type="submit" class="btn btn--ghost" :disabled="busy">Email me a link</button>
      </form>
    </section>

    <section v-if="methods.google" class="auth__block">
      <h2 class="auth__heading">Or continue with</h2>
      <button type="button" class="btn btn--ghost" :disabled="busy" @click="startGoogle">
        Google
      </button>
    </section>
  </main>
</template>

<style scoped>
.auth {
  max-width: 560px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4) var(--space-7);
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

.auth__back {
  margin: 0;
}

.auth__back a {
  color: var(--color-ink-soft);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.92rem;
}

.auth__back a:hover {
  color: var(--color-ink);
}

.auth__title {
  font-family: var(--font-display);
  font-size: clamp(1.9rem, 1.5rem + 2.5vw, 2.5rem);
  line-height: 1.08;
  font-weight: 400;
}

.auth__note {
  margin: calc(var(--space-4) * -1) 0 0;
  color: var(--color-ink-soft);
  max-width: 65ch;
}

.auth__error {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-wrong-soft);
  border: 1px solid var(--color-wrong);
  color: var(--color-wrong);
}

.auth__block {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
}

.auth__heading {
  font-size: 1.05rem;
  font-weight: 800;
}

.auth__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: var(--radius-md);
  background: var(--color-paper);
}

.auth__tabs button {
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: var(--space-2) var(--space-3);
  font-weight: 700;
  color: var(--color-ink-soft);
}

.auth__tabs button.is-active {
  background: var(--color-surface);
  border-color: var(--color-line);
  color: var(--color-ink);
}

.auth__form {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
}

.auth__field {
  display: grid;
  gap: var(--space-1);
  width: 100%;
  font-size: 0.9rem;
  font-weight: 700;
}

.auth__field em {
  font-style: normal;
  font-weight: 400;
  color: var(--color-ink-soft);
}

.auth__field input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: 1rem;
  font-weight: 400;
}

.auth__field input:focus {
  outline: 3px solid var(--color-accent);
  outline-offset: 1px;
  border-color: var(--color-accent);
}

.auth__sent {
  margin: 0;
  color: var(--color-ink);
  max-width: 65ch;
}

.btn--large {
  font-size: 1.05rem;
  padding: var(--space-4) var(--space-6);
}
</style>
