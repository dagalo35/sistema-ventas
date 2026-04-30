import { createClient } from '@supabase/supabase-js'

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const body = await req.json()

    const {
      nombre,
      apellidos,
      documento,
      direccion,
      referencia,
      pais,
      departamento,
      provincia,
      distrito,
      email,
      celular,
      password,
      sponsor
    } = body

    // 🔹 VALIDAR SPONSOR
    let sponsorUUID = null

    if (sponsor) {
      const { data: sponsorUser, error: sponsorError } = await supabaseAdmin
        .from('users')
        .select('supabase_id')
        .eq('codigo', sponsor)
        .maybeSingle()

      if (sponsorError) {
        return Response.json({ error: sponsorError.message })
      }

      if (!sponsorUser) {
        return Response.json({ error: 'Código de patrocinador inválido' })
      }

      sponsorUUID = sponsorUser.supabase_id
    }

    // 🔹 CREAR USUARIO EN AUTH
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password
      })

    if (authError) {
      return Response.json({ error: authError.message })
    }

    if (!authData?.user) {
      return Response.json({ error: "No se creó el usuario" })
    }

    const user = authData.user

    // 🔹 GENERAR CÓDIGO ÚNICO
    const { data: lastUser, error: lastUserError } = await supabaseAdmin
      .from('users')
      .select('codigo')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastUserError) {
      return Response.json({ error: lastUserError.message })
    }


    // Peligro: Lógica propensa a condiciones de carrera (Race Conditions)
    const lastCodeNumber = lastUser?.codigo ? parseInt(lastUser.codigo.split('-')[1]) : 0
    const nuevoNumero = lastCodeNumber + 1
    const codigoGenerado = `GHC-${String(nuevoNumero).padStart(3, '0')}`

    // 🔹 INSERTAR EN TABLA USERS
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        supabase_id: user.id,
        nombre,
        apellidos,
        documento,
        direccion,
        referencia,
        pais,
        departamento,
        provincia,
        distrito,
        email,
        celular,
        codigo: codigoGenerado,
        referido_por_uuid: sponsorUUID
      })

    if (dbError) {
      return Response.json({ error: dbError.message })
    }

    return Response.json({ ok: true, user: authData.user })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}