export function ScheduleList({ currentNickname, schedules, onEdit, onDelete, onJoin, onLeave }) {
  if (schedules.length === 0) {
    return <p className="empty-state">공유된 게임 일정이 아직 없습니다.</p>;
  }

  return (
    <div className="card-list">
      {schedules.map((schedule) => {
        const participants = schedule.participants ?? [];
        const isJoined = currentNickname && participants.includes(currentNickname);

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
            <p className="meta">참여자: {participants.length > 0 ? participants.join(', ') : '아직 없음'}</p>
            <div className="actions">
              {isJoined ? (
                <button onClick={() => onLeave(schedule)}>참여 취소</button>
              ) : (
                <button className="primary-button" onClick={() => onJoin(schedule)}>
                  참여하기
                </button>
              )}
              <button onClick={() => onEdit(schedule)}>수정</button>
              <button className="danger-button" onClick={() => onDelete(schedule.id)}>
                삭제
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
