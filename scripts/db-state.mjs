import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, onnotice: () => {} });
const rows = await sql`select item_id, mastery, stability, due_at from item_states where learner_id = '0e1508e1-274b-48c7-ae6d-6262a92e398a' order by item_id`;
for (const r of rows) {
  const due = new Date(Number(r.due_at)).toISOString().slice(0, 16).replace("T", " ");
  console.log("  ", r.item_id.padEnd(24), "mastery", Number(r.mastery).toFixed(2), "in", Number(r.stability), "d  due", due);
}
const p = await sql`select xp, streak from learners where id = '0e1508e1-274b-48c7-ae6d-6262a92e398a'`;
console.log("   profile:", JSON.stringify(p[0]));
await sql.end({ timeout: 5 });