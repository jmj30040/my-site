import { useState } from 'react';

const emptyAuthForm = {
  nickname: '',
  pin: '',
};

export function AuthPanel({ currentUser, isAuthLoading, onLogin, onLogout, onSignUp }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyAuthForm);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'pin' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setForm((currentForm) => ({ ...currentForm, [name]: nextValue }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isSuccess = mode === 'login' ? await onLogin(form) : await onSignUp(form);

    if (isSuccess) {
      setForm(emptyAuthForm);
    }
  };

  if (currentUser) {
    return (
      <div className="auth-card">
        <p className="eyebrow">Signed In</p>
        <h2>{currentUser.nickname}님 로그인 중</h2>
        <button className="ghost-button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <section className="auth-card">
      <div className="auth-tabs">
        <button className={mode === 'login' ? 'active-tab' : ''} onClick={() => setMode('login')} type="button">
          로그인
        </button>
        <button className={mode === 'signup' ? 'active-tab' : ''} onClick={() => setMode('signup')} type="button">
          회원가입
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          닉네임
          <input name="nickname" value={form.nickname} onChange={handleChange} required placeholder="예: 민진" />
        </label>
        <label>
          6자리 PIN
          <input
            inputMode="numeric"
            name="pin"
            pattern="\d{6}"
            value={form.pin}
            onChange={handleChange}
            placeholder="123456"
            required
            type="password"
          />
        </label>
        <button className="primary-button" disabled={isAuthLoading} type="submit">
          {isAuthLoading ? '확인 중' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
    </section>
  );
}
