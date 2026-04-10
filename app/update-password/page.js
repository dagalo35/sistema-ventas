'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function UpdatePassword() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [message, setMessage] = useState('Verificando enlace...')

  // 🔥 VALIDAR TOKEN AUTOMÁTICAMENTE
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()

      if (data.session) {
        setValidSession(true)
        setMessage('Ingresa tu nueva contraseña')
      } else {
        setValidSession(false)
        setMessage('❌ Enlace inválido o expirado')
      }

      setLoading(false)
    }

    checkSession()
  }, [])

  // 🔥 ACTUALIZAR PASSWORD
  const handleUpdate = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      alert('✅ Contraseña actualizada correctamente')
      router.push('/login')
    }
  }

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <h2 style={styles.title}>Recuperar contraseña</h2>

        <p style={styles.message}>{message}</p>

        {loading ? (
          <p>Cargando...</p>
        ) : validSession ? (
          <form onSubmit={handleUpdate}>
            <input
              type="password"
              placeholder="Nueva contraseña"
              required
              value={password}
              style={styles.input}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button style={styles.button} disabled={loading}>
              {loading ? 'Actualizando...' : 'Guardar'}
            </button>
          </form>
        ) : (
          <button
            style={styles.buttonSecondary}
            onClick={() => router.push('/login')}
          >
            Volver al login
          </button>
        )}
      </div>
    </div>
  )
}

// 🎨 ESTILOS PRO
const styles = {
  body: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    fontFamily: 'Inter, sans-serif'
  },

  container: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },

  title: {
    marginBottom: '10px'
  },

  message: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px'
  },

  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '10px',
    border: '1px solid #ddd'
  },

  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    background: '#22c55e',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  buttonSecondary: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    background: '#e5e7eb',
    cursor: 'pointer'
  }
}