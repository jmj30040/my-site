function FirebaseNotice() {
  return (
    <section className="rounded-2xl border border-ow-orange/30 bg-ow-orange/10 p-5 text-slate-100 sm:p-6">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-ow-orange">
        Firebase Setup
      </p>
      <h2 className="mt-2 text-2xl font-black">Firebase 설정이 필요합니다</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        `.env.example`을 `.env`로 복사한 뒤 Firebase 콘솔의 웹 앱 설정값과
        `VITE_ADMIN_PASSWORD`를 입력하세요. 설정 후 `npm run dev`를 다시 실행하면
        Firestore 실시간 공유 기능이 켜집니다.
      </p>
    </section>
  );
}

export default FirebaseNotice;
