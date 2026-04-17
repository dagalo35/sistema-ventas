'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { toast, Toaster } from 'sonner'

// 🔥 cliente supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Login() {
  const router = useRouter()

  const [form, setForm] = useState({
    email: '',
    password: ''
  })

  const [loading, setLoading] = useState(false)

  // 🔥 LOGIN
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    router.push('/dashboard')
  }

  // 🔥 RECUPERAR CONTRASEÑA
  const handleResetPassword = async () => {
    if (!form.email) {
      toast.warning('Ingresa tu correo primero')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${window.location.origin}/update-password`
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Revisa tu correo para restablecer tu contraseña')
    }
  }

  return (
    <div style={styles.body}>
      <Toaster richColors position="top-right" />
      <div style={styles.container}>
        <h1 style={styles.title}>Bienvenido</h1>
        <p style={styles.subtitle}>GHC INTERNATIONAL S.A.C.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label htmlFor="email" style={styles.label}>Correo</label>
            <input
              id="email"
              type="email"
              placeholder="Correo electrónico"
              required
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password" style={styles.label}>Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="Contraseña"
              required
              style={styles.input}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </div>

          <button style={styles.button} disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={styles.links}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              handleResetPassword()
            }}
            style={{ cursor: 'pointer' }}
          >
            Olvidé mi contraseña
          </a>{' '}
          | <a href="/register">Crear cuenta</a>
        </div>
      </div>
    </div>
  )
}

// 🎨 ESTILOS
const styles = {
  body: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    fontFamily: 'Inter, sans-serif'
  },

  container: {
    background: 'rgba(255,255,255,0.95)',
    padding: '40px',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '380px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.15)',
    textAlign: 'center',
    backdropFilter: 'blur(10px)'
  },

  title: {
    fontSize: '26px',
    marginBottom: '10px',
    color: '#1f2937'
  },

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '25px'
  },

  label: {
    display: 'block',
    textAlign: 'left',
    fontSize: '12px',
    marginBottom: '5px',
    color: '#374151'
  },

  inputGroup: {
    marginBottom: '20px'
  },

  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    outline: 'none',
    fontSize: '14px'
  },

  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer'
  },

  links: {
    marginTop: '15px',
    fontSize: '13px'
  }
}