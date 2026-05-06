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
    // 🔹 Usamos getSession para evitar colisiones de tokens (Lock Error)
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session?.user) {
      router.push("/login")
      return
    }
    const user = session.user

    const res = await fetch('/api/red', {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    })

    if (!res.ok) {
      console.error("Error al cargar la red")
      return
    }

    const users = await res.json()
    const me = users.find(u => u.supabase_id === user.id)

    if (!me || !users) return

    // 🔥 Optimización: Crear mapas para búsquedas O(1)
    const userMap = new Map(users.map(u => [u.supabase_id, u]));
    const childrenMap = new Map();
    
    users.forEach(u => {
      if (u.referido_por_uuid) {
        const list = childrenMap.get(u.referido_por_uuid) || [];
        list.push(u);
        childrenMap.set(u.referido_por_uuid, list);
      }
    });

    // 🔥 Función para determinar si un usuario está activo (Verde) o Inactivo (Gris)
    const estaActivo = (u) => {
      // El admin y la red global siempre son verdes
      if (u?.role === "admin") return true;
      if (!u?.activo_comisiones || !u?.ultimo_pago) return false;

      const hoy = new Date();
      const ultimo = new Date(u.ultimo_pago);

      // Activo si su compra calificada pertenece al mes calendario actual
      return hoy.getMonth() === ultimo.getMonth() && hoy.getFullYear() === ultimo.getFullYear();
    };

    const buildTreeByUUID = (userId) => {
      const user = userMap.get(userId);
      if (!user) return null;

      const activo = estaActivo(user);

      return {
        name: (user.nombre || "SIN NOMBRE").toUpperCase(),
        attributes: {
          fecha: user.created_at ? new Date(user.created_at).toLocaleDateString() : "",
          codigo: user.codigo || "",
          activo // Pasamos el estado al nodo
        },
        children: (childrenMap.get(userId) || [])
          .map(child => buildTreeByUUID(child.supabase_id))
      };
    };

    // 🔥 ADMIN → VE TODA LA RED
    if (me.role === "admin") {
      const roots = users.filter(u => !u.referido_por_uuid);

      const fullTree = {
        name: "RED GLOBAL",
        attributes: { activo: true },
        children: roots.map(root => buildTreeByUUID(root.supabase_id))
      };

      setTreeData(fullTree)
      return
    }

    // 🔹 USUARIO NORMAL → SOLO SU RED
    const myTree = buildTreeByUUID(me.supabase_id)

    setTreeData(myTree)
  }

  return (
    <div style={styles.container}>
      {treeData && (
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="diagonal"
          zoomable={true}
          draggable={true}
          collapsible={true}
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
const renderNode = ({ nodeDatum, toggleNode }) => {
  const isActive = nodeDatum.attributes?.activo !== false;
  const statusColor = isActive ? "#16a34a" : "#94a3b8"; // Verde vs Gris

  return (
    <g>
      <foreignObject x="-80" y="-40" width="160" height="100">
        <div style={styles.card} onClick={toggleNode}>
          
          <div style={{ ...styles.avatar, background: isActive ? "#22c55e" : "#94a3b8" }}></div>

          <div style={styles.name}>
            {nodeDatum.name}
          </div>

          <div style={{ ...styles.code, color: statusColor }}>
            {nodeDatum.attributes?.codigo}
          </div>

        <div style={styles.date}>
          {nodeDatum.attributes?.fecha}
        </div>

      </div>
    </foreignObject>
  </g>
  )
}

/* 🎨 ESTILOS */
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