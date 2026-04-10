import { createClient } from '@supabase/supabase-js'

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    console.log("INICIO REGISTER")

    const body = await req.json()
    console.log("BODY:", body)

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
    let sponsorCodigo = null

    if (sponsor) {
      const { data: sponsorUser } = await supabase
        .from('users')
        .select('codigo')
        .eq('codigo', sponsor)
        .maybeSingle()

      if (!sponsorUser) {
        return Response.json({ error: 'Código de patrocinador inválido' })
      }

      sponsorCodigo = sponsorUser.codigo
    }

    // 🔹 GENERAR CÓDIGO (ANTI DUPLICADO)
    const codigoGenerado = `GHC-${Date.now()}`

    // 🔹 CREAR USUARIO
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

    console.log("AUTH DATA:", authData)
    console.log("AUTH ERROR:", authError)

    if (authError) {
      return Response.json({ error: authError.message })
    }

    if (!authData?.user) {
      return Response.json({ error: "No se creó el usuario" })
    }

    const user = authData.user

    // 🔹 INSERTAR EN BD
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
        referido_por: sponsorCodigo,
        activo: true
      })

    if (dbError) {
      console.error("DB ERROR:", dbError)
      return Response.json({ error: dbError.message })
    }

    return Response.json({
      message: 'Usuario registrado correctamente',
      codigo: codigoGenerado
    })

  } catch (err) {
    console.error('ERROR REGISTER:', err)

    return Response.json({
      error: 'Error del servidor'
    })
  }
}