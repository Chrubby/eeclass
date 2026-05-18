import { AIQuizModel } from '../models/AiQuizModel.js';
import { OpenAiHelper } from '../utils/openaiHelper.js';
import { PdfHelper } from '../utils/pdfHelper.js';
import { v4 as uuidv4 } from 'uuid';

export const AIQuizService = {
    /**
     * 解析 PDF 並透過 OpenAI 產生測驗題目
     */
    async generateQuestionsFromPdf(filePath, count) {
        // 1. 擷取 PDF 文字 (使用你提供的 PdfHelper)
        const pdfText = await PdfHelper.extractText(filePath, 20);
        
        if (!pdfText || pdfText.trim() === '') {
            throw new Error('無法從 PDF 擷取到文字，請確認檔案內容');
        }

        // 2. 組裝給 OpenAI 的 Prompt
        const prompt = `
            你是一個專業的教育助理。請閱讀以下教材內容，並為學生出 ${count} 道簡答思考題。
            請以 JSON 格式回傳，必須嚴格符合以下結構：
            {
              "questions": [
                {
                  "questionText": "題目內容...",
                  "discussionPrompt": "請填寫適合此題 AI 回饋設定，包含對學生回覆的評判標準與引導方式"
                }
              ]
            }
            
            教材內容：
            ${pdfText}
        `;

        // 3. 呼叫 OpenAI API (使用你提供的 OpenAiHelper)
        const responseText = await OpenAiHelper.chat([
            { role: "system", content: "你是一個嚴格輸出 JSON 格式的教育 API。" },
            { role: "user", content: prompt }
        ], { jsonMode: true });

        // 4. 解析結果並回傳
        const result = JSON.parse(responseText);
        return result.questions;
    },

    /**
     * 建立新測驗
     */
    async createQuiz(quizData, questions) {
        return await AIQuizModel.createQuizWithQuestions(quizData, questions);
    },

    /**
     * 取得課程的測驗列表
     */
    async getQuizList(courseId) {
        return await AIQuizModel.getQuizzesByCourse(courseId);
    },

    /**
     * 取得測驗詳情：確保回傳該學生的「我的作答」與「AI 評論」
     */
    async getQuizDetail(quizId, userRole, studentId) {
        const quiz = await AIQuizModel.getQuizById(quizId);
        if (!quiz) throw new Error('找不到該測驗');

        // 取得當前使用者的作答紀錄 (用於學生視角判斷是否已提交)
        const myAnswers = await AIQuizModel.getStudentAnswersForQuiz(quizId, studentId);
        const myAnswerMap = Object.fromEntries(myAnswers.map(a => [a.questionId, a]));

        for (let q of quiz.questions) {
            // 基礎資料：我的作答
            q.myAnswer = myAnswerMap[q.id] || null;

            if (userRole === 'teacher' || userRole === 'ta') {
                // ✨ 老師/助教：獲取所有人的答案，包含 AI 回覆
                // 我們呼叫 Model 取得所有欄位 (包含 aiFeedback)
                q.allAnswers = await AIQuizModel.getAllAnswersByQuestion(q.id);
            } else {
                // 學生：如果自己交了，就可以看別人的
                if (q.myAnswer) {
                    // ✨ 修改點：讓 peerAnswers 也包含 aiFeedback
                    // 注意：Model 裡的 getPeerAnswers 也要確保有 SELECT aiFeedback 欄位
                    q.peerAnswers = await AIQuizModel.getPeerAnswers(q.id, studentId);
                } else {
                    q.peerAnswers = [];
                }
            }
        }
        return quiz;
    },

    /**
     * 學生提交測驗答案：即時產生 AI 評論並儲存
     */
    async submitStudentAnswers(quizId, studentId, studentName, answers) {
        const quiz = await AIQuizModel.getQuizById(quizId);
        
        for (const [questionId, answerText] of Object.entries(answers)) {
            if (!answerText || answerText.trim() === '') continue;

            // 1. 找出該題目的討論引導 Prompt
            const question = quiz.questions.find(q => q.id === questionId);
            const discussionPrompt = question?.discussionPrompt || "請對學生的回答給予一般性回饋。";

            // 2. 呼叫 OpenAI 產生即時評論
            const aiFeedback = await OpenAiHelper.chat([
                { 
                    role: "system", 
                    content: `你是一位教學助教。請根據老師提供的【引導設定】來回覆學生的回答。
                             老師的引導設定為：${discussionPrompt}` 
                },
                { role: "user", content: `學生的回答是：${answerText}\n\n請根據上述設定給予學生回饋。` }
            ]);

            // 3. 儲存作答與 AI 評論
            await AIQuizModel.saveStudentAnswer(questionId, studentId, studentName, answerText, aiFeedback);
        }
        return true;
    },
    
    /**
     * 刪除測驗
     */
    async deleteQuiz(quizId) {
        return await AIQuizModel.deleteQuiz(quizId);
    },

    async getQuizDetail(quizId, userRole, studentId) {
        const quiz = await AIQuizModel.getQuizById(quizId);
        if (!quiz) throw new Error('找不到該測驗');

        const myAnswers = await AIQuizModel.getStudentAnswersForQuiz(quizId, studentId);
        const myAnswerMap = Object.fromEntries(myAnswers.map(a => [a.questionId, a]));

        const processAnswers = async (answers) => {
            for (let ans of answers) {
                // 抓取該答案下的所有留言
                const rawComments = await AIQuizModel.getCommentsByAnswer(ans.id);
                // 轉換成巢狀結構 (樹狀)
                ans.comments = this.buildCommentTree(rawComments);
            }
            return answers;
        };

        for (let q of quiz.questions) {
            q.myAnswer = myAnswerMap[q.id] || null;
            if (q.myAnswer) await processAnswers([q.myAnswer]);

            if (userRole === 'teacher' || userRole === 'ta') {
                q.allAnswers = await AIQuizModel.getAllAnswersByQuestion(q.id);
                await processAnswers(q.allAnswers);
            } else if (q.myAnswer) {
                q.peerAnswers = await AIQuizModel.getPeerAnswers(q.id, studentId);
                await processAnswers(q.peerAnswers);
            }
        }
        return quiz;
    },

    // 輔助方法：建立留言樹
    buildCommentTree(comments) {
        const map = {};
        const tree = [];
        comments.forEach(c => {
            map[c.id] = { ...c, children: [] };
        });
        comments.forEach(c => {
            if (c.parentId && map[c.parentId]) {
                map[c.parentId].children.push(map[c.id]);
            } else {
                tree.push(map[c.id]);
            }
        });
        return tree;
    },

    async addComment(commentData) {
        const data = {
            id: uuidv4(),
            ...commentData
        };
        return await AIQuizModel.saveComment(data);
    }
};