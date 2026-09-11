import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ blad?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0b0d12" strokeWidth="2.4" strokeLinecap="round">
            <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
            <path d="M12 14v4M8 20h8" />
          </svg>
        </span>
        <h1>Panel organizatora</h1>
        <p className="hint" style={{ margin: "6px 0 0", textAlign: "center" }}>
          Wpisz hasło, żeby tworzyć turnieje i wpisywać wyniki.
        </p>
        {params.blad && (
          <p className="error" style={{ margin: "12px 0 0", fontSize: 13 }}>
            Nieprawidłowe hasło — spróbuj ponownie.
          </p>
        )}
        <form action={loginAction} suppressHydrationWarning>
          <input type="password" name="password" autoFocus required placeholder="••••••••" aria-label="Hasło" />
          <button type="submit">Zaloguj</button>
        </form>
      </div>
    </div>
  );
}
