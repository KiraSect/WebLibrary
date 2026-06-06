import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

export async function POST(req) {
  try {
    const { email, password } = await req.json()

    const { data, error } = await supabase.rpc("verify_user_login", {
      input_email: email,
      input_password: password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      )
    }

    return NextResponse.json(data[0])
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}