from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)  

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "Evan+921003", 
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
        
        sql_account = "INSERT INTO accounts (username, password_hash, email, role) VALUES (%s, %s, %s, %s)"
        cursor.execute(sql_account, (username, hashed_pwd, email, role))
        
        if role == 'student' or role == 'ta':
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

@app.route('/api/user_courses', methods=['GET'])
def get_user_courses():
    user_id = request.args.get('user_id')
    role = request.args.get('role')

    if not user_id or not role:
        return jsonify({"message": "缺少 user_id 或 role"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        if role in ['student', 'ta']:
            cursor.execute("SELECT id FROM students WHERE student_id = %s", (user_id,))
        elif role == 'teacher':
            cursor.execute("SELECT id FROM teachers WHERE teacher_id = %s", (user_id,))
        else:
            return jsonify({"message": "role 無效"}), 400

        user = cursor.fetchone()
        if not user:
            return jsonify({"message": f"找不到 {role}"}), 404

        user_db_id = user['id']

        if role in ['student', 'ta']:
            cursor.execute("""
                SELECT c.*
                FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = %s
            """, (user_db_id,))
        elif role == 'teacher':
            cursor.execute("""
                SELECT c.*
                FROM courses c
                JOIN teacher_courses tc ON c.id = tc.course_id
                WHERE tc.teacher_id = %s
            """, (user_db_id,))

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

        return jsonify(courses)

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

    if not course_code:
        return jsonify({"message": "缺少 course_code"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # 取得課程ID
        cursor.execute("SELECT id FROM courses WHERE course_code = %s", (course_code,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"message": "找不到課程"}), 404

        course_id = course['id']
        student_id = None
        is_student_found = False

        # 嘗試取得學生ID
        if student_identifier:
            cursor.execute("SELECT id FROM students WHERE student_id = %s", (student_identifier,))
            student = cursor.fetchone()
            if student:
                student_id = student['id']
                is_student_found = True

        # 取得公告
        if is_student_found:
            # 有找到學生，檢查已讀狀態
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
        else:
            # 沒找到學生，全部當作已讀
            cursor.execute("""
                SELECT 
                    a.id,
                    a.title,
                    a.content,
                    a.is_pinned,
                    a.created_at,
                    t.name AS teacher_name,
                    TRUE AS is_read
                FROM announcements a
                LEFT JOIN teachers t ON a.teacher_id = t.id
                WHERE a.course_id = %s
                ORDER BY a.is_pinned DESC, a.created_at DESC
            """, (course_id,))

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
    student_identifier = data.get('student_id')  # 前端傳學號或username
    announcement_id = data.get('announcement_id')

    if not student_identifier or not announcement_id:
        return jsonify({"message": "缺少必要參數"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # 先查出學生在資料庫的id
        cursor.execute("""
            SELECT id FROM students WHERE student_id = %s
        """, (student_identifier,))
        student = cursor.fetchone()

        if not student:
            return jsonify({"message": "找不到學生"}), 404

        student_id = student['id']

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
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/user_inf', methods=['GET'])
def get_user_inf():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "缺少user_id"}), 400
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT role FROM accounts WHERE username = %s
        """, (user_id,))
        role = cursor.fetchone()['role']
        if role == 'student' or role == 'ta':
            cursor.execute("""
                SELECT * FROM students WHERE student_id = %s
            """, (user_id,))
            user = cursor.fetchone()
        else:
            cursor.execute("""
                SELECT * FROM teachers WHERE teacher_id = %s
            """, (user_id,))
            user = cursor.fetchone()
        
        return jsonify({
            "role": role,
            "user": user
        })


    except mysql.connector.Error as err:
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()
    
@app.route('/api/create_course', methods=['POST'])
def create_course():
    data = request.json
    teacher_id = data.get('teacher_id')
    course_name = data.get('course_name')
    course_code = data.get('course_code')
    description = data.get('description')
    academic_year = data.get('academic_year')

    if not all([teacher_id, course_name, course_code, academic_year]):
        return jsonify({"message": "缺少必要欄位"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM courses WHERE course_code = %s", (course_code,))
        exist = cursor.fetchone()
        if exist:
            return jsonify({"message": "課程代碼已存在"}), 400

        cursor.execute("""
            INSERT INTO courses (course_name, course_code, description, academic_year)
            VALUES (%s, %s, %s, %s)
        """, (course_name, course_code, description, academic_year))
        conn.commit()

        course_id = cursor.lastrowid

        cursor.execute("SELECT id FROM teachers WHERE teacher_id = %s", (teacher_id,))
        teacher = cursor.fetchone()
        if not teacher:
            return jsonify({"message": "找不到該老師"}), 404

        cursor.execute("""
            INSERT INTO teacher_courses (teacher_id, course_id)
            VALUES (%s, %s)
        """, (teacher['id'], course_id))
        conn.commit()

        return jsonify({
            "message": "課程建立成功",
            "course_id": course_id
        })

    except mysql.connector.Error as err:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

@app.route('/api/announcements/create', methods=['POST'])
def create_announcement():
    data = request.json
    course_code = data.get('course_code')
    teacher_account = data.get('teacher_id')  # 這裡傳帳號 username
    title = data.get('title')
    content = data.get('content', '')
    is_pinned = data.get('is_pinned', False)

    if not course_code or not teacher_account or not title:
        return jsonify({"message": "缺少必要參數"}), 400

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM courses WHERE course_code = %s", (course_code,))
        course = cursor.fetchone()
        if not course:
            return jsonify({"message": "找不到課程"}), 404
        course_id = course['id']

        cursor.execute("SELECT id FROM teachers WHERE teacher_id = %s", (teacher_account,))
        teacher = cursor.fetchone()
        if not teacher:
            return jsonify({"message": "找不到老師"}), 404
        teacher_id = teacher['id']

        cursor.execute("""
            INSERT INTO announcements (course_id, teacher_id, title, content, is_pinned)
            VALUES (%s, %s, %s, %s, %s)
        """, (course_id, teacher_id, title, content, is_pinned))

        conn.commit()

        return jsonify({
            "message": "公告新增成功",
            "course_id": course_id,
            "teacher_id": teacher_id,
            "title": title,
            "content": content,
            "is_pinned": is_pinned
        })

    except mysql.connector.Error as err:
        if 'conn' in locals() and conn.is_connected():
            conn.rollback()
        return jsonify({"message": f"資料庫錯誤：{err}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)