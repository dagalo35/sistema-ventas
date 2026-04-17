import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PATCH(req) {
  const body = await req.json()

  const { pedido_id, estado } = body

  const { error } = await supabase
    .from('pedidos')
    .update({ estado })
    .eq('id', pedido_id)

  if (error) {
    return Response.json({ error: error.message })
  }

  return Response.json({ message: "Estado actualizado" })
}