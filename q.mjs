import pg from "pg"; const p=new pg.Pool({connectionString:process.env.DATABASE_URL});
for (const q of process.argv.slice(2)) { const r=await p.query(q); console.log(JSON.stringify(r.rows)) } await p.end()
