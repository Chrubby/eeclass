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

@app.route('/api/courses', methods=['GET'])
def get_courses():
    course_code = request.args.get('code')
    course_name = request.args.get('name')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        if course_code:
            base_sql = """
                SELECT c.*
                FROM courses c
                WHERE c.course_code = %s
                ORDER BY c.created_at DESC
                LIMIT 1
            """
            cursor.execute(base_sql, (course_code,))
            course = cursor.fetchone()

        elif course_name:
            base_sql = """
                SELECT c.*
                FROM courses c
                WHERE c.course_name LIKE %s
                ORDER BY c.created_at DESC
                LIMIT 1
            """
            cursor.execute(base_sql, (f"%{course_name}%",))
            course = cursor.fetchone()

        else:
            return jsonify({"message": "找不到課程"}), 404

        if not course:
            return jsonify({"message": "找不到課程"}), 404

        course_id = course['id']

        teacher_sql = """
            SELECT t.id, t.name, t.teacher_id
            FROM teachers t
            JOIN teacher_courses tc ON t.id = tc.teacher_id
            WHERE tc.course_id = %s
        """
        cursor.execute(teacher_sql, (course_id,))
        teachers = cursor.fetchall()

        course['teachers'] = teachers

        return jsonify(course)

    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/enroll', methods=['POST'])
def enroll_course():
    data = request.json
    student_identifier = data.get('student_id')
    course_code = data.get('course_code')

    if not student_identifier or not course_code:
        return jsonify({"message": "缺少參數"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM students WHERE student_id = %s",
            (student_identifier,)
        )
        student = cursor.fetchone()

        if not student:
            return jsonify({"message": "找不到學生"}), 404

        student_id = student['id']

        cursor.execute(
            "SELECT id FROM courses WHERE course_code = %s",
            (course_code,)
        )
        course = cursor.fetchone()

        if not course:
            return jsonify({"message": "找不到課程"}), 404

        course_id = course['id']

        cursor.execute("""
            SELECT * FROM enrollments
            WHERE student_id = %s AND course_id = %s
        """, (student_id, course_id))

        exist = cursor.fetchone()

        if exist:
            return jsonify({"message": "已經選過此課程"}), 400

        cursor.execute("""
            INSERT INTO enrollments (student_id, course_id)
            VALUES (%s, %s)
        """, (student_id, course_id))

        conn.commit()

        return jsonify({"message": "選課成功！"})

    except mysql.connector.Error as err:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/student_courses', methods=['GET'])
def get_student_courses():
    student_code = request.args.get('student_id')

    if not student_code:
        return jsonify({"message": "缺少學生學號"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT * FROM students WHERE student_id = %s
        """, (student_code,))
        student = cursor.fetchone()

        if not student:
            return jsonify({"message": "找不到學生"}), 404

        student_id = student['id']

        cursor.execute("""
            SELECT c.*
            FROM courses c
            JOIN enrollments e ON c.id = e.course_id
            WHERE e.student_id = %s
        """, (student_id,))
        courses = cursor.fetchall()

        for course in courses:
            cursor.execute("""
                SELECT t.id, t.name, t.teacher_id
                FROM teachers t
                JOIN teacher_courses tc ON t.id = tc.teacher_id
                WHERE tc.course_id = %s
            """, (course['id'],))
            teachers = cursor.fetchall()

            course['teachers'] = teachers

        return jsonify({
            "student": student,
            "courses": courses
        })

    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    course_code = request.args.get('course_code')
    student_identifier = request.args.get('student_id')

    if not course_code or not student_identifier:
        return jsonify({"message": "缺少參數"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id FROM courses WHERE course_code = %s
        """, (course_code,))
        course = cursor.fetchone()

        if not course:
            return jsonify({"message": "找不到課程"}), 404

        course_id = course['id']

        cursor.execute("""
            SELECT id FROM students WHERE student_id = %s
        """, (student_identifier,))
        student = cursor.fetchone()

        if not student:
            return jsonify({"message": "找不到學生"}), 404

        student_id = student['id']

        cursor.execute("""
            SELECT 
                a.id,
                a.title,
                a.content,
                a.is_pinned,
                a.created_at,
                t.name AS teacher_name,

                CASE 
                    WHEN ar.id IS NULL THEN FALSE
                    ELSE TRUE
                END AS is_read

            FROM announcements a
            LEFT JOIN teachers t ON a.teacher_id = t.id
            LEFT JOIN announcement_reads ar 
                ON a.id = ar.announcement_id 
                AND ar.student_id = %s

            WHERE a.course_id = %s
            ORDER BY a.is_pinned DESC, a.created_at DESC
        """, (student_id, course_id))

        announcements = cursor.fetchall()

        for a in announcements:
            a["isNew"] = not a["is_read"]

        return jsonify({
            "course_code": course_code,
            "course_id": course_id,
            "student_id": student_id,
            "announcements": announcements
        })

    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/announcements/read', methods=['POST'])
def mark_announcement_read():
    data = request.json
    student_id = data.get('student_id')
    announcement_id = data.get('announcement_id')

    if not student_id or not announcement_id:
        return jsonify({"message": "缺少必要參數"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT IGNORE INTO announcement_reads (student_id, announcement_id)
            VALUES (%s, %s)
        """, (student_id, announcement_id))

        conn.commit()

        return jsonify({
            "message": "已記錄已讀",
            "student_id": student_id,
            "announcement_id": announcement_id
        })

    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)