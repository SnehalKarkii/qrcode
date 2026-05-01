import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export async function GET() {
  const ids = await kv.lrange("scans", 0, -1);

  const scans = await Promise.all(ids.map((id) => kv.get(`scan:${id}`)));

  return NextResponse.json(scans.filter(Boolean));
}

export async function POST(req: Request) {
  const body = await req.json();

  const id = crypto.randomUUID();

  const scan = {
    id,
    value: body.value,
    image: body.image || null,
    createdAt: new Date().toISOString(),
  };

  await kv.set(`scan:${id}`, scan);
  await kv.lpush("scans", id);

  return NextResponse.json(scan);
}
