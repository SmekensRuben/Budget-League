import { useNavigate } from "react-router-dom";
import { auth, signOut } from "../../firebaseConfig";

export default function StartPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/breakfast_pilot_logo_black_circle.png"
              alt="Budget League Logo"
              className="h-10 w-10"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                Budget League
              </p>
              <h1 className="text-2xl font-bold">Welkom</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <main className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/50 p-10 text-center shadow-xl shadow-slate-950/40">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">
            Clean start
          </p>
          <h2 className="mt-4 text-3xl font-bold">
            De Budget League webapp is leeg en klaar om op te bouwen.
          </h2>
          <p className="mt-4 text-slate-400">
            Alle functionaliteit is verwijderd, maar de styling en
            authenticatie blijven beschikbaar. Vanaf hier kun je nieuwe modules
            stap voor stap toevoegen.
          </p>
        </div>
      </main>
    </div>
  );
}
