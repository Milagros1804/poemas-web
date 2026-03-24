import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric"
  });
}

export default function App() {
  const [view, setView] = useState("galeria");
  const [composeTab, setComposeTab] = useState("generar");
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [poems, setPoems] = useState([]);
  const [feeling, setFeeling] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualBody, setManualBody] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [comments, setComments] = useState({});
  const [toast, setToast] = useState("");

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load poems
  useEffect(() => { fetchPoems(); }, []);

  async function fetchPoems() {
    const { data } = await supabase
      .from("poems")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPoems(data);
  }

  async function fetchComments(poemId) {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("poem_id", poemId)
      .order("created_at", { ascending: true });
    if (data) setComments(prev => ({ ...prev, [poemId]: data }));
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Auth
  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    if (error) showToast("Error al iniciar sesión");
    else { setShowLogin(false); showToast("Bienvenida ✦"); }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    showToast("Sesión cerrada");
  }

  // Generate poem with AI
  async function generatePoem() {
    if (!feeling.trim()) return;
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Eres una poeta sensible y profunda. Transforma los sentimientos del usuario en un poema en español, lírico, íntimo y honesto.
Formato exacto:
**Título del poema**

Primera estrofa...

Segunda estrofa...

Solo el poema, nada más. Sin clichés. Que duela y florezca.`,
          messages: [{ role: "user", content: feeling }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const lines = text.trim().split("\n");
      let title = "Sin título", body = text.trim();
      if (lines[0].startsWith("**") && lines[0].endsWith("**")) {
        title = lines[0].replace(/\*\*/g, "").trim();
        body = lines.slice(1).join("\n").trim();
      }
      setPreview({ title, body });
    } catch {
      showToast("Error al generar el poema. Intenta de nuevo.");
    }
    setLoading(false);
  }

  // Publish poem
  async function publishPoem(title, body) {
    if (!user) { showToast("Debes iniciar sesión para publicar"); return; }
    const { error } = await supabase.from("poems").insert([{ title, body, user_id: user.id }]);
    if (error) { showToast("Error al publicar"); return; }
    showToast("Poema publicado ✦");
    setPreview(null); setFeeling(""); setManualTitle(""); setManualBody("");
    fetchPoems();
    setView("galeria");
  }

  // Toggle comments
  async function toggleComments(poemId) {
    const isOpen = openComments[poemId];
    setOpenComments(prev => ({ ...prev, [poemId]: !isOpen }));
    if (!isOpen && !comments[poemId]) await fetchComments(poemId);
  }

  // Add comment
  async function addComment(poemId) {
    const text = (commentInputs[poemId] || "").trim();
    if (!text) return;
    const { error } = await supabase.from("comments").insert([{ poem_id: poemId, content: text }]);
    if (error) { showToast("Error al comentar"); return; }
    setCommentInputs(prev => ({ ...prev, [poemId]: "" }));
    await fetchComments(poemId);
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header>
        <h1>Donde duele, florece</h1>
        <div className="header-rule"><span>🕯</span></div>
        <p className="subtitle">Poemas nacidos del sentir más hondo</p>
      </header>

      {/* AUTH */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        {user ? (
          <button className="auth-btn" onClick={handleLogout}>Cerrar sesión</button>
        ) : (
          <button className="auth-btn" onClick={() => setShowLogin(true)}>Soy la autora</button>
        )}
      </div>

      {/* NAV */}
      <nav>
        <button className={view === "galeria" ? "active" : ""} onClick={() => setView("galeria")}>
          Galería
        </button>
        {user && (
          <button className={view === "escribir" ? "active" : ""} onClick={() => setView("escribir")}>
            Escribir
          </button>
        )}
      </nav>

      <main>
        {/* ── GALERÍA ── */}
        {view === "galeria" && (
          <div className="gallery-section">
            {poems.length === 0 && (
              <div className="gallery-empty">
                Aún no hay palabras aquí.<br />
                <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>El primer poema está esperando nacer.</span>
              </div>
            )}
            {poems.map((poem, i) => (
              <div key={poem.id} className="poem-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="poem-card-inner">
                  <div className="poem-card-header">
                    <div className="poem-card-title">{poem.title}</div>
                    <div className="poem-card-meta">
                      <div className="poem-card-author">✦ la autora</div>
                      <div className="poem-card-date">{formatDate(poem.created_at)}</div>
                    </div>
                  </div>
                  <div className="poem-card-body">{poem.body}</div>

                  {/* Comments toggle */}
                  <button className="comments-toggle" onClick={() => toggleComments(poem.id)}>
                    {openComments[poem.id]
                      ? "— ocultar comentarios"
                      : `✦ ${comments[poem.id]?.length ? comments[poem.id].length + " comentarios" : "dejar un comentario"}`
                    }
                  </button>

                  {openComments[poem.id] && (
                    <div className="comments-section">
                      <p className="comments-title">Palabras de los lectores</p>

                      {(!comments[poem.id] || comments[poem.id].length === 0) && (
                        <p style={{ color: "var(--gold-dim)", fontStyle: "italic", fontSize: "1rem", marginBottom: 16 }}>
                          Sé el primero en dejar una palabra aquí.
                        </p>
                      )}

                      {(comments[poem.id] || []).map((c, j) => (
                        <div key={j} className="comment-item">
                          <div className="comment-text">"{c.content}"</div>
                          <div className="comment-date">{formatDate(c.created_at)}</div>
                        </div>
                      ))}

                      <div className="comment-form">
                        <input
                          className="comment-input"
                          placeholder="Escribe algo que sientas…"
                          value={commentInputs[poem.id] || ""}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [poem.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && addComment(poem.id)}
                        />
                        <button className="comment-submit" onClick={() => addComment(poem.id)}>↵</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ESCRIBIR ── */}
        {view === "escribir" && user && (
          <div className="compose-section">
            <div className="compose-tabs">
              <button
                className={`compose-tab ${composeTab === "generar" ? "active" : ""}`}
                onClick={() => setComposeTab("generar")}
              >
                Generar poema
              </button>
              <button
                className={`compose-tab ${composeTab === "subir" ? "active" : ""}`}
                onClick={() => setComposeTab("subir")}
              >
                Subir poema
              </button>
            </div>

            {composeTab === "generar" && (
              <>
                <p className="section-label">Cuéntame cómo te sientes</p>
                <textarea
                  placeholder="Escribe lo que llevas dentro… sin filtros, sin miedo."
                  value={feeling}
                  onChange={e => setFeeling(e.target.value)}
                  rows={7}
                />
                <div className="btn-row">
                  <button className="btn-gold" onClick={generatePoem} disabled={loading || !feeling.trim()}>
                    {loading ? "Transformando…" : "Convertir en poema"}
                  </button>
                </div>

                {loading && (
                  <div className="loading-row">
                    <div className="spinner" />
                    <span>Tejiendo las palabras…</span>
                  </div>
                )}

                {preview && (
                  <div className="poem-preview">
                    <div className="poem-title-preview">{preview.title}</div>
                    <div className="poem-body-preview">{preview.body}</div>
                    <div className="btn-row" style={{ marginTop: 36 }}>
                      <button className="btn-gold" onClick={() => publishPoem(preview.title, preview.body)}>
                        Publicar
                      </button>
                      <button className="btn-ghost" onClick={() => setPreview(null)}>Descartar</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {composeTab === "subir" && (
              <>
                <p className="section-label">Pega un poema existente</p>
                <div className="field-group">
                  <input
                    type="text"
                    placeholder="Título del poema…"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    style={{ fontStyle: "italic" }}
                  />
                </div>
                <div className="field-group">
                  <textarea
                    placeholder="El poema…"
                    value={manualBody}
                    onChange={e => setManualBody(e.target.value)}
                    rows={10}
                  />
                </div>
                <div className="btn-row">
                  <button
                    className="btn-gold"
                    onClick={() => publishPoem(manualTitle.trim(), manualBody.trim())}
                    disabled={!manualTitle.trim() || !manualBody.trim()}
                  >
                    Publicar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <div className="footer-ornament">✦  ✦  ✦</div>

      {/* ── LOGIN MODAL ── */}
      {showLogin && (
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowLogin(false)}>✕</button>
            <h2>La autora</h2>
            <div className="field-group">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="field-group">
              <input
                type="password"
                placeholder="Contraseña"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="btn-row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn-gold" onClick={handleLogin}>Entrar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
