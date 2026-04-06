import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
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
      sponsor // 🔥 código del patrocinador
    } = body

    // 🔹 1. VALIDAR SPONSOR (si existe)
    let sponsorCodigo = null

    if (sponsor) {
      const { data: sponsorUser } = await supabase
        .from('users')
        .select('codigo')
        .eq('codigo', sponsor)
        .single()

      if (!sponsorUser) {
        return Response.json({
          error: 'Código de patrocinador inválido'
        })
      }

      sponsorCodigo = sponsorUser.codigo
    }

    // 🔹 2. GENERAR NUEVO CÓDIGO (GHC-XXX)
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const nuevoNumero = (count || 0) + 1

    const codigoGenerado = `GHC-${String(nuevoNumero).padStart(3, '0')}`

    // 🔹 3. CREAR USUARIO AUTH
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (error) {
      return Response.json({ error: error.message })
    }

    const user = data.user

    // 🔹 4. INSERTAR EN TABLA users
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
        password,

        // 🔥 CLAVE DEL SISTEMA
        codigo: codigoGenerado,
        referido_por: sponsorCodigo,

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
    return Response.json({
      error: 'Error del servidor'
    })
  }
}