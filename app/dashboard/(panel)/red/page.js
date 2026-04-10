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

    const { data: me } = await supabase
      .from("users")
      .select("*")
      .eq("supabase_id", user.id)
      .single();

    if (!me) return;

    setRole(me.role);

    const { data: users } = await supabase
      .from("users")
      .select("*");

    function buildTree(parentCode) {
      return users
        ?.filter(u => u.referido_por === parentCode)
        .map(u => ({
          ...u,
          children: buildTree(u.codigo)
        }));
    }

    if (me.role === "admin") {
      const roots = users.filter(u => !u.referido_por);

      const fullTree = roots.map(root => ({
        ...root,
        children: buildTree(root.codigo)
      }));

      setTree({ children: fullTree });
      return;
    }

    const myTree = {
      ...me,
      children: buildTree(me.codigo)
    };

    setTree(myTree);
  }

  if (!tree) return <p style={{ padding: 20 }}>Cargando red...</p>;

  return (
    <div style={styles.content}>
      <h1 style={styles.title}>🌐 MI RED</h1>

      <div style={styles.tree}>
        {role === "admin"
          ? tree.children?.map(child => (
              <Node key={child.id} user={child} />
            ))
          : <Node user={tree} />}
      </div>
    </div>
  );
}

/* 🔥 NODO PRO */
function Node({ user }) {
  return (
    <div style={styles.nodeWrapper}>

      <div style={styles.node}>
        <div style={styles.avatar}></div>

        <span style={styles.name}>
          {(user.nombre || "SIN NOMBRE").toUpperCase()}
        </span>

        <span style={styles.date}>
          {user.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : ""}
        </span>
      </div>

      {/* 🔥 LÍNEA HACIA HIJOS */}
      {user.children && user.children.length > 0 && (
        <>
          <div style={styles.lineVertical}></div>

          <div style={styles.children}>
            {user.children.map((child, index) => (
              <div key={child.id} style={styles.childWrapper}>
                <div style={styles.lineHorizontal}></div>
                <Node user={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* 🎨 ESTILOS PRO */
const styles = {
  content: {
    padding: "40px",
    background: "#f9fafb",
    minHeight: "100vh"
  },

  title: {
    marginBottom: "40px",
    textAlign: "center"
  },

  tree: {
    display: "flex",
    justifyContent: "center"
  },

  nodeWrapper: {
    textAlign: "center",
    position: "relative"
  },

  node: {
    background: "white",
    padding: "15px",
    borderRadius: "12px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
    display: "inline-block",
    minWidth: "120px"
  },

  avatar: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "#22c55e",
    margin: "0 auto 10px"
  },

  name: {
    fontWeight: "bold",
    display: "block"
  },

  date: {
    fontSize: "11px",
    color: "#6b7280"
  },

  /* 🔥 líneas */
  lineVertical: {
    width: "2px",
    height: "20px",
    background: "#22c55e",
    margin: "0 auto"
  },

  lineHorizontal: {
    height: "2px",
    background: "#22c55e",
    marginBottom: "20px"
  },

  children: {
    display: "flex",
    justifyContent: "center",
    gap: "40px",
    marginTop: "10px"
  },

  childWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  }
};