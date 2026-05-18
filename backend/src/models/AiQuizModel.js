import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export const AIQuizModel = {
    /**
     * 建立一份新的測驗及其關聯題目 (使用 Transaction 確保資料完整性)
     */
    async createQuizWithQuestions(quizData, questions) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const quizId = uuidv4();
            const { courseId, teacherId, title, sourceFile, deadline } = quizData;

            // 1. 插入測驗主表
            const quizSql = `
                INSERT INTO AIQuizzes (id, courseId, teacherId, title, sourceFile, deadline)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await connection.execute(quizSql, [quizId, courseId, teacherId, title, sourceFile, deadline]);

            // 2. 插入題目表
            const questionSql = `
                INSERT INTO AIQuestions (id, quizId, questionText, discussionPrompt)
                VALUES (?, ?, ?, ?)
            `;
            for (const q of questions) {
                await connection.execute(questionSql, [uuidv4(), quizId, q.questionText, q.discussionPrompt]);
            }

            await connection.commit();
            return { quizId, title };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * 取得該課程的所有 AI 測驗列表
     */
    async getQuizzesByCourse(courseId) {
        const sql = `
            SELECT q.*, 
            (SELECT COUNT(*) FROM AIQuestions WHERE quizId = q.id) as questionCount
            FROM AIQuizzes q
            WHERE q.courseId = ?
            ORDER BY q.createdAt DESC
        `;
        const [rows] = await pool.execute(sql, [courseId]);
        return rows;
    },

    /**
     * 取得特定測驗的詳細內容與題目
     */
    async getQuizById(quizId) {
        const quizSql = `SELECT * FROM AIQuizzes WHERE id = ?`;
        const [quizzes] = await pool.execute(quizSql, [quizId]);
        
        if (quizzes.length === 0) return null;

        const questionSql = `SELECT * FROM AIQuestions WHERE quizId = ?`;
        const [questions] = await pool.execute(questionSql, [quizId]);

        return {
            ...quizzes[0],
            questions
        };
    },

    /**
     * 新增：取得特定題目下的「所有」學生作答紀錄 (老師視角)
     */
    async getAllAnswersByQuestion(questionId) {
        const sql = `
            SELECT id, studentId, studentName, answerText, aiFeedback, submitTime 
            FROM StudentAnswers 
            WHERE questionId = ?
            ORDER BY submitTime DESC
        `;
        const [rows] = await pool.execute(sql, [questionId]);
        return rows;
    },

    /**
     * 儲存學生作答紀錄與 AI 回饋
     */
    async saveStudentAnswer(questionId, studentId, studentName, answerText, aiFeedback) {
        const sql = `
            INSERT INTO StudentAnswers (id, questionId, studentId, studentName, answerText, aiFeedback)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                answerText = VALUES(answerText), 
                aiFeedback = VALUES(aiFeedback), 
                submitTime = CURRENT_TIMESTAMP
        `;
        const id = uuidv4();
        await pool.execute(sql, [id, questionId, studentId, studentName, answerText, aiFeedback]);
        return id;
    },

    /**
     * 取得特定學生在特定測驗中的所有作答 (包含 AI 回饋)
     */
    async getStudentAnswersForQuiz(quizId, studentId) {
        const sql = `
            SELECT sa.* FROM StudentAnswers sa
            JOIN AIQuestions aq ON sa.questionId = aq.id
            WHERE aq.quizId = ? AND sa.studentId = ?
        `;
        const [rows] = await pool.execute(sql, [quizId, studentId]);
        return rows;
    },

    /**
     * 取得同儕答案 (學生視角：隱藏敏感資訊)
     */
    async getPeerAnswers(questionId, excludeStudentId) {
        const sql = `
            SELECT id, studentName, answerText, aiFeedback, submitTime 
            FROM StudentAnswers 
            WHERE questionId = ? AND studentId != ?
            ORDER BY submitTime DESC
        `;
        const [rows] = await pool.execute(sql, [questionId, excludeStudentId]);
        return rows;
    },

    /**
     * 檢查學生是否已完成該測驗的所有題目
     */
    async checkStudentSubmission(quizId, studentId) {
        const sql = `
            SELECT COUNT(sa.id) as answeredCount,
            (SELECT COUNT(*) FROM AIQuestions WHERE quizId = ?) as totalCount
            FROM StudentAnswers sa
            JOIN AIQuestions aq ON sa.questionId = aq.id
            WHERE aq.quizId = ? AND sa.studentId = ?
        `;
        const [rows] = await pool.execute(sql, [quizId, quizId, studentId]);
        return rows[0];
    },

    /**
     * 刪除測驗 (會連動刪除題目與作答，因有 ON DELETE CASCADE)
     */
    async deleteQuiz(quizId) {
        const sql = `DELETE FROM AIQuizzes WHERE id = ?`;
        const [result] = await pool.execute(sql, [quizId]);
        return result.affectedRows > 0;
    },

    /**
     * 儲存留言
     */
    async saveComment(commentData) {
        const { id, answerId, parentId, userId, userName, role, content } = commentData;
        const sql = `
            INSERT INTO AIQuizComments (id, answerId, parentId, userId, userName, role, content)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await pool.execute(sql, [id, answerId, parentId, userId, userName, role, content]);
        return id;
    },

    /**
     * 取得特定作答的所有留言
     */
    async getCommentsByAnswer(answerId) {
        const sql = `
            SELECT * FROM AIQuizComments 
            WHERE answerId = ? 
            ORDER BY createdAt ASC
        `;
        const [rows] = await pool.execute(sql, [answerId]);
        return rows;
    }
};