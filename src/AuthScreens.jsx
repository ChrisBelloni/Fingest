import { useState } from "react";
import { supabase } from "./supabaseClient";

export function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await onSignIn(email, password);
    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente."
      );
    }
  };

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logoIcon}>F</div>
        <div style={styles.title}>FinGest</div>
        <div style={styles.subtitle}>Gestão Financeira Institucional</div>

        <label style={styles.label}>E-mail</label>
        <input
          style={styles.input}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu.email@organizacao.org"
          required
          autoFocus
        />

        <label style={styles.label}>Senha</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div style={styles.hint}>
          Não tem uma conta? Peça ao Administrador do sistema para enviar um convite.
        </div>
      </form>
    </div>
  );
}

export function SetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Não foi possível definir a senha. Tente novamente.");
    } else {
      onDone();
    }
  };

  return (
    <div style={styles.wrap}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logoIcon}>F</div>
        <div style={styles.title}>Bem-vindo(a) ao FinGest</div>
        <div style={styles.subtitle}>Defina sua senha de acesso para continuar</div>

        <label style={styles.label}>Nova senha</label>
        <input
          style={styles.input}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
          autoFocus
        />

        <label style={styles.label}>Confirmar senha</label>
        <input
          style={styles.input}
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repita a senha"
          required
        />

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Definir senha e entrar"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: "#F2F4F7", fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    background: "#fff", borderRadius: 16, padding: "40px 36px", width: 380,
    boxShadow: "0 8px 30px rgba(31,59,87,0.10)", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
  },
  logoIcon: {
    width: 48, height: 48, borderRadius: 12, background: "#1F3B57", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
    fontSize: 22, marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: 700, color: "#1F3B57" },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20, textAlign: "center" },
  label: { alignSelf: "flex-start", fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 12, marginBottom: 4 },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #D9DEE4",
    fontSize: 14, outline: "none", boxSizing: "border-box",
  },
  button: {
    width: "100%", marginTop: 20, padding: "11px 0", borderRadius: 8, border: "none",
    background: "#1F3B57", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
  error: {
    width: "100%", marginTop: 12, padding: "8px 12px", borderRadius: 8,
    background: "#FBE1E1", color: "#A32D2D", fontSize: 12.5,
  },
  hint: { marginTop: 16, fontSize: 12, color: "#9CA3AF", textAlign: "center" },
};
