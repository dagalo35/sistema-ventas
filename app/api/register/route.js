import { createClient } from '@supabase/supabase-js'

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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
      const { data: sponsorUser, error: sponsorError } = await supabase
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
    const { data: lastUser, error: lastUserError } = await supabase
      .from('users')
      .select('codigo')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastUserError) {
      return Response.json({ error: lastUserError.message })
    }

    const lastCodeNumber = lastUser?.codigo ? parseInt(lastUser.codigo.split('-')[1]) : 0
    const nuevoNumero = lastCodeNumber + 1
    const codigoGenerado = `GHC-${String(nuevoNumero).padStart(3, '0')}`

    // 🔹 INSERTAR EN TABLA USERS
    const { error: dbError } = await supabase
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

        // 🔥 AQUÍ ESTÁ LA CORRECCIÓN CLAVE
        referido_por: sponsor || null,
        referido_por_uuid: sponsorUUID,

        activo: true
      })

    if (dbError) {
      return Response.json({ error: dbError.message })
    }

    return Response.json({
      message: 'Usuario registrado correctamente',
      codigo: codigoGenerado
    })

  } catch (err) {
    console.error(err)
    return Response.json({
      error: 'Error del servidor'
    })
  }
}