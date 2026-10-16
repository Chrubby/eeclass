---
typora-root-url: image
---

# 建立資料庫

1. pip install mysql-connector-python
2. configure `backend/.env`（`DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`）
3. run `create_db.py`
4. create first admin with `node backend/scripts/seedAdmin.js {accountName} {displayName} {password}`

# 資料庫架構

![](/mermaid-diagram.png)

