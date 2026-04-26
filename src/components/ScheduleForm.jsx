import { useState } from 'react';

const emptySchedule = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  participants: '',
  memo: '',
};

export function ScheduleForm({ initialSchedule, onSubmit }) {
  const normalizedSchedule = initialSchedule
    ? {
        title: initialSchedule.title ?? '',
        date: initialSchedule.date ?? '',
        startTime: initialSchedule.startTime ?? '',
        endTime: initialSchedule.endTime ?? '',
        participants: Array.isArray(initialSchedule.participants)
          ? initialSchedule.participants.join(', ')
          : initialSchedule.participants ?? '',
        memo: initialSchedule.memo ?? '',
      }
    : emptySchedule;
  const [form, setForm] = useState(normalizedSchedule);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      ...form,
      participants: form.participants
        .split(',')
        .map((participant) => participant.trim())
        .filter(Boolean),
    });
    if (!initialSchedule) {
      setForm(emptySchedule);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="wide">
        제목
        <input name="title" value={form.title} onChange={handleChange} placeholder="경쟁전 5인큐" required />
      </label>
      <label>
        날짜
        <input name="date" type="date" value={form.date} onChange={handleChange} required />
      </label>
      <label>
        시작 시간
        <input name="startTime" type="time" value={form.startTime} onChange={handleChange} required />
      </label>
      <label>
        예상 종료
        <input name="endTime" type="time" value={form.endTime} onChange={handleChange} />
      </label>
      <label className="wide">
        참여자
        <input
          name="participants"
          value={form.participants}
          onChange={handleChange}
          placeholder="닉네임을 쉼표로 구분"
        />
      </label>
      <label className="wide">
        메모
        <textarea name="memo" value={form.memo} onChange={handleChange} placeholder="마이크 가능, 빠대도 가능" />
      </label>
      <button className="primary-button wide" type="submit">
        {initialSchedule ? '일정 수정' : '일정 생성'}
      </button>
    </form>
  );
}
