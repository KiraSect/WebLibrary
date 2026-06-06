// app/api/authors/route.js
import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function GET() {
  const { data, error } = await supabase
    .from("authors")
    .select("*")
    .order("full_name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}