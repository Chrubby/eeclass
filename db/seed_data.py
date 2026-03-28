import mysql.connector
from werkzeug.security import generate_password_hash

# DB 連線
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Evan+921003",
    database="classroom_data"
)

cursor = conn.cursor()

# -------------------------
# 🔹 roles
# roles = [
#     ("student", "學生"),
#     ("teacher", "老師")
# ]

# cursor.executemany(
#     "INSERT INTO roles (role_name, description) VALUES (%s, %s)",
#     roles
# )

# -------------------------
# 🔹 accounts
accounts = [
    ("s001", generate_password_hash("123456"), "s001@test.com", "student"),
    ("t001", generate_password_hash("123456"), "t001@test.com", "teacher"),
    ("s002", generate_password_hash("123456"), "s002@test.com", "ta"),
]

cursor.executemany(
    "INSERT INTO accounts (username, password_hash, email, role) VALUES (%s, %s, %s, %s)",
    accounts
)

# -------------------------
# 🔹 students
students = [
    ("王小明", "s001"),
    ("陳小明", "s002"),
]

cursor.executemany(
    "INSERT INTO students (name, student_id) VALUES (%s, %s)",
    students
)

# 🔹 teachers
teachers = [
    ("陳老師", "t001")
]

cursor.executemany(
    "INSERT INTO teachers (name, teacher_id) VALUES (%s, %s)",
    teachers
)

# -------------------------
# 🔹 courses
courses = [
    ("CE001", "資料庫系統", "學習 SQL 與資料庫設計", "113-1"),
    ("CE002", "Python程式設計", "學習 Python 基礎", "113-1")
]

cursor.executemany(
    "INSERT INTO courses (course_code, course_name, description, academic_year) VALUES (%s, %s, %s, %s)",
    courses
)

# -------------------------
# 🔹 teacher_courses
cursor.execute("SELECT id FROM teachers WHERE teacher_id='t001'")
teacher_id = cursor.fetchone()[0]

cursor.execute("SELECT id FROM courses")
course_ids = [row[0] for row in cursor.fetchall()]

for cid in course_ids:
    cursor.execute(
        "INSERT INTO teacher_courses (teacher_id, course_id) VALUES (%s, %s)",
        (teacher_id, cid)
    )

# -------------------------
# 🔹 announcements (公告初始資料)

cursor.execute("SELECT id, course_code FROM courses")
courses_map = {code: cid for cid, code in [(row[0], row[1]) for row in cursor.fetchall()]}

cursor.execute("SELECT id, course_code FROM courses")
course_rows = cursor.fetchall()

course_dict = {row[1]: row[0] for row in course_rows}

cursor.execute("SELECT id FROM teachers WHERE teacher_id='t001'")
teacher_id = cursor.fetchone()[0]

announcements = [
    # course_code, title, content, is_pinned
    ("CE001", "課程開課公告", "歡迎修習資料庫系統課程！", 1),
    ("CE001", "作業說明", "第一份作業將於下週發布", 0),
    ("CE002", "Python課程公告", "請安裝 Python 3.10 以上版本", 1),
    ("CE002", "上課注意事項", "請準時上課並完成環境設定", 0)
]

insert_data = []

for course_code, title, content, is_pinned in announcements:
    course_id = course_dict.get(course_code)
    if course_id:
        insert_data.append((course_id, teacher_id, title, content, is_pinned))

cursor.executemany("""
    INSERT INTO announcements 
    (course_id, teacher_id, title, content, is_pinned)
    VALUES (%s, %s, %s, %s, %s)
""", insert_data)

conn.commit()
cursor.close()
conn.close()

print("✅ 測試資料建立完成！")