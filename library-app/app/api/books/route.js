import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")

  let query = supabase
    .from("books")
    .select(`
      *,
      book_categories(
        categories(name)
      ),
      book_copies(
        id,
        quantity,
        cabinet_id,
        cabinets(
          id,
          number
        )
      )
    `)

  if (year) {
    query = query.eq("publish_year", year)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}