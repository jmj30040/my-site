import { useMemo, useState } from "react";
import Home from "./components/Home.jsx";
import NicknameModal from "./components/NicknameModal.jsx";
import AdminModal from "./components/AdminModal.jsx";
import TierBoard from "./components/TierBoard.jsx";
import ScheduleList from "./components/ScheduleList.jsx";

const NICKNAME_KEY = "overwatchSquadNickname";

function App() {
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICKNAME_KEY) || "");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(!nickname);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const tabs = useMemo(
    () => [
      { id: "home", label: "홈" },
      { id: "tiers", label: "티어" },
      { id: "schedules", label: "일정" }
    ],
    []
  );

  function handleSaveNickname(nextNickname) {
    const cleanNickname = nextNickname.trim();
    localStorage.setItem(NICKNAME_KEY, cleanNickname);
    setNickname(cleanNickname);
    setShowNicknameModal(false);
  }

  return (
    <div className="min-h-screen text-slate-100">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-ow-orange">
                Squad Sync
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Overwatch Squad Hub
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-100 transition hover:border-ow-cyan/50 hover:bg-white/10"
                type="button"
                onClick={() => setShowNicknameModal(true)}
              >
                {nickname ? `${nickname} 님` : "닉네임 설정"}
              </button>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                  isAdmin
                    ? "bg-ow-orange text-slate-950"
                    : "border border-ow-orange/40 bg-ow-orange/10 text-ow-orange hover:bg-ow-orange/20"
                }`}
                type="button"
                onClick={() => (isAdmin ? setIsAdmin(false) : setShowAdminModal(true))}
              >
                {isAdmin ? "관리자 모드 ON" : "관리자 모드"}
              </button>
            </div>
          </div>

          <nav className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-950/55 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                  activeTab === tab.id
                    ? "bg-ow-orange text-slate-950 shadow-glow"
                    : "text-slate-300 hover:bg-white/10"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "home" && (
          <Home nickname={nickname} isAdmin={isAdmin} setActiveTab={setActiveTab} />
        )}
        {activeTab === "tiers" && <TierBoard isAdmin={isAdmin} />}
        {activeTab === "schedules" && (
          <ScheduleList nickname={nickname} isAdmin={isAdmin} />
        )}
      </main>

      {showNicknameModal && (
        <NicknameModal currentNickname={nickname} onSave={handleSaveNickname} />
      )}

      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={() => {
            setIsAdmin(true);
            setShowAdminModal(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
