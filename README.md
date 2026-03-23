# eeclass

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

# 作業系統測試開關整理（Vue 前端）

由於現在只有前端，可以透過修改程式碼或是於瀏覽器console更改userRole來檢視不同身分的頁面。

---

## 1. 決定是否能進入新增作業頁面、批改作業頁面

### 檔案：`router/index.js`

```js
//在router.beforeEach的那個函式裡面
const userRole = localStorage.getItem('userRole') || 'student'
```
### 測試方法
更改後面的預設值，或在瀏覽器 console 輸入 (推薦)：

```js
localStorage.setItem('userRole', 'teacher') //或是'student'
```

### 影響功能

- 是否可以進入：
  - `/homework/create`
  - `/homework/:hwId/grade/:submissionId`
- `HomeworkDetail` 會載入：
  - teacher → `HomeworkTeacher.vue`
  - student → `HomeworkStudent.vue`

---

## 2. 作業詳細頁身份切換

### 檔案：`router/index.js`

```js
//在 path:'homework/:hwId' 的 component 裡
const role = localStorage.getItem('userRole') || 'teacher' 
```
### 測試方法
更改後面的預設值，或在瀏覽器 console 輸入 (推薦)：

```js
localStorage.setItem('userRole', 'teacher') //或是'student'
```

### 影響畫面

- teacher → 批改畫面
- student → 作答畫面

---

## 3. 作業清單角色切換

### 檔案：`Homework.vue`

```js
const userRole = ref('teacher')
```

### 測試方式

直接修改值，或在瀏覽器 console 輸入 (推薦)：

```js
localStorage.setItem('userRole', 'teacher') //或是'student'
```

### 影響畫面

- teacher：顯示「新增作業」
- student：不顯示