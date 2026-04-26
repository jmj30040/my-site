import { useState } from "react";

function AdminModal({ onClose, onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (password === import.meta.env.VITE_ADMIN_PASSWORD) {
      onSuccess();
      return;
    }

    setError("관리자 비밀번호가 맞지 않습니다.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <form
        className="w-full max-w-md rounded-2xl border border-ow-orange/30 bg-ow-panel p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ow-orange">
          Admin
        </p>
        <h2 className="mt-2 text-2xl font-black">관리자 모드</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          친구끼리 쓰는 간단한 비밀번호 방식입니다. 정적 웹앱 특성상 강한 보안 수단은
          아닙니다.
        </p>

        <label className="mt-5 block text-sm font-bold text-slate-300" htmlFor="adminPassword">
          비밀번호
        </label>
        <input
          id="adminPassword"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-ow-orange/30 transition focus:border-ow-orange focus:ring-4"
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
        />
        {error && <p className="mt-2 text-sm font-bold text-red-300">{error}</p>}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-black text-slate-200 transition hover:bg-white/10"
            type="button"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="rounded-xl bg-ow-orange px-4 py-3 font-black text-slate-950 transition hover:brightness-110"
            type="submit"
          >
            입장
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminModal;
