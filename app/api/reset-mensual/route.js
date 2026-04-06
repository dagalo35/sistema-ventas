import { supabase } from '@/lib/supabase'

export async function GET() {
  try {

    const { error } = await supabase
      .from('users')
      .update({ activo_comisiones: false })
      .neq('id', 0) // aplica a todos

    if (error) {
      return Response.json({ error: error.message })
    }

    return Response.json({
      message: 'Usuarios reseteados correctamente 🔄'
    })

  } catch (err) {
    return Response.json({ error: 'Error del servidor' })
  }
}