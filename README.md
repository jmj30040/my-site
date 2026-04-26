# Overwatch Friends Community

친구들끼리 오버워치 프로필을 공유하고, 같이 게임할 일정을 만드는 간단한 React + Firebase MVP입니다.

## 폴더 구조

```text
my-site/
  index.html
  package.json
  .env.example
  src/
    main.jsx
    App.jsx
    firebase.js
    constants.js
    styles.css
    services/
      firestore.js
    components/
      ProfileForm.jsx
      ProfileList.jsx
      ScheduleForm.jsx
      ScheduleList.jsx
```

- `src/firebase.js`: Firebase 앱과 Firestore 연결 설정
- `src/services/firestore.js`: `users`, `schedules` 컬렉션 CRUD 코드
- `src/components/ProfileForm.jsx`: 친구 프로필 생성/수정 폼
- `src/components/ProfileList.jsx`: 프로필 목록, 수정, 삭제, 필터 결과 표시
- `src/components/ScheduleForm.jsx`: 게임 일정 생성/수정 폼
- `src/components/ScheduleList.jsx`: 일정 목록, 참여하기, 참여 취소, 수정, 삭제
- `src/App.jsx`: 화면 상태, 필터, Firestore 구독, 이벤트 연결

## Firebase 설정

1. Firebase 콘솔에서 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. 웹 앱을 추가한 뒤 Firebase 설정 값을 복사합니다.
4. `.env.example`을 `.env`로 복사하고 값을 채웁니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는:

```powershell
Copy-Item .env.example .env
```

예시:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Firestore 데이터 구조

`users` 컬렉션:

```js
{
  nickname: 'Hana',
  battleTag: 'Hana#1234',
  tier: '플래티넘',
  role: '지원',
  mainHeroes: ['아나', '키리코'],
  bio: '저녁에 자주 접속해요',
  availableTime: '평일 21:00 이후',
  createdAt: serverTimestamp()
}
```

`schedules` 컬렉션:

```js
{
  title: '경쟁전 5인큐',
  date: '2026-04-27',
  startTime: '21:00',
  endTime: '23:00',
  participants: ['Hana', 'Jun'],
  memo: '마이크 가능하면 좋아요',
  createdAt: serverTimestamp()
}
```

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 알려주는 로컬 주소로 접속하면 됩니다. 보통 `http://localhost:5173`입니다.

## GitHub Pages 배포

이 저장소는 `.github/workflows/deploy.yml`로 `main` 브랜치에 push할 때 `dist`를 빌드해서 GitHub Pages에 배포합니다.

GitHub 저장소에서 먼저 아래 설정을 해주세요.

1. `Settings` > `Pages` > `Build and deployment`를 `GitHub Actions`로 선택합니다.
2. `Settings` > `Secrets and variables` > `Actions` > `New repository secret`에 `.env`와 같은 Firebase 값을 추가합니다.

필요한 secret 이름:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

배포 주소는 보통 아래와 같습니다.

```text
https://jmj30040.github.io/my-site/
```

## Firestore 보안 규칙 예시

MVP 테스트용으로만 사용하세요. 실제 서비스에서는 로그인 기반 규칙으로 바꾸는 것이 좋습니다.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if true;
    }

    match /schedules/{scheduleId} {
      allow read, write: if true;
    }
  }
}
```
