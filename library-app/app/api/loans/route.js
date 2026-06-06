import { NextResponse } from "next/server"
import { supabase } from "../../../lib/supabase"

async function getLoans() {
  const { data, error } = await supabase
    .from("loans")
    .select(`
      id,
      reader_id,
      copy_id,
      issued_by,
      issued_at,
      due_date,
      returned_at,
      status,
      readers(
        id,
        first_name,
        last_name,
        email,
        phone,
        student_group
      ),
      book_copies(
        id,
        quantity,
        cabinet_id,
        books(
          id,
          title,
          publish_year
        ),
        cabinets(
          id,
          number
        )
      ),
      users(
        id,
        full_name
      )
    `)
    .order("issued_at", { ascending: false })

  return { data, error }
}

export async function GET() {
  const { data, error } = await getLoans()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data || [])
}

export async function POST(req) {
  try {
    const { reader_id, copy_id, issued_by, due_date } = await req.json()

    if (!reader_id || !copy_id || !due_date) {
      return NextResponse.json(
        { error: "Выберите читателя, кабинет и дату возврата" },
        { status: 400 }
      )
    }

    const { data: copy, error: copyError } = await supabase
      .from("book_copies")
      .select("id, quantity")
      .eq("id", copy_id)
      .single()

    if (copyError) {
      return NextResponse.json(
        { error: copyError.message },
        { status: 500 }
      )
    }

    if (!copy || Number(copy.quantity) <= 0) {
      return NextResponse.json(
        { error: "В этом кабинете нет доступных экземпляров" },
        { status: 400 }
      )
    }

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .insert({
        reader_id: Number(reader_id),
        copy_id: Number(copy_id),
        issued_by: issued_by ? Number(issued_by) : null,
        due_date,
        status: "issued",
      })
      .select()
      .single()

    if (loanError) {
      return NextResponse.json(
        { error: loanError.message },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from("book_copies")
      .update({
        quantity: Number(copy.quantity) - 1,
      })
      .eq("id", copy_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Книга успешно выдана",
      loan,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

export async function PATCH(req) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json(
        { error: "Не выбрана запись выдачи" },
        { status: 400 }
      )
    }

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select(`
        id,
        copy_id,
        status,
        book_copies(
          id,
          quantity
        )
      `)
      .eq("id", id)
      .single()

    if (loanError) {
      return NextResponse.json(
        { error: loanError.message },
        { status: 500 }
      )
    }

    if (!loan) {
      return NextResponse.json(
        { error: "Запись выдачи не найдена" },
        { status: 404 }
      )
    }

    if (loan.status === "returned") {
      return NextResponse.json(
        { error: "Эта книга уже возвращена" },
        { status: 400 }
      )
    }

    const { error: returnError } = await supabase
      .from("loans")
      .update({
        status: "returned",
        returned_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (returnError) {
      return NextResponse.json(
        { error: returnError.message },
        { status: 500 }
      )
    }

    const currentQuantity = Number(loan.book_copies?.quantity || 0)

    const { error: copyError } = await supabase
      .from("book_copies")
      .update({
        quantity: currentQuantity + 1,
      })
      .eq("id", loan.copy_id)

    if (copyError) {
      return NextResponse.json(
        { error: copyError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Книга успешно возвращена",
    })
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}