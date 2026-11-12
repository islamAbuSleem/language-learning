import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 5, idle_timeout: 20, onnotice: () => {} });

const t0 = Date.now();
await sql`select 1 as x`;
console.log("first query (incl. handshake):", Date.now() - t0, "ms");

let t = Date.now();
for (let i = 0; i < 5; i++) await sql`select 1 as x`;
console.log("5 sequential queries:", Date.now() - t, "ms  (", ((Date.now() - t) / 5).toFixed(0), "ms each )");

t = Date.now();
await sql.begin(async (tx) => {
  for (let i = 0; i < 3; i++) await tx`select 1 as x`;
});
console.log("3 queries in one transaction:", Date.now() - t, "ms");

t = Date.now();
const batch = await sql`select 1 as a, 2 as b, 3 as c`;
console.log("single multi-column query:", Date.now() - t, "ms");

await sql.end({ timeout: 5 });