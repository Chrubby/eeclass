// routes/aiQuizRoutes.js
import express from 'express';
import { uploadPdf } from '../middlewares/upload.js'; // 使用你寫好的嚴格 PDF 上傳
import { AIQuizController } from '../controllers/AiQuizController.js';

const router = express.Router({ mergeParams: true });

// 路由前綴已經是: /api/courses/:courseId/aiquizzes

// 1. AI 輔助閱讀與出題 (純生成不存DB)
router.post('/generate', uploadPdf.single('homework_files'), AIQuizController.generateAIQuestions);

// 2. 教師發布/建立測驗
router.post('/', uploadPdf.single('homework_files'), AIQuizController.createQuiz);

// 3. 取得該課程的測驗列表
router.get('/', AIQuizController.getQuizzes);

// 4. 取得單一測驗詳情與題目 (教師檢視或學生作答/觀摩)
router.get('/:quizId', AIQuizController.getQuizDetail);

// 5. 學生提交答案
router.post('/:quizId/answers', AIQuizController.submitAnswers);

// 6. 教師刪除測驗
router.delete('/:quizId', AIQuizController.deleteQuiz);

router.post('/answers/:answerId/comments', AIQuizController.postComment);
export default router;