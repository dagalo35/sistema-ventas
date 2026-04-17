'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir al dashboard si hay sesión, sino al login
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) router.push('/dashboard')
      else router.push('/login')
    })
  }, [])

  return <p style={{ padding: 20 }}>Cargando sistema...</p>
}