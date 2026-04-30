import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getSupabase() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('productos').select('*').order('nombre')
    if (error) throw error
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    if (!token) return Response.json({ error: 'Token faltante' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()

    if (!body.nombre || parseFloat(body.precio) <= 0) {
      return Response.json({ error: 'Datos de producto inválidos' }, { status: 400 })
    }
    
    const { error } = await supabase.from('productos').insert([
      { 
        nombre: body.nombre, 
        precio: parseFloat(body.precio), 
        imagen: body.imagen 
      }
    ])
    
    if (error) throw error

    return Response.json({ message: 'Producto agregado correctamente' })
  } catch (err) {
    console.error("Error en POST /api/productos:", err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const supabase = getSupabase()
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.split(' ')[1]

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) throw error

    return Response.json({ message: 'Producto eliminado' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}