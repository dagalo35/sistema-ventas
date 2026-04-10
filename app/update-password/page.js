'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      alert('Contraseña actualizada correctamente')
      window.location.href = '/login'
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Nueva contraseña</h2>

      <form onSubmit={handleUpdate}>
        <input
          type="password"
          placeholder="Nueva contraseña"
          required
          onChange={(e) => setPassword(e.target.value)}
        />

        <button disabled={loading}>
          {loading ? 'Actualizando...' : 'Guardar'}
        </button>
      </form>
    </div>
  )
}