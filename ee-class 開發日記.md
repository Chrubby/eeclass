# ee-class 開發日記

## 3/28

- Home Page 載入使用者資訊
- 老師建立課程
- 老師建立公告

## 3/22

### 資料庫更新

- accounts TABLE 新增 email VARCHAR(100) UNIQUE
- 新增 announcements TABLE : 課堂公告
- 新增 announcement_reads TABLE : 紀錄學生是否閱讀過公告

### 後端更新

- /api/courses : 傳入課程代碼或名稱，回傳找到的課程資訊 
- /api/enroll : 傳入學生學號、課程代碼，回傳是否選課成功
- /api/student_courses : 傳入學生學號，回傳學生資料跟所有修課資訊 
- /api/announcements : 傳入學生學號、課程代碼，回傳課程公告資訊 
- /api/announcements/read : 紀錄學生閱讀公告 (取消New標籤)

### 前端更新

- Home Page 增加  加入課程的功能
- Home Page 動態顯示學生選修課程
- Course_Announcement Page  動態顯示公告、點擊公告顯示內文 (標記已看過)

### 其他

- create_db.py : 清除資料庫後重構

- seed_data.py : 在資料庫輸存入初始資料
  - 測試 帳號: s001 / 密碼: 123456
  - 測試課程 
    - 代碼: CE001 / 名稱: 資料庫系統
    - 代碼: CE002 / 名稱: Python程式設計