import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

console.log(process.env.DATABASE_URL);
