const statusLabels = {
  approved: '승인됨',
  deleted: '삭제됨',
  pending: '승인 대기',
  rejected: '반려됨',
};

function formatDate(value) {
  return value?.toDate ? value.toDate().toLocaleString('ko-KR') : '기록 없음';
}

export function AdminUserPanel({
  currentUser,
  users,
  onApprove,
  onDelete,
  onRequestPasswordReset,
}) {
  return (
    <section className="admin-panel">
      <div>
        <p className="eyebrow">Admin</p>
        <h2>회원 관리</h2>
      </div>
      <p className="admin-note">
        임시 PIN은 발급 직후 화면에 한 번 표시됩니다. 사용자 삭제는 계정과 해당 사용자가 만든 데이터를 함께 삭제합니다.
      </p>
      {users.length === 0 ? (
        <p className="empty-state">등록된 사용자가 없습니다.</p>
      ) : (
        <div className="user-admin-list">
          {users.map((user) => {
            const status = user.status ?? 'approved';
            const role = user.role === 'admin' ? 'admin' : 'member';
            const isCurrentAdmin = currentUser?.id === user.id;

            return (
              <article className="user-admin-item" key={user.id}>
                <div className="user-admin-main">
                  <strong>{user.nickname || '닉네임 없음'}</strong>
                  <span>{statusLabels[status] ?? status}</span>
                  {role === 'admin' && <span>관리자</span>}
                  {user.temporaryPinIssuedAt && <span>임시 PIN 발급됨</span>}
                </div>
                <p className="meta">가입: {formatDate(user.createdAt)}</p>
                <div className="user-admin-actions">
                  <button type="button" onClick={() => onApprove(user)} disabled={status === 'approved'}>
                    승인
                  </button>
                  <button type="button" onClick={() => onRequestPasswordReset(user)}>
                    임시 PIN 발급
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => onDelete(user)}
                    disabled={isCurrentAdmin}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
