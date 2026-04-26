import { useState } from "react";

function NicknameModal({ currentNickname, onSave }) {
  const [value, setValue] = useState(currentNickname || "");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!value.trim()) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    onSave(value);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4">
      <form
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ow-panel p-6 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ow-cyan">
          Nickname
        </p>
        <h2 className="mt-2 text-2xl font-black">스쿼드 닉네임 설정</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          로그인 없이 닉네임으로 참가자와 작성자를 구분합니다. 이 값은 현재 브라우저에
          저장됩니다.
        </p>

        <label className="mt-5 block text-sm font-bold text-slate-300" htmlFor="nickname">
          닉네임
        </label>
        <input
          id="nickname"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-slate-100 outline-none ring-ow-orange/30 transition placeholder:text-slate-600 focus:border-ow-orange focus:ring-4"
          maxLength={18}
          placeholder="예: 힐러장인"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError("");
          }}
        />
        {error && <p className="mt-2 text-sm font-bold text-red-300">{error}</p>}

        <button
          className="mt-5 w-full rounded-xl bg-ow-orange px-4 py-3 font-black text-slate-950 transition hover:brightness-110"
          type="submit"
        >
          저장하고 시작
        </button>
      </form>
    </div>
  );
}

export default NicknameModal;
