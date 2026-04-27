# Overwatch Friends Community

친구들끼리 오버워치 프로필을 공유하고, 같이 게임할 일정을 만드는 React + Firebase MVP입니다.

## 기술 스택

- Frontend: React, Vite, CSS
- Auth: Firestore PIN hash session
- Database: Firebase Cloud Firestore
- Deploy: GitHub Pages, GitHub Actions

## 로그인 방식

사용자 화면은 닉네임 + 6자리 PIN 로그인입니다.

내부적으로는 앱이 닉네임을 해시한 계정 ID와 `pinSalt`, `pinHash`를 Firestore에 저장합니다.

예:

```text
사용자 입력: 민진 / 123456
내부 인증: users/{nicknameHash}.pinHash 검증
```

사용자는 이메일을 입력하지 않습니다. PIN 원문은 저장하지 않고, salt를 섞은 SHA-256 해시만 저장합니다.

PIN은 숫자 6자리만 허용합니다.

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

## Firestore 컬렉션 구조

`users/{uid}`:

```js
{
  nickname: '민진',
  nicknameKey: 'hex-encoded-normalized-nickname',
  pinSalt: 'random-hex-salt',
  pinHash: 'sha256(salt:pin)',
  status: 'pending', // pending | approved | rejected | deleted
  role: 'admin', // 관리자 계정에만 수동 추가
  temporaryPinIssuedAt: serverTimestamp(), // 임시 PIN 발급 시에만 기록
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`usernames/{nicknameKey}`:

```js
{
  uid: 'Firestore user document id',
  nickname: '민진',
  createdAt: serverTimestamp()
}
```

`profiles/{profileId}`:

```js
{
  ownerId: 'Firestore user document id',
  ownerNickname: '민진',
  battleTag: 'Player#1234',
  profileImageUrl: 'data:image/jpeg;base64,...',
  tier: '언랭',
  role: '공격',
  mainHeroes: ['트레이서', '아나'],
  bio: '즐겜도 빡겜도 좋아요',
  availableTime: '평일 21:00 이후',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`schedules/{scheduleId}`:

```js
{
  ownerId: 'Firestore user document id',
  ownerNickname: '민진',
  title: '경쟁전 하실 분',
  date: '2026-04-27',
  startTime: '21:00',
  endTime: '23:00',
  memo: '마이크 가능',
  participants: ['민진'],
  participantIds: ['Firestore user document id'],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`scheduleComments/{commentId}`:

```js
{
  scheduleId: 'schedule document id',
  ownerId: 'Firestore user document id',
  ownerNickname: '민진',
  message: '마이크 가능?',
  createdAt: serverTimestamp()
}
```

## 권한 동작

- 로그인한 사용자만 프로필 목록과 일정 목록을 볼 수 있습니다.
- 회원가입 직후에는 `pending` 상태이며, 관리자가 승인해야 프로필/일정 기능을 사용할 수 있습니다.
- 관리자는 가입 대기 사용자를 승인할 수 있고, 회원 상태를 조회할 수 있습니다.
- 승인된 사용자만 프로필 생성/수정/삭제가 가능합니다.
- 승인된 사용자만 일정 생성/수정/삭제가 가능합니다.
- 승인된 사용자만 일정별 대화에 댓글을 남길 수 있습니다.
- 본인이 만든 프로필과 일정만 수정/삭제 버튼이 보입니다.
- 본인이 쓴 일정 댓글만 삭제할 수 있습니다.
- 관리자는 모든 프로필/일정/일정 댓글을 관리할 수 있고, 전체 회원 목록을 조회할 수 있습니다.
- 관리자는 회원의 임시 PIN을 발급할 수 있습니다. 발급된 PIN은 화면에 한 번 표시되고, Firestore에는 새 `pinSalt`/`pinHash`만 저장됩니다.
- 로그인한 사용자는 현재 PIN을 입력해 본인 PIN을 새 6자리 PIN으로 변경할 수 있습니다.
- 로그인한 사용자는 중복되지 않는 새 닉네임으로 본인 닉네임을 변경할 수 있습니다.
- 관리자는 회원 계정과 닉네임 예약, 해당 사용자가 만든 프로필/일정/댓글을 삭제할 수 있습니다.
- 이 앱의 새 로그인 방식은 Firebase Auth가 아니라 Firestore 기반 PIN 세션입니다. 브라우저 앱만으로 처리되므로 운영 보안이 중요한 서비스라면 Cloud Functions, Firebase Auth Custom Token 같은 서버 검증 방식이 필요합니다.
- 일정 참여/참여 취소는 승인된 사용자만 가능합니다.

## Firebase 설정

1. Firebase Console에서 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. 웹 앱을 추가한 뒤 Firebase 설정 값을 복사합니다.
4. `.env.example`을 `.env`로 복사하고 값을 채웁니다.

참고: 새 계정은 Firebase Authentication을 사용하지 않습니다. 이전 버전에서 만든 Firebase Auth 계정을 계속 로그인시키고 싶다면 마이그레이션 기간 동안만 `Authentication` > `Sign-in method`의 `Email/Password`를 유지하세요.

```powershell
Copy-Item .env.example .env
```

예시:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Firestore Rules

현재 로그인 방식은 Firebase Auth 토큰이 아니라 브라우저의 Firestore PIN 세션을 사용합니다. Firestore Rules는 `localStorage` 세션이나 PIN 해시 검증 결과를 신뢰할 수 없기 때문에, 클라이언트만으로는 기존 `request.auth.uid` 기반 규칙을 유지할 수 없습니다.

소규모 비공개 MVP로 바로 사용하려면 Firebase Console > Firestore Database > Rules에 아래 규칙을 게시하세요.

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

주의: 위 규칙은 앱 UI의 관리자/승인 로직을 신뢰하는 MVP용 규칙입니다. 외부 사용자에게 공개하거나 보안이 중요한 데이터가 있다면 사용하지 마세요.

관리자 계정은 Firebase Console에서 해당 사용자의 `users/{uid}` 문서에 `role: 'admin'` 필드를 추가하면 됩니다. 관리자 권한은 다시 로그인하거나 페이지를 새로고침한 뒤 반영됩니다.

## 프로필 이미지

Firebase Storage 없이 사용할 수 있도록 프로필 이미지는 브라우저에서 320px 이하 JPEG로 압축한 뒤 Firestore `profiles` 문서의 `profileImageUrl` 필드에 저장합니다.

Firestore 문서 크기 제한을 넘지 않도록 원본 이미지는 5MB 이하만 선택할 수 있고, 압축 후에도 너무 큰 이미지는 저장되지 않습니다.

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

1. 회원가입 탭에서 닉네임과 숫자 6자리 PIN으로 가입합니다.
2. 가입 직후 "관리자 승인 대기" 상태가 표시되고 프로필/일정 작성 버튼이 보이지 않아야 합니다.
3. Firebase Console에서 관리자 계정의 `users/{uid}` 문서에 `role: 'admin'`을 추가합니다.
4. 관리자 계정으로 로그인해 회원 관리 패널에서 대기 사용자를 승인합니다.
5. 승인된 사용자가 다시 로그인하거나 화면이 갱신되면 프로필과 일정을 생성할 수 있어야 합니다.
6. 회원 관리 패널에서 상태 조회, 임시 PIN 발급, 사용자 삭제가 동작하는지 확인합니다.
7. 임시 PIN 발급 후 화면에 표시된 6자리 PIN으로 해당 사용자가 로그인되는지 확인합니다.
8. 로그인한 사용자가 현재 PIN과 새 PIN을 입력해 PIN을 변경할 수 있는지 확인합니다.
9. 변경 후 로그아웃하고 새 PIN으로 다시 로그인되는지 확인합니다.
10. 로그인한 사용자가 닉네임을 변경하면 프로필/일정/댓글의 표시 이름도 바뀌는지 확인합니다.
11. 변경 후 로그아웃하고 새 닉네임으로 다시 로그인되는지 확인합니다.
12. 삭제된 사용자의 닉네임으로 다시 가입할 수 있는지 확인합니다.
13. 같은 닉네임으로 중복 가입하면 "이미 사용 중인 닉네임입니다"가 떠야 합니다.
14. 잘못된 PIN으로 로그인하면 실패해야 합니다.
15. 다른 일반 계정으로 로그인하면 기존 프로필/일정의 수정/삭제 버튼이 보이지 않아야 합니다.

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
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

배포 주소:

```text
https://jmj30040.github.io/my-site/
```
