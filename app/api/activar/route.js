import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()
    const { user_id } = body

    // 🔥 ACTIVAR USUARIO
    const { data: userData, error } = await supabase
      .from("users")
      .update({ activo: true })
      .eq("supabase_id", user_id)
      .select()
      .single()

    if (error) throw error

    // 🔥 CREAR COMISIÓN
    await supabase.from("comisiones").insert([
      {
        user_id: user_id,
        from_user: userData.email,
        monto: 20,
        tipo: "Activación"
      }
    ])

    return NextResponse.json({ ok: true })

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}