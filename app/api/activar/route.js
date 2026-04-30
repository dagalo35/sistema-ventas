import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    // ✅ Crear cliente DENTRO de la función (IMPORTANTE)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 🔒 VERIFICAR AUTORIZACIÓN
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Usamos el cliente admin para verificar el rol del usuario en la DB sin interferencia de RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const { data: adminUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("supabase_id", user.id)
      .single()

    // Verificamos en minúsculas para mayor seguridad
    if (adminUser?.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: "Prohibido: Se requiere rol de administrador" }, { status: 403 })
    }

    // 🧾 Obtener body
    const body = await req.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: "user_id es requerido" },
        { status: 400 }
      )
    }

    // 🔍 VERIFICAR ESTADO ACTUAL
    const { data: targetUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("activo, email, nombre, referido_por_uuid")
      .eq("supabase_id", user_id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (targetUser.activo) {
      return NextResponse.json({ error: "El usuario ya se encuentra activo" }, { status: 400 })
    }

    // 🔥 ACTIVAR USUARIO
    const { data: userData, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ activo: true })
      .eq("supabase_id", user_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // 🔥 REPARTO DE COMISIONES MULTINIVEL (Ejemplo 3 Niveles)
    // Nivel 1: S/ 20, Nivel 2: S/ 10, Nivel 3: S/ 5
    const niveles = [
      { monto: 20, desc: "Nivel 1", n: 1 },
      { monto: 10, desc: "Nivel 2", n: 2 },
      { monto: 5,  desc: "Nivel 3", n: 3 }
    ]

    let actualSponsorUUID = targetUser.referido_por_uuid
    const comisionesAInsertar = []

    for (const nivel of niveles) {
      if (!actualSponsorUUID) break // Si no hay más patrocinadores arriba, terminamos

      // Obtener datos del patrocinador actual para saber quién es SU patrocinador (para el siguiente nivel)
      const { data: sponsorData } = await supabaseAdmin
        .from("users")
        .select("supabase_id, referido_por_uuid, activo, role")
        .eq("supabase_id", actualSponsorUUID)
        .single()

      if (sponsorData) {
        // Solo pagan comisión si el patrocinador está activo (regla común en MLM)
        if (sponsorData.activo) {
          comisionesAInsertar.push({
            user_id: sponsorData.supabase_id, // El que recibe el dinero
            from_user: targetUser.supabase_id, // El usuario que se activó (origen)
            monto: nivel.monto,
            tipo: `Bono Activación - ${nivel.desc}`,
            nivel: nivel.n
          })
        }
        // Subimos al siguiente nivel
        actualSponsorUUID = sponsorData.referido_por_uuid
      } else {
        break
      }
    }

    if (comisionesAInsertar.length > 0) {
      // Insertar todas las comisiones en un solo paso
      const { error: insertError } = await supabaseAdmin
        .from("comisiones")
        .insert(comisionesAInsertar)

      if (insertError) console.error("Error insertando comisiones:", insertError)

      // NOTA: Lo ideal aquí es usar una función RPC para que esto sea atómico.
      // Como mejora temporal, actualizamos los saldos.
      for (const com of comisionesAInsertar) {
        // Usamos una operación de incremento relativa para evitar problemas de concurrencia
        // PostgreSQL permite: update users set saldo = saldo + increment ...
        // Con la API de Supabase:
        await supabaseAdmin.rpc('increment_saldo', { user_uuid: com.user_id, amount: com.monto })
      }
    }

    return NextResponse.json({ ok: true })

  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Error interno" },
      { status: 500 }
    )
  }
}