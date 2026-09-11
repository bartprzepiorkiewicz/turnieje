import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env: Record<string, string> = {};
for (const line of readFileSync("C:/Users/dziad/turnieje/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: before } = await supabase.from("tournaments").select("id,name");
  console.log("Turnieje przed:", before?.map((t) => t.name).join(", ") || "(brak)");
  const { error } = await supabase
    .from("tournaments")
    .delete()
    .not("id", "is", null);
  if (error) throw new Error(error.message);
  const { data: after } = await supabase.from("tournaments").select("id");
  console.log("Po usunieciu zostalo:", after?.length ?? "?");
}

main().catch((e) => {
  console.error("BLAD:", e.message);
  process.exit(1);
});
