# Overwatch Friends Community

친구들끼리 오버워치 프로필을 공유하고, 같이 게임할 일정을 만드는 React + Firebase Firestore MVP입니다.

## 기술 스택

- Frontend: React, Vite, CSS
- Database: Firebase Cloud Firestore
- Deploy: GitHub Pages, GitHub Actions
- 인증: 닉네임 + 4자리 PIN 기반 MVP용 간단 로그인

## 폴더 구조

```text
my-site/
  index.html
  package.json
  vite.config.js
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
      AuthPanel.jsx
      ProfileForm.jsx
      ProfileList.jsx
      ScheduleForm.jsx
      ScheduleList.jsx
  .github/
    workflows/
      deploy.yml
```

## 로그인 방식

이 앱은 친구들끼리 쓰는 MVP라서 이메일/비밀번호 대신 닉네임 + 4자리 PIN으로 로그인합니다.

- 회원가입: 닉네임과 4자리 PIN 입력
- 닉네임 중복 가입 방지
- PIN 원문은 저장하지 않고 Web Crypto API의 SHA-256 해시로 저장
- 로그인 성공 시 `localStorage`에 `{ id, nickname }` 세션 저장
- 새로고침 후에도 로그인 유지
- 로그아웃 시 로컬 세션 삭제

주의: 이 방식은 Firebase Authentication이 아닙니다. 실제 서비스에서는 Firebase Authentication 또는 별도 서버 인증을 사용해야 합니다.

## Firestore 컬렉션 구조

`users` 컬렉션은 로그인 계정용입니다.

```js
{
  nickname: '민진',
  pinHash: 'sha256-hash',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`profiles` 컬렉션은 친구 프로필용입니다.

```js
{
  ownerId: 'users 문서 id',
  ownerNickname: '민진',
  battleTag: 'Player#1234',
  tier: '골드',
  role: '공격',
  mainHeroes: ['트레이서', '아나'],
  bio: '즐겜도 빡겜도 좋아요',
  availableTime: '평일 21:00 이후',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`schedules` 컬렉션은 게임 일정용입니다.

```js
{
  title: '경쟁전 하실 분',
  date: '2026-04-27',
  startTime: '21:00',
  endTime: '23:00',
  memo: '마이크 가능',
  participants: ['민진'],
  ownerId: 'users 문서 id',
  ownerNickname: '민진',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## 권한 동작

- 로그인하지 않아도 프로필 목록과 일정 목록은 볼 수 있습니다.
- 로그인해야 프로필 생성/수정/삭제가 가능합니다.
- 로그인해야 일정 생성/수정/삭제가 가능합니다.
- 본인이 만든 프로필과 일정만 수정/삭제 버튼이 보입니다.
- 참여하기/참여 취소는 로그인한 사용자만 가능합니다.
- 일정 참여자는 `participants` 배열에 닉네임으로 저장됩니다.

## Firebase 설정

1. Firebase 콘솔에서 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. 웹 앱을 추가한 뒤 Firebase 설정 값을 복사합니다.
4. `.env.example`을 `.env`로 복사하고 값을 채웁니다.

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

## Firestore Rules 예시

현재 닉네임 + PIN 로그인은 Firebase Auth가 아니므로 Firestore Rules가 앱의 로그인 상태를 직접 검증할 수 없습니다. 따라서 MVP 테스트용 Rules는 아래처럼 열어야 앱이 동작합니다.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

중요: 위 규칙은 누구나 DB를 읽고 쓸 수 있습니다. 앱 UI에서는 본인 데이터만 수정/삭제하도록 막지만, Rules만으로 완벽한 보안은 어렵습니다. 실제 서비스에서는 Firebase Authentication을 사용하고 `request.auth.uid` 기반 Rules를 작성해야 합니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 알려주는 주소로 접속합니다. 보통 아래 주소입니다.

```text
http://localhost:5173
```

## 테스트 방법

1. 회원가입 탭에서 닉네임과 4자리 PIN으로 가입합니다.
2. 같은 닉네임으로 다시 가입하면 "이미 사용 중인 닉네임입니다"가 떠야 합니다.
3. 로그아웃 후 같은 닉네임 + PIN으로 로그인합니다.
4. 잘못된 PIN으로 로그인하면 실패해야 합니다.
5. 로그인 상태에서 프로필을 생성합니다.
6. 다른 닉네임으로 가입/로그인하면 기존 프로필의 수정/삭제 버튼이 보이지 않아야 합니다.
7. 로그인 상태에서 일정을 만들고, 다른 사용자는 수정/삭제 버튼 없이 참여하기만 할 수 있어야 합니다.

## GitHub Pages 배포

이 저장소는 `.github/workflows/deploy.yml`로 `main` 브랜치에 push할 때 `dist`를 빌드해서 GitHub Pages에 배포합니다.

GitHub 저장소에서 아래 설정을 해주세요.

1. `Settings` > `Pages` > `Build and deployment`를 `GitHub Actions`로 선택합니다.
2. `Settings` > `Secrets and variables` > `Actions`에 `.env`와 같은 Firebase 값을 추가합니다.

필요한 secret 이름:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

배포 주소:

```text
https://jmj30040.github.io/my-site/
```
