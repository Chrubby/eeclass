from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)  

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "a7385966", 
    "database": "classroom_data"
}
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role')
    email = data.get('email') 

    hashed_pwd = generate_password_hash(password)

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        sql_account = "INSERT INTO accounts (username, password_hash, email) VALUES (%s, %s, %s)"
        cursor.execute(sql_account, (username, hashed_pwd, email))
        
        if role == 'student':
            sql_user = "INSERT INTO students (name, student_id) VALUES (%s, %s)"
            cursor.execute(sql_user, (name, username))
        elif role == 'teacher':
            sql_user = "INSERT INTO teachers (name, teacher_id) VALUES (%s, %s)"
            cursor.execute(sql_user, (name, username))

        conn.commit() 
        return jsonify({"message": "註冊成功！"})

    except mysql.connector.Error as err:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback() 
        return jsonify({"message": f"註冊失敗，帳號或信箱可能重複：{err}"}), 400
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    login_input = data.get('username') 
    password = data.get('password')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True) 
        
        sql = "SELECT * FROM accounts WHERE username = %s OR email = %s"
        cursor.execute(sql, (login_input, login_input))
        account = cursor.fetchone() 

        if account and check_password_hash(account['password_hash'], password):
            return jsonify({
                "message": "登入成功！",
                "username": account['username']
            })
        else:
            return jsonify({"message": "帳號、信箱或密碼錯誤！"}), 401

    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)