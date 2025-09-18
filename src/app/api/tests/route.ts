import { PostgresService } from "@/services/PostgresService";

export async function GET() {
  const ret = PostgresService.query(`--sql
      DO $$
      DECLARE
        resultado INTEGER;
      BEGIN
        resultado := 10 + 20;
        SELECT resultado AS valor;
      END $$;
    `);

  return new Response(JSON.stringify(ret));
}
