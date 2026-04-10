'use client'

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Red() {
  const [tree, setTree] = useState(null);
  const [role, setRole] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // 🔹 usuario actual
    const { data: me } = await supabase
      .from("users")
      .select("*")
      .eq("supabase_id", user.id)
      .single();

    if (!me) return;

    setRole(me.role);

    // 🔹 todos los usuarios
    const { data: users } = await supabase
      .from("users")
      .select("*");

    // 🔹 construir árbol (USANDO codigo y referido_por)
    function buildTree(parentCode) {
      return users
        ?.filter(u => u.referido_por === parentCode)
        .map(u => ({
          ...u,
          children: buildTree(u.codigo)
        }));
    }

    // 🔥 ADMIN → VE TODA LA RED
    if (me.role === "admin") {

      const roots = users.filter(u => !u.referido_por);

      const fullTree = roots.map(root => ({
        ...root,
        children: buildTree(root.codigo)
      }));

      setTree({ children: fullTree });
      return;
    }

    // 🔹 USUARIO NORMAL → SOLO SU RED
    const myTree = {
      ...me,
      children: buildTree(me.codigo)
    };

    setTree(myTree);
  }

  if (!tree) return <p style={{ padding: 20 }}>Cargando red...</p>;

  return (
    <div style={styles.content}>
      <h1 style={styles.title}>🌐 Mi Red</h1>

      <div style={styles.tree}>

        {/* 🔥 ADMIN */}
        {role === "admin" ? (
          tree.children?.map(child => (
            <Node key={child.id} user={child} />
          ))
        ) : (
          // 🔹 USUARIO NORMAL
          <Node user={tree} />
        )}

      </div>
    </div>
  );
}

/* 🔥 NODO */
function Node({ user }) {
  return (
    <div style={styles.nodeWrapper}>

      <div style={styles.node}>
        <div style={styles.avatar}></div>
        <span style={styles.name}>
          {user.nombre || "Sin nombre"}
        </span>
      </div>

      {user.children && user.children.length > 0 && (
        <div style={styles.children}>
          {user.children.map(child => (
            <Node key={child.id} user={child} />
          ))}
        </div>
      )}
    </div>
  );
}

/* 🎨 ESTILOS */
const styles = {
  content: {
    padding: "40px"
  },

  title: {
    marginBottom: "40px"
  },

  tree: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "40px"
  },

  nodeWrapper: {
    textAlign: "center"
  },

  node: {
    background: "white",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    display: "inline-block",
    minWidth: "100px"
  },

  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#22c55e",
    margin: "0 auto 10px"
  },

  name: {
    fontWeight: "bold"
  },

  children: {
    marginTop: "30px",
    display: "flex",
    justifyContent: "center",
    gap: "40px",
    flexWrap: "wrap"
  }
};