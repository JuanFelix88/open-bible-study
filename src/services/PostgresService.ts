import { StaticClass } from "@/entities/StaticClass";
import * as pg from "pg";

export enum PostgresTypes {
  BOOL = 16,
  BYTEA = 17,
  CHAR = 18,
  INT8 = 20,
  INT2 = 21,
  INT4 = 23,
  REGPROC = 24,
  TEXT = 25,
  OID = 26,
  TID = 27,
  XID = 28,
  CID = 29,
  JSON = 114,
  XML = 142,
  PG_NODE_TREE = 194,
  SMGR = 210,
  PATH = 602,
  POLYGON = 604,
  CIDR = 650,
  FLOAT4 = 700,
  FLOAT8 = 701,
  ABSTIME = 702,
  RELTIME = 703,
  TINTERVAL = 704,
  CIRCLE = 718,
  MACADDR8 = 774,
  MONEY = 790,
  MACADDR = 829,
  INET = 869,
  ACLITEM = 1033,
  BPCHAR = 1042,
  VARCHAR = 1043,
  DATE = 1082,
  TIME = 1083,
  TIMESTAMP = 1114,
  TIMESTAMPTZ = 1184,
  INTERVAL = 1186,
  TIMETZ = 1266,
  BIT = 1560,
  VARBIT = 1562,
  NUMERIC = 1700,
  REFCURSOR = 1790,
  REGPROCEDURE = 2202,
  REGOPER = 2203,
  REGOPERATOR = 2204,
  REGCLASS = 2205,
  REGTYPE = 2206,
  UUID = 2950,
  TXID_SNAPSHOT = 2970,
  PG_LSN = 3220,
  PG_NDISTINCT = 3361,
  PG_DEPENDENCIES = 3402,
  TSVECTOR = 3614,
  TSQUERY = 3615,
  GTSVECTOR = 3642,
  REGCONFIG = 3734,
  REGDICTIONARY = 3769,
  JSONB = 3802,
  REGNAMESPACE = 4089,
  REGROLE = 4096,
}

if (
  [
    process.env.PG_HOST,
    process.env.PG_PORT,
    process.env.PG_USER,
    process.env.PG_PASSWORD,
    process.env.PG_DATABASE,
  ].some((i) => !i)
) {
  throw new Error("Database data is absent.");
}

function getTypeParser(type: PostgresTypes) {
  return (data: string | Buffer) => {
    if (type === PostgresTypes.NUMERIC) {
      return Number(data.toString());
    }

    if (type === PostgresTypes.INT8) {
      return Number(data.toString());
    }

    if (type === PostgresTypes.INT4) {
      return Number(data.toString());
    }

    if (type === PostgresTypes.INT2) {
      return Number(data.toString());
    }

    if (type === PostgresTypes.JSON) {
      return JSON.parse(data.toString());
    }

    if (type === PostgresTypes.TIMESTAMP) {
      return new Date(data.toString());
    }

    if (type === PostgresTypes.TIMESTAMPTZ) {
      return new Date(data.toString());
    }

    if (type === PostgresTypes.BOOL) {
      return data.toString() === "t";
    }

    if (type === PostgresTypes.FLOAT8) {
      return Number(data.toString());
    }

    return data;
  };
}

const pool = new pg.Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  keepAlive: true,
  idleTimeoutMillis: 20_000,
  max: 5,
  min: 1,
  types: { getTypeParser } as any,
});

export class PostgresService extends StaticClass {
  public static service: PostgresService;
  public static counter = 0;
  public connected: boolean = false;

  public static async connect() {
    return new PostgresService(await pool.connect());
  }

  public static async query<T extends pg.QueryResultRow = any>(
    query: string,
    values?: (string | number | boolean | Date)[]
  ) {
    return pool.query<T>(query, values);
  }

  private constructor(private client: pg.PoolClient) {
    super();
  }

  public get() {
    return this.client;
  }

  public async query<T extends pg.QueryResultRow = any>(
    query: string,
    values?: (string | number | boolean | undefined | null)[]
  ) {
    return await this.client!.query<T>(query, values);
  }

  private async connect(): Promise<PostgresService> {
    if (this.connected) {
      return this;
    }

    await this.client.connect();
    this.connected = true;
    return this;
  }

  public disconnect() {
    this.connected = false;
    this.client.release(true);
  }

  [Symbol.dispose]() {
    this.disconnect();
  }
}
