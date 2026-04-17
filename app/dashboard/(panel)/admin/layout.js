'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { Toaster } from "sonner"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AdminLayout({ children }) {

  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {

    const { data: { session } } = await supabase.auth.getSession()

    // 🔒 NO LOGUEADO
    if (!session) {
      router.push('/login')
      return
    }

    // 🔒 VALIDAR ADMIN
    const { data: userDB, error } = await supabase
      .from('users')
      .select('role')
      .eq('supabase_id', session.user.id)
      .single()

    if (error || !userDB || userDB.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // ✅ OK
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ padding: 30 }}>
        <p>Validando acceso...</p>
      </div>
    )
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      {children}
    </>
  )
}