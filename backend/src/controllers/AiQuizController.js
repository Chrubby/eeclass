import { AIQuizService } from '../services/AiQuizService.js';

export const AIQuizController = {
    // [POST] 讓 AI 閱讀 PDF 並出題
    async generateAIQuestions(req, res) {
        try {
            const file = req.file;
            const questionCount = parseInt(req.body.questionCount) || 3;
            
            if (!file) {
                return res.status(400).json({ message: '請上傳 PDF 檔案' });
            }

            const questions = await AIQuizService.generateQuestionsFromPdf(file.path, questionCount);
            res.status(200).json({ questions });
        } catch (error) {
            console.error('AI 出題失敗:', error);
            res.status(500).json({ message: error.message || 'AI 出題失敗' });
        }
    },

    // [POST] 教師發布測驗
    async createQuiz(req, res) {
        try {
            const { courseId } = req.params;
            const { title, deadline, teacherId, questions } = req.body;
            const file = req.file;

            const sourceFileUrl = file ? `/uploads/${file.filename}` : null;

            const quizData = {
                courseId,
                title,
                deadline,
                teacherId,
                sourceFile: sourceFileUrl // 存入可被靜態讀取的路徑
            };

            const parsedQuestions = JSON.parse(questions);
            const result = await AIQuizService.createQuiz(quizData, parsedQuestions);
            
            res.status(201).json({ message: '測驗建立成功', data: result });
        } catch (error) {
            console.error('發布測驗失敗:', error);
            res.status(500).json({ message: '發布測驗失敗' });
        }
    },

    // [GET] 取得測驗列表
    async getQuizzes(req, res) {
        try {
            const { courseId } = req.params;
            const quizzes = await AIQuizService.getQuizList(courseId);
            res.status(200).json(quizzes);
        } catch (error) {
            res.status(500).json({ message: '取得測驗列表失敗' });
        }
    },

    // [GET] 取得單一測驗詳情與題目
    async getQuizDetail(req, res) {
        try {
            const { quizId } = req.params;
            // 實務上這兩個值應該從 JWT Token (req.user) 中解析取得
            const { role, studentId } = req.query; 

            const quiz = await AIQuizService.getQuizDetail(quizId, role, studentId);
            res.status(200).json(quiz);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // [POST] 學生提交答案
    async submitAnswers(req, res) {
        try {
            const { quizId } = req.params;
            const { studentId, studentName, answers } = req.body; // answers 是一個 key-value 物件

            await AIQuizService.submitStudentAnswers(quizId, studentId, studentName, answers);
            res.status(200).json({ message: '答案提交成功' });
        } catch (error) {
            res.status(500).json({ message: '提交答案失敗' });
        }
    },

    // [DELETE] 刪除測驗
    async deleteQuiz(req, res) {
        try {
            const { quizId } = req.params;
            await AIQuizService.deleteQuiz(quizId);
            res.status(200).json({ message: '刪除成功' });
        } catch (error) {
            res.status(500).json({ message: '刪除測驗失敗' });
        }
    },

    async postComment(req, res) {
    try {
        const { answerId } = req.params;
        const { userId, userName, role, content, parentId } = req.body;
        await AIQuizService.addComment({ answerId, userId, userName, role, content, parentId });
        res.status(201).json({ message: '留言成功' });
    } catch (error) {
        res.status(500).json({ message: '留言失敗' });
    }
}
};