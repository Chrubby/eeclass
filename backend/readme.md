1. pip install flask flask-cors werkzeug mysql-connector-python
2. 資料庫擴增：ALTER TABLE accounts ADD COLUMN email VARCHAR(100) UNIQUE;
3. 修改backend/app.vue的db_config
4. 同時啟動app.py 跟執行前端 npm run dev