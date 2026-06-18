# Squad — мини-соцсеть группы

Готовый проект на React + Firebase: профили, посты, лайки, комментарии.

---

## Что внутри

```
squad/
├── src/
│   ├── App.jsx        ← весь интерфейс (лента, профили, комментарии)
│   ├── firebase.js     ← подключение к Firebase (auth + база данных)
│   └── main.jsx        ← точка входа React
├── firestore.rules     ← правила безопасности базы данных
├── firebase.json       ← настройки публикации
├── package.json
└── index.html
```

---

## Шаг 1. Установи инструменты (один раз)

1. **Node.js** — скачай с [nodejs.org](https://nodejs.org) (версия LTS), установи как обычную программу.
2. **VS Code** — скачай с [code.visualstudio.com](https://code.visualstudio.com), установи.

Проверка — открой терминал (в VS Code: `Terminal → New Terminal`) и введи:
```bash
node -v
npm -v
```
Если видишь номера версий — всё установлено правильно.

---

## Шаг 2. Открой проект в VS Code

1. Скачай и распакуй папку `squad`, которую я прислал
2. В VS Code: **File → Open Folder** → выбери папку `squad`
3. Открой встроенный терминал: **Terminal → New Terminal**

---

## Шаг 3. Установи зависимости

В терминале VS Code:
```bash
npm install
```
Это скачает React, Firebase и всё необходимое (может занять минуту).

---

## Шаг 4. Создай проект в Firebase

1. Зайди на [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → введи название, например `squad-uat`
3. **Build → Authentication** → Get started → включи провайдер **Email/Password**
4. **Build → Firestore Database** → Create database → выбери регион (например `europe-west3`) → **Start in test mode**
5. **⚙️ Project settings → General** → внизу "Your apps" → нажми иконку `</>` (Web app)
6. Введи название → **Register app** → скопируй блок `firebaseConfig`

Выглядит он так:
```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "squad-uat.firebaseapp.com",
  projectId: "squad-uat",
  storageBucket: "squad-uat.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Шаг 5. Вставь конфиг в проект

1. В VS Code открой файл `src/firebase.js`
2. Найди в начале файла:
   ```js
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     ...
   };
   ```
3. Выдели весь этот блок и замени на тот, что скопировал из консоли Firebase
4. Сохрани файл (Ctrl+S / Cmd+S)

---

## Шаг 6. Проверь, что всё работает локально

В терминале VS Code:
```bash
npm run dev
```
Появится ссылка вида `http://localhost:5173` — открой её в браузере (или Ctrl+click по ссылке в терминале).

Попробуй зарегистрироваться и написать пост. Если что-то не работает — открой консоль браузера (F12 → Console) и посмотри на ошибку, в большинстве случаев она укажет на опечатку в `firebaseConfig`.

Останови сервер — `Ctrl+C` в терминале.

---

## Шаг 7. Опубликуй в интернете

Установи инструмент командной строки Firebase (один раз):
```bash
npm install -g firebase-tools
firebase login
```
Откроется браузер — войди тем же Google-аккаунтом, которым создавал проект в Firebase Console.

Привяжи терминал к своему проекту:
```bash
firebase use --add
```
Выбери свой проект из списка (например `squad-uat`), введи любой alias (например `default`).

Собери финальную версию сайта:
```bash
npm run build
```
Это создаст папку `dist` с готовым к публикации сайтом.

Опубликуй:
```bash
firebase deploy
```

В конце увидишь:
```
✔  Deploy complete!
Hosting URL: https://squad-uat.web.app
```

**Это и есть ссылка** — отправь её всей группе, и каждый сможет зарегистрироваться и пользоваться соцсетью.

---

## Шаг 8. Подключи правила безопасности

Чтобы никто не мог редактировать чужие посты или профили:
```bash
firebase deploy --only firestore:rules
```

---

## Если что-то нужно поменять после публикации

1. Поменяй код в `src/App.jsx` (или попроси меня внести изменения)
2. Сохрани файл
3. Повтори:
   ```bash
   npm run build
   firebase deploy
   ```
Сайт обновится по той же ссылке за 10–20 секунд.

---

## Частые проблемы

| Проблема | Решение |
|---|---|
| `firebase: command not found` | Перезапусти терминал после `npm install -g firebase-tools` |
| Белый экран после деплоя | Проверь, что в `firebaseConfig` нет лишних пробелов или кавычек |
| "Permission denied" в Firestore | Убедись, что выполнил `firebase deploy --only firestore:rules` |
| Не получается войти | Проверь, что Email/Password включён в Authentication → Sign-in method |
