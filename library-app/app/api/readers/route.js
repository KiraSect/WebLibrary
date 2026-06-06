import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function POST(req) {
  try {
    const body = await req.json()

    const { first_name, last_name, email, phone, student_group } = body

    if (!first_name || !last_name) {
      return NextResponse.json(
        { error: "Имя и фамилия обязательны" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("readers")
      .insert({
        first_name,
        last_name,
        email: email || null,
        phone: phone || null,
        student_group: student_group || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("readers")
    .select("id, first_name, last_name, email, phone, student_group")
    .order("last_name", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}