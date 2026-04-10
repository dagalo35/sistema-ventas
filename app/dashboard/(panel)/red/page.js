'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"

const Tree = dynamic(() => import("react-d3-tree"), { ssr: false })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Red() {
  const [treeData, setTreeData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadTree()
  }, [])

  const loadTree = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: users } = await supabase
      .from("users")
      .select("*")

    if (!users) return

    // 🔥 MAPA
    const map = {}

    users.forEach(u => {
      map[u.supabase_id] = {
        name: (u.nombre || "SIN NOMBRE").toUpperCase(),
        attributes: {
          fecha: u.created_at
            ? new Date(u.created_at).toLocaleDateString()
            : "",
          codigo: u.codigo || ""
        },
        children: []
      }
    })

    let root = null

    users.forEach(u => {
      if (u.referido_por_uuid) {
        map[u.referido_por_uuid]?.children.push(map[u.supabase_id])
      } else {
        root = map[u.supabase_id]
      }
    })

    setTreeData(root)
  }

  return (
    <div style={styles.container}>
      {treeData && (
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="diagonal" // 🔥 líneas suaves PRO
          zoomable={true}
          draggable={true}
          collapsible={true} // 🔥 expandir / cerrar
          translate={{ x: 500, y: 120 }}
          nodeSize={{ x: 200, y: 120 }}
          separation={{ siblings: 1.5, nonSiblings: 2 }}
          renderCustomNodeElement={renderNode}
        />
      )}
    </div>
  )
}

/* 🔥 NODO PRO */
const renderNode = ({ nodeDatum, toggleNode }) => (
  <g>
    <foreignObject x="-80" y="-40" width="160" height="100">
      <div style={styles.card} onClick={toggleNode}>
        
        <div style={styles.avatar}></div>

        <div style={styles.name}>
          {nodeDatum.name}
        </div>

        <div style={styles.code}>
          {nodeDatum.attributes?.codigo}
        </div>

        <div style={styles.date}>
          {nodeDatum.attributes?.fecha}
        </div>

      </div>
    </foreignObject>
  </g>
)

/* 🎨 ESTILOS PRO */
const styles = {
  container: {
    width: "100%",
    height: "90vh",
    background: "#f9fafb"
  },

  card: {
    background: "white",
    borderRadius: "12px",
    padding: "10px",
    textAlign: "center",
    boxShadow: "0 5px 15px rgba(0,0,0,0.15)",
    cursor: "pointer"
  },

  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#22c55e",
    margin: "0 auto 5px"
  },

  name: {
    fontWeight: "bold",
    fontSize: "12px"
  },

  code: {
    fontSize: "11px",
    color: "#16a34a"
  },

  date: {
    fontSize: "10px",
    color: "#6b7280"
  }
}