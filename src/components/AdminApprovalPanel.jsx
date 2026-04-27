export function AdminApprovalPanel({ pendingUsers, onApprove }) {
  if (pendingUsers.length === 0) {
    return (
      <section className="admin-panel">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>가입 승인</h2>
        </div>
        <p className="empty-state">승인 대기 중인 사용자가 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="admin-panel">
      <div>
        <p className="eyebrow">Admin</p>
        <h2>가입 승인</h2>
      </div>
      <div className="approval-list">
        {pendingUsers.map((user) => (
          <div className="approval-item" key={user.id}>
            <div>
              <strong>{user.nickname || '닉네임 없음'}</strong>
              <p>{user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString('ko-KR') : '가입 시간 확인 중'}</p>
            </div>
            <button className="primary-button" type="button" onClick={() => onApprove(user)}>
              승인
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
