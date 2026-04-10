import { createClient } from '@supabase/supabase-js'

// ✅ USAR SERVICE ROLE (SERVER ONLY)
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
      sponsor
    } = body

    // 🔹 1. VALIDAR SPONSOR
    let sponsorCodigo = null

    if (sponsor) {
      const { data: sponsorUser, error: sponsorError } = await supabase
        .from('users')
        .select('codigo')
        .eq('codigo', sponsor)
        .maybeSingle()

      if (sponsorError || !sponsorUser) {
        return Response.json({
          error: 'Código de patrocinador inválido'
        })
      }

      sponsorCodigo = sponsorUser.codigo
    }

    // 🔹 2. GENERAR NUEVO CÓDIGO
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return Response.json({ error: countError.message })
    }

    const nuevoNumero = (count || 0) + 1
    const codigoGenerado = `GHC-${String(nuevoNumero).padStart(3, '0')}`

    // 🔹 3. CREAR USUARIO EN AUTH (ADMIN)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm:true
      })
    console.log("AUTH DATA:", authData)
    console.log("AUTH ERROR:", authError)

    if (authError) {
      return Response.json({ error: authError.message })
    }

    const user = authData.user

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

        // 🔥 NO guardar password (ya lo maneja Supabase Auth)
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
    console.error('ERROR REGISTER:', err)

    return Response.json({
      error: 'Error del servidor'
    })
  }
}