// src/App.jsx
import { useState, useEffect, useRef } from "react";
import {
  register, login, logout, onAuthChange,
  updateBio, subscribeUsers,
  createPost, subscribePosts, toggleLike,
  addComment, subscribeComments,
} from "./firebase";

// ─── UTILS ────────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - (ts?.toMillis ? ts.toMillis() : ts);
  if (diff < 60000) return "только что";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
  return `${Math.floor(diff / 86400000)} дн назад`;
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "#1E1E2A", border: "1px solid #2A2A38",
  color: "#fff", fontSize: 14, marginBottom: 12,
  outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: user?.color || "#7C6AF7",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 600, fontSize: size > 50 ? 20 : 13,
      flexShrink: 0, fontFamily: "'Unbounded', sans-serif",
      letterSpacing: "-0.02em", userSelect: "none",
    }}>
      {user?.avatar || "?"}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!email || !password) return setError("Заполните все поля");
    if (mode === "register" && !name.trim()) return setError("Введите имя");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(name.trim(), email, password);
      } else {
        await login(email, password);
      }
      // onAuthChange в App подхватит нового пользователя автоматически
    } catch (e) {
      const msg = {
        "auth/email-already-in-use": "Email уже используется",
        "auth/invalid-credential": "Неверный email или пароль",
        "auth/weak-password": "Пароль должен быть не менее 6 символов",
        "auth/user-not-found": "Пользователь не найден",
        "auth/wrong-password": "Неверный пароль",
      }[e.code] || e.message;
      setError(msg);
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0D0D12", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        width: 380, padding: "40px 36px", borderRadius: 20,
        background: "#16161E", border: "1px solid #2A2A38",
      }}>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 22, color: "#fff", marginBottom: 6, letterSpacing: "-0.03em" }}>
          {mode === "login" ? "Войти" : "Создать аккаунт"}
        </div>
        <div style={{ fontSize: 13, color: "#666", marginBottom: 28 }}>
          {mode === "login" ? "Рады снова видеть тебя" : "Присоединяйся к команде"}
        </div>

        {mode === "register" && (
          <input placeholder="Имя" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        )}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />
        <input placeholder="Пароль" type="password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inputStyle} />

        {error && <div style={{ fontSize: 12, color: "#E8735A", marginBottom: 12 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "13px", borderRadius: 12,
          background: loading ? "#2A2A38" : "linear-gradient(135deg, #7C6AF7, #5B4CF0)",
          color: "#fff", fontWeight: 600, fontSize: 14, border: "none",
          cursor: loading ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif",
          transition: "opacity 0.2s",
        }}>
          {loading ? "Загрузка…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#555" }}>
          {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "#7C6AF7", cursor: "pointer", fontWeight: 500 }}>
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── POST CARD ────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, users }) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [likeLoading, setLikeLoading] = useState(false);

  const author = users[post.authorId];
  const liked = (post.likes || []).includes(currentUser.id);

  // Подписка на комментарии только когда открыто
  useEffect(() => {
    if (!expanded) return;
    const unsub = subscribeComments(post.id, setComments);
    return () => unsub();
  }, [expanded, post.id]);

  async function handleLike() {
    if (likeLoading) return;
    setLikeLoading(true);
    await toggleLike(post.id, currentUser.id);
    setLikeLoading(false);
  }

  async function submitComment() {
    if (!newComment.trim()) return;
    const text = newComment.trim();
    setNewComment("");
    await addComment(post.id, currentUser.id, text);
  }

  return (
    <div style={{
      background: "#16161E", border: "1px solid #1E1E2A",
      borderRadius: 16, padding: "20px 22px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
        <Avatar user={author} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#E0E0EE" }}>{author?.name || "…"}</div>
          <div style={{ fontSize: 12, color: "#44445A" }}>{timeAgo(post.createdAt)}</div>
        </div>
      </div>

      <div style={{ fontSize: 15, color: "#C8C8DC", lineHeight: 1.65, marginBottom: 16 }}>
        {post.text}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={handleLike} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: liked ? "rgba(124,106,247,0.15)" : "transparent",
          border: `1px solid ${liked ? "#7C6AF7" : "#2A2A38"}`,
          borderRadius: 8, padding: "6px 12px",
          color: liked ? "#7C6AF7" : "#555", cursor: "pointer",
          fontSize: 13, fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
        }}>
          ♥ {(post.likes || []).length}
        </button>

        <button onClick={() => setExpanded(v => !v)} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: expanded ? "rgba(255,255,255,0.05)" : "transparent",
          border: "1px solid #2A2A38", borderRadius: 8, padding: "6px 12px",
          color: "#555", cursor: "pointer", fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          💬 {expanded ? "Скрыть" : "Комментарии"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 16, borderTop: "1px solid #1E1E2A", paddingTop: 16 }}>
          {comments.length === 0 && (
            <div style={{ fontSize: 13, color: "#333", marginBottom: 12, fontStyle: "italic" }}>
              Пока нет комментариев. Будь первым!
            </div>
          )}
          {comments.map(c => {
            const ca = users[c.authorId];
            return (
              <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <Avatar user={ca} size={28} />
                <div style={{ background: "#1A1A24", borderRadius: 10, padding: "8px 12px", flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#9090AA", marginBottom: 3 }}>
                    {ca?.name || "…"}
                    <span style={{ fontWeight: 400, marginLeft: 8, color: "#333", fontSize: 11 }}>
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "#C0C0D8" }}>{c.text}</div>
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Avatar user={currentUser} size={28} />
            <input
              placeholder="Написать комментарий…"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitComment()}
              style={{ ...inputStyle, marginBottom: 0, flex: 1, padding: "8px 12px", fontSize: 13 }}
            />
            <button onClick={submitComment} style={{
              background: "#7C6AF7", border: "none", borderRadius: 10,
              color: "#fff", padding: "8px 16px", cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
            }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE MODAL ────────────────────────────────────────────────────────────
function ProfileModal({ user, posts, onClose }) {
  const userPosts = posts.filter(p => p.authorId === user.id);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#16161E", border: "1px solid #2A2A38",
        borderRadius: 20, padding: "32px", width: 360,
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <button onClick={onClose} style={{
          float: "right", background: "none", border: "none",
          color: "#555", fontSize: 22, cursor: "pointer", lineHeight: 1,
        }}>×</button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Avatar user={user} size={72} />
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, color: "#fff", textAlign: "center", letterSpacing: "-0.02em" }}>
            {user.name}
          </div>
          <div style={{ fontSize: 13, color: "#555", textAlign: "center" }}>{user.bio || "Нет описания"}</div>
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#7C6AF7" }}>{userPosts.length}</div>
              <div style={{ fontSize: 11, color: "#555" }}>постов</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#7C6AF7" }}>
                {userPosts.reduce((s, p) => s + (p.likes?.length || 0), 0)}
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>лайков</div>
            </div>
          </div>
        </div>

        {userPosts.map(p => (
          <div key={p.id} style={{
            background: "#1A1A24", borderRadius: 12, padding: "12px 14px", marginBottom: 8,
            fontSize: 13, color: "#B0B0C8", lineHeight: 1.6,
          }}>
            {p.text.slice(0, 140)}{p.text.length > 140 ? "…" : ""}
            <div style={{ fontSize: 11, color: "#333", marginTop: 4 }}>{timeAgo(p.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = загрузка
  const [users, setUsers] = useState({});
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [viewProfile, setViewProfile] = useState(null);
  const [editBio, setEditBio] = useState(false);
  const [bioText, setBioText] = useState("");

  // Следим за авторизацией
  useEffect(() => {
    const unsub = onAuthChange(user => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Подписки на данные (только когда авторизован)
  useEffect(() => {
    if (!currentUser) return;
    const unsubUsers = subscribeUsers(setUsers);
    const unsubPosts = subscribePosts(setPosts);
    return () => { unsubUsers(); unsubPosts(); };
  }, [!!currentUser]);

  // Экран загрузки
  if (currentUser === undefined) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0D0D12",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Unbounded', sans-serif", color: "#7C6AF7", fontSize: 16,
        letterSpacing: "-0.03em",
      }}>
        squad
      </div>
    );
  }

  if (!currentUser) return <AuthScreen />;

  const allUsers = { ...users, [currentUser.id]: currentUser };

  async function handlePost() {
    if (!newPostText.trim() || posting) return;
    setPosting(true);
    await createPost(currentUser.id, newPostText.trim());
    setNewPostText("");
    setPosting(false);
  }

  async function saveBio() {
    await updateBio(currentUser.id, bioText);
    setCurrentUser(u => ({ ...u, bio: bioText }));
    setEditBio(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0D0D12", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(13,13,18,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1A1A24",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px",
      }}>
        <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 16, letterSpacing: "-0.03em", color: "#7C6AF7" }}>
          squad
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["feed", "Лента"], ["members", "Участники"], ["profile", "Профиль"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              background: activeTab === tab ? "#7C6AF7" : "transparent",
              color: activeTab === tab ? "#fff" : "#555",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              cursor: "pointer", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>
        <button onClick={logout} style={{
          background: "none", border: "1px solid #2A2A38", borderRadius: 8,
          color: "#555", padding: "6px 12px", cursor: "pointer",
          fontSize: 12, fontFamily: "'DM Sans', sans-serif",
        }}>Выйти</button>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── ЛЕНТА ── */}
        {activeTab === "feed" && (
          <>
            <div style={{
              background: "#16161E", border: "1px solid #1E1E2A",
              borderRadius: 16, padding: "18px 20px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", gap: 12 }}>
                <Avatar user={currentUser} />
                <textarea
                  placeholder="Что нового? Поделись с командой…"
                  value={newPostText}
                  onChange={e => setNewPostText(e.target.value)}
                  rows={3}
                  style={{
                    flex: 1, background: "#1A1A24", border: "1px solid #2A2A38",
                    borderRadius: 10, padding: "10px 14px",
                    color: "#C8C8DC", fontSize: 14, resize: "none",
                    fontFamily: "'DM Sans', sans-serif", outline: "none", lineHeight: 1.6,
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button onClick={handlePost} disabled={!newPostText.trim() || posting} style={{
                  background: newPostText.trim() && !posting
                    ? "linear-gradient(135deg, #7C6AF7, #5B4CF0)" : "#1E1E2A",
                  color: newPostText.trim() && !posting ? "#fff" : "#333",
                  border: "none", borderRadius: 10, padding: "9px 20px",
                  fontSize: 13, fontWeight: 600,
                  cursor: newPostText.trim() && !posting ? "pointer" : "default",
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                }}>
                  {posting ? "Публикую…" : "Опубликовать"}
                </button>
              </div>
            </div>

            {posts.length === 0 && (
              <div style={{ textAlign: "center", color: "#333", fontSize: 14, marginTop: 48 }}>
                Пока нет постов. Будь первым!
              </div>
            )}
            {posts.map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser} users={allUsers} />
            ))}
          </>
        )}

        {/* ── УЧАСТНИКИ ── */}
        {activeTab === "members" && (
          <div style={{ display: "grid", gap: 10 }}>
            {Object.values(allUsers).map(u => (
              <div key={u.id} onClick={() => setViewProfile(u)} style={{
                background: "#16161E", border: "1px solid #1E1E2A",
                borderRadius: 14, padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#7C6AF7"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1E1E2A"}
              >
                <Avatar user={u} size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#E0E0EE" }}>
                    {u.name}
                    {u.id === currentUser.id && (
                      <span style={{ fontSize: 11, color: "#7C6AF7", marginLeft: 8, fontWeight: 400 }}>вы</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#44445A", marginTop: 2 }}>{u.bio || "Нет описания"}</div>
                </div>
                <div style={{ fontSize: 12, color: "#333" }}>
                  {posts.filter(p => p.authorId === u.id).length} постов
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ПРОФИЛЬ ── */}
        {activeTab === "profile" && (
          <div>
            <div style={{
              background: "#16161E", border: "1px solid #1E1E2A",
              borderRadius: 16, padding: "28px 24px", marginBottom: 16, textAlign: "center",
            }}>
              <Avatar user={currentUser} size={72} />
              <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 18, color: "#fff", marginTop: 14, letterSpacing: "-0.02em" }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: 13, color: "#44445A", marginTop: 4 }}>{currentUser.email || ""}</div>

              {editBio ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    value={bioText}
                    onChange={e => setBioText(e.target.value)}
                    placeholder="Расскажи о себе…"
                    onKeyDown={e => e.key === "Enter" && saveBio()}
                    style={{ ...inputStyle, textAlign: "center", marginBottom: 8 }}
                  />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button onClick={saveBio} style={{
                      background: "#7C6AF7", border: "none", borderRadius: 8,
                      color: "#fff", padding: "7px 18px", cursor: "pointer",
                      fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    }}>Сохранить</button>
                    <button onClick={() => setEditBio(false)} style={{
                      background: "none", border: "1px solid #2A2A38", borderRadius: 8,
                      color: "#555", padding: "7px 14px", cursor: "pointer",
                      fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    }}>Отмена</button>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 14, color: "#555", marginBottom: 10 }}>
                    {currentUser.bio || "Нет описания"}
                  </div>
                  <button onClick={() => { setBioText(currentUser.bio || ""); setEditBio(true); }} style={{
                    background: "none", border: "1px solid #2A2A38", borderRadius: 8,
                    color: "#666", padding: "6px 14px", cursor: "pointer",
                    fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  }}>Редактировать bio</button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#7C6AF7" }}>
                    {posts.filter(p => p.authorId === currentUser.id).length}
                  </div>
                  <div style={{ fontSize: 12, color: "#444" }}>постов</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#7C6AF7" }}>
                    {posts.filter(p => p.authorId === currentUser.id).reduce((s, p) => s + (p.likes?.length || 0), 0)}
                  </div>
                  <div style={{ fontSize: 12, color: "#444" }}>лайков</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 500, color: "#44445A", marginBottom: 10, letterSpacing: "0.05em" }}>
              МОИ ПОСТЫ
            </div>
            {posts.filter(p => p.authorId === currentUser.id).map(post => (
              <PostCard key={post.id} post={post} currentUser={currentUser} users={allUsers} />
            ))}
          </div>
        )}
      </div>

      {viewProfile && (
        <ProfileModal user={viewProfile} posts={posts} onClose={() => setViewProfile(null)} />
      )}
    </div>
  );
}
