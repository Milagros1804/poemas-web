import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import "./styles.css";

export default function App() {
  const [poems, setPoems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    getPoems();
    checkUser();
  }, []);

  async function checkUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  }

  async function login() {
    const email = prompt("Tu correo");
    const password = prompt("Tu contraseña");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión");
    } else {
      setUser(data.user);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function getPoems() {
    const { data } = await supabase
      .from("poems")
      .select("*")
      .order("created_at", { ascending: false });

    setPoems(data || []);
  }

  async function addPoem() {
    if (!title || !body) return;

    await supabase.from("poems").insert([{ title, body }]);

    setTitle("");
    setBody("");
    getPoems();
  }

  return (
    <div className="app">
      <h1>Donde duele, florece</h1>

      {!user && (
        <button onClick={login}>Soy la autora</button>
      )}

      {user && (
        <>
          <button onClick={logout}>Cerrar sesión</button>

          <div className="form">
            <input
              placeholder="Título del poema..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              placeholder="Escribe lo que sientes..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />

            <button onClick={addPoem}>Publicar</button>
          </div>
        </>
      )}

      <div className="poems">
        {poems.map((p) => (
          <div key={p.id} className="card">
            <h2>{p.title}</h2>
            <p>{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}