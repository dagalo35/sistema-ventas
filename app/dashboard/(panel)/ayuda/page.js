'use client'

import { useRouter } from "next/navigation"

export default function Ayuda() {
  const router = useRouter()

  return (
    <div style={styles.container}>

      {/* CONTENIDO */}
      <main style={styles.main}>

        <h1 style={styles.title}>🎧 Centro de Ayuda</h1>

        <p style={styles.subtitle}>
          ¿En qué podemos ayudarte?
        </p>

        {/* TARJETAS */}
        <div style={styles.grid}>

          <div style={styles.card}>
            <h3>📦 Pedidos</h3>
            <p>Problemas con pedidos, pagos o estados.</p>
          </div>

          <div style={styles.card}>
            <h3>💰 Comisiones</h3>
            <p>Dudas sobre ganancias o niveles.</p>
          </div>

          <div style={styles.card}>
            <h3>🌐 Red</h3>
            <p>Consulta sobre tu equipo o referidos.</p>
          </div>

          <div style={styles.card}>
            <h3>🔐 Cuenta</h3>
            <p>Acceso, contraseña o datos personales.</p>
          </div>

        </div>

        {/* FAQ */}
        <div style={styles.section}>
          <h2>❓ Preguntas Frecuentes</h2>

          <div style={styles.faq}>
            <p><strong>¿Cuándo se generan mis comisiones?</strong></p>
            <span>Cuando un pedido es aprobado.</span>
          </div>

          <div style={styles.faq}>
            <p><strong>¿Qué es nivel 1, 2 y 3?</strong></p>
            <span>Son niveles de tu red de referidos.</span>
          </div>

          <div style={styles.faq}>
            <p><strong>¿Por qué no veo mis ganancias?</strong></p>
            <span>Verifica que los pedidos estén aprobados.</span>
          </div>

        </div>

        {/* CONTACTO */}
        <div style={styles.contact}>
          <h2>📞 Soporte</h2>

          <p>Si necesitas ayuda personalizada:</p>

          <button style={styles.btn}>
            📩 Contactar Soporte
          </button>
        </div>

      </main>
    </div>
  )
}

/* 🎨 ESTILOS */
const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f3f4f6"
  },

  link: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    cursor: "pointer"
  },

  linkActive: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    background: "#22c55e"
  },

  main: {
    flex: 1,
    padding: 30
  },

  title: {
    fontSize: 26,
    marginBottom: 10
  },

  subtitle: {
    color: "#6b7280",
    marginBottom: 20
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 15,
    marginBottom: 30
  },

  card: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    cursor: "pointer",
    transition: "0.2s"
  },

  section: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },

  faq: {
    marginTop: 10,
    borderBottom: "1px solid #eee",
    paddingBottom: 10
  },

  contact: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    textAlign: "center"
  },

  btn: {
    marginTop: 10,
    background: "#16a34a",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: 8,
    cursor: "pointer"
  }
}