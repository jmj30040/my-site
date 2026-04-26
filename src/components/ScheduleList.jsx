export function ScheduleList({ currentUser, schedules, onEdit, onDelete, onJoin, onLeave }) {
  if (schedules.length === 0) {
    return <p className="empty-state">공유된 게임 일정이 아직 없습니다.</p>;
  }

  return (
    <div className="card-list">
      {schedules.map((schedule) => {
        const participants = schedule.participants ?? [];
        const participantIds = schedule.participantIds ?? [];
        const canManage = currentUser?.id === schedule.ownerId;
        const isJoined = Boolean(
          currentUser && (participantIds.includes(currentUser.id) || participants.includes(currentUser.nickname)),
        );

        return (
          <article className="schedule-card" key={schedule.id}>
            <div className="card-topline">
              <div>
                <h3>{schedule.title}</h3>
                <p>
                  {schedule.date} {schedule.startTime}
                  {schedule.endTime ? ` - ${schedule.endTime}` : ''}
                </p>
              </div>
              <span className="count-badge">{participants.length}명</span>
            </div>
            <p className="bio">{schedule.memo || '메모가 없습니다.'}</p>
            <p className="meta">작성자: {schedule.ownerNickname || '알 수 없음'}</p>
            <p className="meta">참여자: {participants.length > 0 ? participants.join(', ') : '아직 없음'}</p>
            <div className="actions">
              {currentUser &&
                (isJoined ? (
                  <button onClick={() => onLeave(schedule)}>참여 취소</button>
                ) : (
                  <button className="primary-button" onClick={() => onJoin(schedule)}>
                    참여하기
                  </button>
                ))}
              {canManage && (
                <>
                  <button onClick={() => onEdit(schedule)}>수정</button>
                  <button className="danger-button" onClick={() => onDelete(schedule)}>
                    삭제
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
