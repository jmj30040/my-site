# Overwatch Squad Hub

친구들과 오버워치 게임 일정과 사용자 숫자 티어를 공유하는 정적 웹앱입니다.

- React + Vite
- Tailwind CSS
- Firebase Firestore 실시간 동기화
- Firebase Authentication 없음
- 닉네임은 `localStorage`에 저장
- 관리자 모드는 비밀번호 입력 방식
- GitHub Pages 배포 지원

## 주요 기능

### 닉네임 기반 사용

첫 접속 시 닉네임을 입력합니다. 닉네임은 브라우저 `localStorage`에 저장되고, 일정 작성자와 참가자 표시용으로 사용됩니다.

### 관리자 모드

상단의 `관리자 모드` 버튼을 누르고 `.env`에 설정한 `VITE_ADMIN_PASSWORD`를 입력하면 관리자 기능이 활성화됩니다.

관리자만 가능한 기능:

- 사용자 추가
- 사용자 티어 변경
- 사용자 메모 수정
- 사용자 삭제
- 모든 일정 수정/삭제

정적 프론트엔드 앱이므로 이 비밀번호 방식은 강한 보안 기능이 아닙니다. 친구끼리 사용하는 가벼운 용도에 맞춰져 있습니다.

### 사용자 티어 시스템

Firestore `users` 컬렉션을 사용합니다.

```js
{
  nickname: string,
  tier: number, // 1 ~ 5
  memo: string,
  updatedAt: timestamp
}
```

티어 색상:

- 1티어: 금색
- 2티어: 보라
- 3티어: 파랑
- 4티어: 회색
- 5티어: 어두운 회색

### 게임 일정

Firestore `schedules` 컬렉션을 사용합니다.

```js
{
  title: string,
  date: string,
  time: string,
  memo: string,
  author: string,
  participants: string[],
  createdAt: timestamp
}
```

일정 생성은 누구나 할 수 있습니다. 일정 수정/삭제는 작성자 또는 관리자만 가능합니다. 참가 버튼을 누르면 현재 닉네임이 `participants` 배열에 추가되고, 다시 누르면 참가가 취소됩니다.

## 설치 방법

```bash
npm install
```

## Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 만듭니다.
2. 웹 앱을 추가합니다.
3. Firestore Database를 생성합니다.
4. Firestore Rules를 친구끼리 쓰는 목적에 맞게 아래처럼 설정합니다.

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

5. `.env.example`을 복사해서 `.env`를 만들고 Firebase 설정값을 채웁니다.

```bash
cp .env.example .env
```

Windows PowerShell에서는 다음 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
```

`.env` 예시:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_ADMIN_PASSWORD=your-admin-password
VITE_BASE_PATH=/your-repository-name/
```

## 로컬 실행

```bash
npm run dev
```

## 빌드

```bash
npm run build
```

## GitHub Pages 배포

프로젝트 페이지로 배포하는 경우 `.env`의 `VITE_BASE_PATH`를 저장소 이름에 맞춰 설정합니다.

예를 들어 저장소 URL이 `https://github.com/myname/overwatch-squad-hub`라면:

```env
VITE_BASE_PATH=/overwatch-squad-hub/
```

배포:

```bash
npm run deploy
```

GitHub 저장소 설정에서 Pages 소스를 `gh-pages` 브랜치로 지정하세요.

## 프로젝트 구조

```txt
src/
  firebase.js
  App.jsx
  main.jsx
  styles.css
  components/
    NicknameModal.jsx
    AdminModal.jsx
    TierBoard.jsx
    ScheduleList.jsx
    Home.jsx
```

## 주의사항

- Firebase Authentication은 구현하지 않았습니다.
- 오버워치 공식 이미지는 사용하지 않았습니다.
- Firestore rules가 공개 쓰기 허용이므로 공개 서비스나 민감한 데이터에는 적합하지 않습니다.
- 관리자 비밀번호는 프론트엔드 번들에 포함됩니다. 친구끼리 사용하는 편의 기능으로만 사용하세요.
