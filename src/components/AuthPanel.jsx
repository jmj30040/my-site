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
    const statusMessages = {
      deleted: '삭제 처리됨',
      pending: '승인 대기 중',
      rejected: '가입 반려됨',
    };
    const statusMessage = statusMessages[currentUser.status] ?? '로그인 중';
    const needsApproval = currentUser.status === 'pending' || currentUser.status === 'rejected' || currentUser.status === 'deleted';

    return (
      <div className="auth-card">
        <p className="eyebrow">{needsApproval ? 'Account Status' : 'Signed In'}</p>
        <h2>{currentUser.nickname}님 {statusMessage}</h2>
        {currentUser.isAdmin && <span className="admin-badge">관리자</span>}
        {currentUser.temporaryPinIssuedAt && <p className="auth-help">관리자가 발급한 임시 PIN으로 로그인할 수 있는 계정입니다.</p>}
        {needsApproval && <p className="auth-help">관리자가 승인한 계정만 서비스를 이용할 수 있습니다.</p>}
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
          {isAuthLoading ? '확인 중' : mode === 'login' ? '로그인' : '가입 신청'}
        </button>
      </form>
    </section>
  );
}
