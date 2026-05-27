import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { playSound } from '../utils/sound';
import { saveToVault } from '../services/vaultService';
import { 
  CartoonAlert, 
  CartoonBot, 
  CartoonCheck, 
  CartoonLock, 
  CartoonGear, 
  CartoonPlus, 
  CartoonTrash,
  CartoonCheck as CartoonCheckIcon
} from './CartoonIcons';

interface Report {
  id: string;
  questionId: string;
  questionText: string;
  questionAnswer?: string;
  problemType: string;
  details: string;
  timestamp: number;
  userId?: string;
}

interface Question {
  id: string;
  text: string;
  answer: string;
  category?: string;
  difficulty?: string;
  points?: number;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isCustom?: boolean;
}

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// Default standard features
const DEFAULT_FEATURES: Feature[] = [
  { id: 'visual_spark', name: 'المؤثرات البصرية الفائقة ✨', description: 'تأثيرات حركية خرافية ولمعان ووميض للأزرار والبطاقات أثناء اللعب', isEnabled: true },
  { id: 'double_chance', name: 'حصانة الإجابة الثانية 🛡️', description: 'يمنح فرصة ثانية عند الخطأ للفرق في نمط السرعة والضغط', isEnabled: false },
  { id: 'ai_hints', name: 'تلميحات الذكاء الفوري 💡', description: 'إضافة زر لطلب تلميح ذكي تم توليده بالذكاء الاصطناعي لتسهيل الإجابة', isEnabled: true },
  { id: 'cartoon_vfx', name: 'الموسيقى والأصوات المفرحة 🎵', description: 'ألحان خلفية تفاعلية ومؤثرات صوتية كرتونية مرحة', isEnabled: true }
];

export const ReportsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'questions' | 'features'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('reports_authorized') === 'true';
  });
  const [error, setError] = useState<string | null>(null);
  
  // Settings Context for changing theme/timing via AI Assistant
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();

  // Reports filters
  const [reportsSearch, setReportsSearch] = useState('');
  const [reportsFilter, setReportsFilter] = useState('الكل');

  // Custom Vault Questions management states
  const [vaultQuestions, setVaultQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQAnswer, setNewQAnswer] = useState('');
  const [newQCategory, setNewQCategory] = useState('عام');
  const [newQDifficulty, setNewQDifficulty] = useState('MEDIUM');
  const [qSearchQuery, setQSearchQuery] = useState('');

  // App Features states
  const [features, setFeatures] = useState<Feature[]>([]);
  const [customFeatureName, setCustomFeatureName] = useState('');
  const [customFeatureDesc, setCustomFeatureDesc] = useState('');
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);

  // AI Assistant States
  const [assistantMessages, setAssistantMessages] = useState<ChatMessage[]>(() => [
    { 
      sender: 'bot', 
      text: 'مرحباً بك في بوابة ومضة الإدارية الذكية! أنا مساعد الوميض الذكي لدعم لوحة التحكم. أخبرني بطلبك وسأقوم بتعديل محتوى وتفضيلات الموقع فوراً (مثال: أضف سؤال فضاء، عطل تلميحات الذكاء...) 🧠✨', 
      timestamp: new Date() 
    }
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const correctPasscode = 'reports2026';

  // Load app features on init
  useEffect(() => {
    const savedFeatures = localStorage.getItem('app_features');
    if (savedFeatures) {
      setFeatures(JSON.parse(savedFeatures));
    } else {
      setFeatures(DEFAULT_FEATURES);
      localStorage.setItem('app_features', JSON.stringify(DEFAULT_FEATURES));
    }
  }, []);

  // Save features helper
  const saveFeaturesList = (updated: Feature[]) => {
    setFeatures(updated);
    localStorage.setItem('app_features', JSON.stringify(updated));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === correctPasscode) {
      playSound('click');
      setIsAuthenticated(true);
      sessionStorage.setItem('reports_authorized', 'true');
      setError(null);
    } else {
      setError('الرمز السري غير صحيح!');
    }
  };

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const reportsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
    } catch (err) {
      console.error("Error fetching reports", err);
      showToast("فشل استدعاء البلاغات", "error");
    } finally {
      setReportsLoading(false);
    }
  };

  // Fetch Questions from custom vault of Logged user
  const fetchVaultQuestions = async () => {
    if (!auth.currentUser) return;
    setQuestionsLoading(true);
    try {
      const q = query(
        collection(db, 'questions_vault'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const questionsData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: d.id,
          text: d.text,
          answer: d.answer,
          category: d.category || d.topic_match || 'عام',
          difficulty: d.difficulty || 'MEDIUM'
        } as Question;
      });
      setVaultQuestions(questionsData);
    } catch (err) {
      console.error("Error fetching questions vault:", err);
      showToast("حدث خطأ أثناء تحميل بنك الأسئلة المخصص.", "error");
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
      fetchVaultQuestions();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages, isAssistantTyping]);

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البلاغ بعد حله؟")) return;
    playSound('click');
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
      showToast("تم حذف البلاغ بنجاح وتصفية السجلات!", "success");
    } catch (err) {
      console.error("Error deleting report:", err);
      showToast("حدث خطأ أثناء حذف البلاغ", "error");
    }
  };

  // Add Question Manually
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim() || !newQAnswer.trim()) {
      showToast("الرجاء ملء حقول السؤال والإجابة!", "warning");
      return;
    }
    
    if (!auth.currentUser) {
      showToast("يجب تسجيل الدخول جماعياً للتحزين السحابي.", "error");
      return;
    }

    playSound('click');
    const tempId = Math.random().toString(36).substr(2, 9);
    const newQuest: any = {
      id: tempId,
      text: newQText,
      answer: newQAnswer,
      category: newQCategory.trim() || 'عام',
      points: 100,
      difficulty: newQDifficulty,
      type: 'OPEN'
    };

    try {
      await saveToVault(newQuest);
      showToast("تم إضافة السؤال إلى بنك أسئلتك السحابي بنجاح!", "success");
      setNewQText('');
      setNewQAnswer('');
      fetchVaultQuestions();
    } catch (err) {
      console.error("Error adding question:", err);
      showToast("فشل حفظ السؤال في السحابة.", "error");
    }
  };

  // Delete Question From Vault
  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السؤال من بنك الأسئلة بالكامل؟")) return;
    playSound('click');
    try {
      await deleteDoc(doc(db, 'questions_vault', qId));
      setVaultQuestions(prev => prev.filter(q => q.id !== qId));
      showToast("تم حذف السؤال من بنك أسئلتك المخصص فوراً!", "success");
    } catch (err) {
      console.error("Error deleting question:", err);
      showToast("فشل حذف السؤال.", "error");
    }
  };

  // Features Interactions
  const handleToggleFeature = (featureId: string) => {
    playSound('click');
    const updated = features.map(feat => {
      if (feat.id === featureId) {
        const nextState = !feat.isEnabled;
        showToast(`تم ${nextState ? 'تفعيل' : 'تعطيل'} ميزة "${feat.name}" بنجاح!`, "success");
        return { ...feat, isEnabled: nextState };
      }
      return feat;
    });
    saveFeaturesList(updated);
  };

  const handleCreateFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeatureName.trim() || !customFeatureDesc.trim()) {
      showToast("يرجى إكمال اسم ووصف الميزة الفريدة!", "warning");
      return;
    }

    playSound('click');
    const newFeat: Feature = {
      id: `custom_${Date.now()}`,
      name: customFeatureName,
      description: customFeatureDesc,
      isEnabled: true,
      isCustom: true
    };

    const updated = [...features, newFeat];
    saveFeaturesList(updated);
    setCustomFeatureName('');
    setCustomFeatureDesc('');
    setShowAddFeatureModal(false);
    showToast(`تم إنشاء الميزة الجديدة "${newFeat.name}" وإضافتها لطبلة الموقع!`, "success");
  };

  const handleDeleteFeature = (featureId: string) => {
    if (!window.confirm("هل تريد حذف هذه الميزة بالكامل من النظام؟")) return;
    playSound('click');
    const updated = features.filter(f => f.id !== featureId);
    saveFeaturesList(updated);
    showToast("تم إزالة وتحييد الميزة بنجاح من الموقع!", "success");
  };

  // AI Assistant Chat Submission and Execution
  const handleAssistantSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!assistantInput.trim()) return;

    const userPrompt = assistantInput.trim();
    setAssistantInput('');
    playSound('click');

    // Add user message to UI
    setAssistantMessages(prev => [...prev, { sender: 'user', text: userPrompt, timestamp: new Date() }]);
    setIsAssistantTyping(true);

    try {
      // Build systemic instruction that mandates return of JSON commands
      const systemInstruction = `أنت المساعد الإداري الذكي والمنسق الفني لمنصة "وميض" للإنتاج الثقافي والمسابقات (Wamda Portal Admin).
مهمتك الرد على طلبات المسؤول وتوليد أوامر برمجية لتغيير مظهر وتفاصيل الموقع والميزات والأسئلة بناءً على رغبته في العربية الفصحى.
يجب أن ترجع ردك بصيغة JSON حصراً بهذا الهيكل بدون علامة تشفير الكود:
{
  "message": "نص الرد العربي الودي والمؤدب والمكثف والواضح الذي يشرح ما قمت به",
  "commands": [
    // قائمة بالأوامر التي طلبت تنفيذها (اتركها فارغة إن لم يطلب تغيير شيء)
  ]
}

القيم المتاحة لمصفوفة الأوامر (commands) هي:
1. إضافة أسئلة جديدة لبنك الأسئلة السحابي الخاص به:
{ "action": "ADD_QUESTIONS", "data": [ { "text": "نص السؤال", "answer": "الإجابة النموذجية", "category": "الفئة", "difficulty": "EASY/MEDIUM/HARD" } ] }

2. تفعيل ميزة موجودة:
{ "action": "ENABLE_FEATURE", "data": { "featureId": "معرف الميزة" } }
ملاحظة: المعرفات المدعومة هي: visual_spark (مؤثرات بصرية)، double_chance (إجابة ثانية)، ai_hints (تلميحات ذكية)، cartoon_vfx (أصوات كرتونية) أو المعرف المخصص المطلوب.

3. تعطيل ميزة:
{ "action": "DISABLE_FEATURE", "data": { "featureId": "معرف الميزة" } }

4. إضافة ميزة مخصصة بالكامل:
{ "action": "ADD_FEATURE", "data": { "name": "اسم الميزة", "description": "وصف مفصل لعملها" } }

5. حذف ميزة بالكامل:
{ "action": "DELETE_FEATURE", "data": { "featureId": "معرف الميزة" } }

6. تغيير الثيم العام للموقع (theme/ألوان):
{ "action": "CHANGE_THEME", "data": { "theme": "colorful" أو "dark" أو "light" } }

7. تغيير زمن تحدي الوقت بالثواني:
{ "action": "CHANGE_DURATION", "data": { "seconds": 60 } }

تأكد من الرد باللغة العربية بأسلوب ذكي، واختصار مع تنفيذ الأوامر بدقة فائقة.`;

      // Call Gemini server proxy with gemini-3.5-flash as recommended inside gemini-api skill
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText: `الطلب هو: "${userPrompt}". يرجى صياغة الاستجابة وفق التوجيه المرفق.`,
          model: 'gemini-3.5-flash',
          systemInstruction: systemInstruction
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed response from server API");
      }

      const rawData = await response.json();
      let assistantResponseText = rawData.text || '';
      
      // Clean up triple backticks if present from AI lazy formatting
      if (assistantResponseText.includes('```json')) {
        assistantResponseText = assistantResponseText.split('```json')[1].split('```')[0].trim();
      } else if (assistantResponseText.includes('```')) {
        assistantResponseText = assistantResponseText.split('```')[1].split('```')[0].trim();
      }

      const parsed = JSON.parse(assistantResponseText);
      const { message, commands } = parsed;

      // Add bot message
      setAssistantMessages(prev => [...prev, { sender: 'bot', text: message, timestamp: new Date() }]);

      // Process and execute any returned instructions in client state!
      if (commands && commands.length > 0) {
        for (const cmd of commands) {
          console.log("Executing Admin AI Command:", cmd);
          
          if (cmd.action === 'ADD_QUESTIONS') {
            if (auth.currentUser && cmd.data && cmd.data.length > 0) {
              for (const q of cmd.data) {
                const tempId = Math.random().toString(36).substr(2, 9);
                await saveToVault({
                  id: tempId,
                  text: q.text,
                  answer: q.answer,
                  category: q.category || 'عام',
                  difficulty: q.difficulty || 'MEDIUM',
                  points: 100,
                  type: 'OPEN'
                } as any);
              }
              showToast(`تم حفظ ${cmd.data.length} سؤال جديد في بنكك السحابي تلقائياً!`, "success");
              fetchVaultQuestions();
            } else {
              showToast("فشل إضافة الأسئلة (المستخدم غير مسجل الدخول)", "error");
            }
          }

          else if (cmd.action === 'ENABLE_FEATURE') {
            const fid = cmd.data.featureId;
            const updated = features.map(f => f.id === fid ? { ...f, isEnabled: true } : f);
            saveFeaturesList(updated);
            showToast(`تم تمكين الميزة: #${fid} بموجب تعليمات الإدارة`, "success");
          }

          else if (cmd.action === 'DISABLE_FEATURE') {
            const fid = cmd.data.featureId;
            const updated = features.map(f => f.id === fid ? { ...f, isEnabled: false } : f);
            saveFeaturesList(updated);
            showToast(`تم إيقاف الميزة: #${fid} بموجب تعليمات الإدارة`, "success");
          }

          else if (cmd.action === 'ADD_FEATURE') {
            const newFeat: Feature = {
              id: `custom_${Date.now()}`,
              name: cmd.data.name,
              description: cmd.data.description,
              isEnabled: true,
              isCustom: true
            };
            const updated = [...features, newFeat];
            saveFeaturesList(updated);
            showToast(`تم ابتكار ميزة جديدة: "${cmd.data.name}"`, "success");
          }

          else if (cmd.action === 'DELETE_FEATURE') {
            const fid = cmd.data.featureId;
            const updated = features.filter(f => f.id !== fid);
            saveFeaturesList(updated);
            showToast(`تم تصفية وإلغاء ميزة: #${fid}`, "success");
          }

          else if (cmd.action === 'CHANGE_THEME') {
            const targetTheme = cmd.data.theme;
            if (['light', 'dark', 'colorful'].includes(targetTheme)) {
              updateSettings({ theme: targetTheme as any });
              showToast(`تم تحويل طابع ألوان الموقع إلى ثيم: ${targetTheme}`, "success");
            }
          }

          else if (cmd.action === 'CHANGE_DURATION') {
            const targetSecs = parseInt(cmd.data.seconds);
            if (targetSecs > 0) {
              updateSettings({ timedDuration: targetSecs });
              showToast(`تم ضبط زمن التحدي إلى ${targetSecs} ثانية`, "success");
            }
          }
        }
      }

    } catch (err: any) {
      console.error("AI assistant execution failure:", err);
      const errMsg = err?.message || '';
      let errorReply = 'عذراً يا فندم، تعذر معالجة طلبك برمجياً. تأكد من صياغة طلبك باللغة العربية بوضوح وسأحاول محاكاته وتنفيذه بالكامل!';
      if (errMsg.includes('key') || errMsg.includes('Key') || errMsg.includes('API_KEY')) {
        errorReply = 'عذراً يا فندم، يبدو أن مفتاح API الخاص بـ Gemini غير مهيأ بعد أو غير صالح. يرجى التأكد من تهيئته في قائمة الإعدادات قبل استخدام المساعد الذكي! 🔑';
      }
      setAssistantMessages(prev => [...prev, { 
        sender: 'bot', 
        text: errorReply, 
        timestamp: new Date() 
      }]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  // Quick prompt presets for AI assistant
  const handlePresetClick = (presetText: string) => {
    setAssistantInput(presetText);
  };

  // Stats for reports
  const totalCount = reports.length;
  const questionErrorCount = reports.filter(r => r.problemType === 'خطأ في السؤال').length;
  const wrongAnswerCount = reports.filter(r => r.problemType === 'إجابة غير صحيحة').length;
  const inappropriateCount = reports.filter(r => r.problemType === 'سؤال غير مناسب').length;
  const otherCount = reports.filter(r => r.problemType === 'أخرى').length;

  const filteredReports = reports.filter(report => {
    const matchesFilter = reportsFilter === 'الكل' || report.problemType === reportsFilter;
    const matchesSearch = 
      report.questionText.toLowerCase().includes(reportsSearch.toLowerCase()) ||
      (report.details && report.details.toLowerCase().includes(reportsSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const filteredQuestions = vaultQuestions.filter(q => 
    q.text.toLowerCase().includes(qSearchQuery.toLowerCase()) ||
    q.answer.toLowerCase().includes(qSearchQuery.toLowerCase()) ||
    (q.category && q.category.toLowerCase().includes(qSearchQuery.toLowerCase()))
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] px-4 py-12 flex flex-col items-center justify-center font-[var(--font-arabic)]">
        <div className="vintage-panel p-8 md:p-12 w-full max-w-md rounded-[2rem] bg-[var(--color-off-white)] border-4 border-black text-center shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <div className="w-16 h-16 bg-red-100 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_black]">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-black mb-4 text-[var(--color-ink-black)] vintage-text">موقع الإدارة والتحكم الذكي</h1>
          <p className="text-sm font-bold text-gray-600 mb-6 font-arabic leading-relaxed">
            مستوى تحكم الإدارة لـ (وميض). أدخل الرمز السري لمراجعة البلاغات، إدارة الأسئلة وحذفها، وتوجيه المساعد الذكي لتعديل الموقع.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="الرمز السري للإدارة"
              id="admin-passcode-input"
              className="w-full p-4 rounded-xl border-4 border-black font-bold text-center text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-2 focus:outline-none focus:ring-4 focus:ring-yellow-400"
            />
            {error && <p className="text-red-500 font-bold text-sm mb-2" id="admin-login-error-msg">{error}</p>}
            <button 
              type="submit"
              id="admin-login-submit-btn"
              className="w-full py-4 rounded-xl bg-[var(--color-primary-green)] text-white font-bold text-lg border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all"
            >
              دخول كمسؤول النظام 🔒
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] p-4 md:p-8 font-[var(--font-arabic)]">
      <div className="max-w-5xl mx-auto bg-[var(--color-off-white)] border-4 border-black rounded-[2rem] p-4 md:p-8 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b-4 border-black pb-6">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="w-16 h-16 bg-[var(--color-primary-gold)] border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_black] text-3xl shrink-0">
              🛡️
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[var(--color-ink-black)] vintage-text">لوحة تحكم المشرف الذكية</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">تعديل بنود وميزات الموقع بمساعدة الذكاء ومراجعة البلاغات</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                playSound('click');
                window.location.pathname = '/';
              }}
              className="px-4 py-2 border-2 border-black rounded-xl bg-cyan-100 hover:bg-cyan-200 transition-colors text-sm font-bold shadow-[2px_2px_0px_black] active:translate-y-0.5"
            >
              الرئيسية 🏠
            </button>
            <button 
              onClick={() => {
                playSound('click');
                setIsAuthenticated(false);
                sessionStorage.removeItem('reports_authorized');
              }}
              id="admin-logout-btn"
              className="px-4 py-2 border-2 border-black rounded-xl bg-red-100 hover:bg-red-200 transition-colors text-sm font-bold shadow-[2px_2px_0px_black] active:translate-y-0.5 text-red-700"
            >
              خروج المشرف 🔒
            </button>
          </div>
        </div>

        {/* Dynamic Category Navigation Tabs */}
        <div className="flex border-4 border-black rounded-2xl overflow-hidden mb-8 shadow-[4px_4px_0px_black] bg-white">
          <button 
            onClick={() => { playSound('click'); setActiveTab('reports'); }}
            className={`flex-1 py-4 font-black text-center border-l-4 border-black transition-all ${activeTab === 'reports' ? 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)]' : 'bg-white hover:bg-gray-100'}`}
          >
            📋 مراجعة البلاغات ({totalCount})
          </button>
          <button 
            onClick={() => { playSound('click'); setActiveTab('questions'); }}
            className={`flex-1 py-4 font-black text-center border-l-4 border-black transition-all ${activeTab === 'questions' ? 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)]' : 'bg-white hover:bg-gray-100'}`}
          >
            🗂️ إدارة بنك الأسئلة ({vaultQuestions.length})
          </button>
          <button 
            onClick={() => { playSound('click'); setActiveTab('features'); }}
            className={`flex-1 py-4 font-black text-center transition-all ${activeTab === 'features' ? 'bg-[var(--color-primary-gold)] text-[var(--color-ink-black)]' : 'bg-white hover:bg-gray-100'}`}
          >
            🧠 المساعد الذكي والميزات الفعالة
          </button>
        </div>

        {/* Tab Content 1: Reports Manager Code */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            {/* Reports stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="p-4 bg-blue-100 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
                <p className="text-xs font-black text-gray-500 mb-1">الكل</p>
                <p className="text-3xl font-black text-blue-700">{totalCount}</p>
              </div>
              <div className="p-4 bg-red-50 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
                <p className="text-xs font-black text-gray-500 mb-1">خطأ في السؤال</p>
                <p className="text-3xl font-black text-red-600">{questionErrorCount}</p>
              </div>
              <div className="p-4 bg-yellow-50 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
                <p className="text-xs font-black text-gray-500 mb-1">إجابة خطأ</p>
                <p className="text-3xl font-black text-yellow-600">{wrongAnswerCount}</p>
              </div>
              <div className="p-4 bg-orange-50 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
                <p className="text-xs font-black text-gray-500 mb-1">سؤال غير مناسب</p>
                <p className="text-3xl font-black text-orange-600">{inappropriateCount}</p>
              </div>
              <div className="col-span-2 md:col-span-1 p-4 bg-gray-100 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
                <p className="text-xs font-black text-gray-500 mb-1">أخرى</p>
                <p className="text-3xl font-black text-gray-700">{otherCount}</p>
              </div>
            </div>

            {/* Filter and Search controls */}
            <div className="p-6 bg-yellow-400/10 border-4 border-black rounded-2xl space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-1/2 relative">
                  <input 
                    type="text"
                    placeholder="البحث بالكلمات في متن الأسئلة أو التفاصيل..."
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                    className="w-full p-2.5 pr-10 border-4 border-black rounded-xl font-bold bg-white focus:outline-none placeholder:text-gray-400 shadow-[2px_2px_0px_black]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {['الكل', 'خطأ في السؤال', 'إجابة غير صحيحة', 'سؤال غير مناسب', 'أخرى'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        playSound('click');
                        setReportsFilter(type);
                      }}
                      className={`px-3 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-colors shadow-[2px_2px_0px_black] active:translate-y-0.5 ${
                        reportsFilter === type ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main List */}
            {reportsLoading ? (
              <div className="text-center py-16 space-y-4">
                <div className="inline-block w-12 h-12 border-8 border-t-black rounded-full animate-spin"></div>
                <p className="font-bold text-lg text-gray-600">جاري سحب البلاغات الحية...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16 bg-white border-4 border-black border-dashed rounded-2xl">
                <span className="text-5xl block mb-4">🎉</span>
                <p className="text-xl font-black text-gray-600">قائمة البلاغات خالية ونظيفة!</p>
                <p className="text-sm text-gray-400 mt-2">لم يبلغ أحد عن أي مشاكل حتى الآن.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredReports.map((report, idx) => {
                  const ringColor = 
                    report.problemType === 'خطأ في السؤال' ? 'border-red-600' :
                    report.problemType === 'إجابة غير صحيحة' ? 'border-yellow-500' :
                    report.problemType === 'سؤال غير مناسب' ? 'border-orange-500' : 'border-black';

                  const badgeBg = 
                    report.problemType === 'خطأ في السؤال' ? 'bg-red-100 text-red-700' :
                    report.problemType === 'إجابة غير صحيحة' ? 'bg-yellow-100 text-yellow-800' :
                    report.problemType === 'سؤال غير مناسب' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700';

                  return (
                    <div 
                      key={report.id} 
                      className={`p-6 bg-white rounded-2xl border-4 ${ringColor} shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-transform`}
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-2 border-b-2 border-dashed border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs opacity-40 font-bold">#{filteredReports.length - idx}</span>
                          <span className={`px-3 py-1 rounded-full border-2 border-black text-xs font-black ${badgeBg}`}>
                            {report.problemType}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          {new Date(report.timestamp).toLocaleString('ar-EG')}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-black text-red-500 block mb-1">❓ متن السؤال المبلغ عنه</span>
                          <p className="text-lg font-black text-[var(--color-ink-black)] leading-relaxed">{report.questionText}</p>
                        </div>

                        {report.questionAnswer && (
                          <div className="p-3 bg-green-50 border-2 border-[var(--color-primary-green)] rounded-xl">
                            <span className="text-xs font-black text-[var(--color-primary-green)] block mb-1">🎯 الإجابة المسجلة</span>
                            <p className="font-bold text-[var(--color-ink-black)] font-mono">{report.questionAnswer}</p>
                          </div>
                        )}
                        
                        {report.details ? (
                          <div className="p-3 bg-gray-50 border-2 border-black rounded-xl">
                            <span className="text-xs font-black text-gray-500 block mb-1">✏️ تفاصيل وملاحظات المشرفين</span>
                            <p className="font-bold text-[var(--color-ink-black)]">{report.details}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">بدون تفاصيل إضافية مضافة.</p>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 gap-4">
                          {report.userId && (
                            <span className="text-xs font-mono text-gray-400">بواسطة: {report.userId.slice(0, 8)}...</span>
                          )}
                          
                          <button 
                            onClick={() => handleDeleteReport(report.id)}
                            className="mr-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl border-4 border-black font-black text-xs shadow-[3px_3px_0px_black] active:translate-y-1 transition-all flex items-center gap-1"
                          >
                            🗑️ تم الحل وحذف البلاغ
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Question Database Management */}
        {activeTab === 'questions' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick add Question manual form */}
            <div className="p-6 bg-white border-4 border-black rounded-[2rem] shadow-[4px_4px_0px_black]">
              <h2 className="text-2xl font-black mb-4 text-[var(--color-ink-black)] flex items-center gap-2">
                <span className="text-3xl">📥</span> إضافة سؤال يدوي لبنك الأسئلة المخصص
              </h2>
              
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-black block mb-1 text-gray-700">متن السؤال</label>
                    <input 
                      type="text"
                      className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none"
                      placeholder="امسح هنا واكتب السؤال المبتكر..."
                      value={newQText}
                      onChange={(e) => setNewQText(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-black block mb-1 text-gray-700">الإجابة النموذجية (بدون ال التعريف للبداية إن وجد)</label>
                    <input 
                      type="text"
                      className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none"
                      placeholder="اكتب الإجابة المفتاحية هنا..."
                      value={newQAnswer}
                      onChange={(e) => setNewQAnswer(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-black block mb-1 text-gray-700">التصنيف أو الفئة الفنية</label>
                    <input 
                      type="text"
                      className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none"
                      placeholder="مثال: تاريخ، جغفرافيا، كرتون، فضائيات"
                      value={newQCategory}
                      onChange={(e) => setNewQCategory(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-black block mb-1 text-gray-700">مستوى الصعوبة</label>
                    <select
                      className="w-full p-3 border-4 border-black font-bold rounded-xl focus:outline-none bg-white"
                      value={newQDifficulty}
                      onChange={(e) => setNewQDifficulty(e.target.value)}
                    >
                      <option value="EASY">سهل</option>
                      <option value="MEDIUM">متوسط / معتاد</option>
                      <option value="HARD">صعب / مميز</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-[var(--color-primary-green)] text-white font-bold text-lg border-4 border-black rounded-xl shadow-[4px_4px_0px_black] active:translate-y-1 transition-all"
                >
                  حفظ وتخزين السؤال سحابياً 💾
                </button>
              </form>
            </div>

            {/* List and Search */}
            <div className="bg-yellow-400/15 border-4 border-black rounded-xl p-4 flex items-center justify-between">
              <div className="relative w-full">
                <input 
                  type="text"
                  placeholder="ابحث ببنك أسئلتك المخصص (بالكلمات أو التصنيفات)..."
                  className="w-full p-2.5 pr-10 border-4 border-black rounded-xl font-bold bg-white"
                  value={qSearchQuery}
                  onChange={(e) => setQSearchQuery(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md">🔍</span>
              </div>
            </div>

            {/* Vault questions lists */}
            {questionsLoading ? (
              <div className="text-center py-12 space-y-3">
                <span className="loading-spinner"></span>
                <p className="font-bold">جاري مراجعة قائمة بنكك السحابي الخاص...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center p-12 bg-white border-4 border-dashed border-black rounded-2xl">
                <span className="text-5xl block mb-2">📥</span>
                <p className="text-lg font-black text-gray-500">بنك الأسئلة المخصص المتطابق فارغ حالياً.</p>
                <p className="text-sm text-gray-400 mt-1">اكتب سؤالاً بالأعلى لحفظه، أو دمر الفلاتر!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuestions.map((q) => (
                  <div key={q.id} className="p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_black] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
                    <div>
                      <div className="flex justify-between items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-yellow-100 border-2 border-black text-xs font-black rounded-lg">
                          {q.category}
                        </span>
                        <span className="text-xs font-bold text-gray-400 font-mono">
                          {q.difficulty === 'EASY' ? '🟢 سهل' : q.difficulty === 'HARD' ? '🔴 صعب' : '🟡 متوسط'}
                        </span>
                      </div>
                      <p className="text-md font-black text-[var(--color-ink-black)] line-clamp-3 mb-2">{q.text}</p>
                      <p className="font-bold text-sm text-[var(--color-primary-green)] bg-green-50/50 p-2 rounded-lg border border-green-200">الإجابة: {q.answer}</p>
                    </div>

                    <div className="border-t-2 border-dashed border-gray-100 pt-3 mt-3 flex justify-end">
                      <button 
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 px-3 bg-red-100 text-red-700 hover:bg-red-200 border-2 border-black text-xs font-bold rounded-lg transition-transform active:scale-95 flex items-center gap-1"
                      >
                        🗑️ حذف السؤال
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Smart AI Assistant chatbot and custom App feature toggles */}
        {activeTab === 'features' && (
          <div className="space-y-8 animate-fade-in">
            {/* Features Settings Desk */}
            <div className="p-6 bg-white border-4 border-black rounded-[2rem] shadow-[4px_4px_0px_black]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-[var(--color-ink-black)] flex items-center gap-2">
                  <span className="text-3xl">⚙️</span> تفعيل وتحرير ميزات ومظهر مسابقة ومضة
                </h2>
                
                <button 
                  onClick={() => { playSound('click'); setShowAddFeatureModal(true); }}
                  className="px-4 py-2 bg-[var(--color-primary-gold)] border-4 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_black] active:translate-y-0.5"
                >
                  ➕ ميزة جديدة مخصصة
                </button>
              </div>

              {/* Dynamic Feature List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feat) => (
                  <div key={feat.id} className="p-4 rounded-2xl border-4 border-black bg-[var(--color-off-white)]/40 hover:bg-white transition-colors relative flex items-start gap-3">
                    <input 
                      type="checkbox"
                      checked={feat.isEnabled}
                      onChange={() => handleToggleFeature(feat.id)}
                      className="w-6 h-6 mt-1 cursor-pointer shrink-0 accent-green-600 rounded-lg border-2 border-black"
                    />
                    <div className="flex-1">
                      <h4 className="font-extrabold text-md text-[var(--color-ink-black)] flex items-center gap-1.5">
                        {feat.name}
                        {feat.isCustom && (
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-300">مخصصة</span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed font-bold">{feat.description}</p>
                    </div>

                    {feat.isCustom && (
                      <button 
                        onClick={() => handleDeleteFeature(feat.id)}
                        className="text-red-600 hover:text-red-700 p-1 shrink-0"
                        title="حذف الميزة"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Assistant chatbot interface */}
            <div className="border-4 border-black rounded-[2rem] bg-indigo-900 text-white shadow-[6px_6px_0px_black] overflow-hidden flex flex-col h-[550px]">
              {/* Chat Title / Head */}
              <div className="bg-indigo-950 p-4 border-b-4 border-black flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--color-primary-gold)] border-2 border-black rounded-xl flex items-center justify-center text-xl shrink-0">
                  <CartoonBot size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg">المساعد الإداري الذكي والتحكم الفوري</h3>
                  <p className="text-xs text-indigo-300 font-bold">يمكنك إضافة الأسئلة، تفعيل الميزات، وتغيير الألوان عبر الحوار الطبيعي!</p>
                </div>
              </div>

              {/* Message Streams */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-900/40">
                {assistantMessages.map((msg, idx) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div key={idx} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-md p-4 rounded-2xl border-2 border-black shadow-[3px_3px_0px_black] ${
                        isBot 
                          ? 'bg-slate-800 text-white rounded-tr-none' 
                          : 'bg-yellow-400 text-black font-extrabold rounded-tl-none'
                      }`}>
                        <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                        <span className="text-[10px] opacity-40 block mt-2 text-left font-mono">
                          {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isAssistantTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-white max-w-sm p-4 rounded-2xl border-2 border-black rounded-tr-none shadow-[3px_3px_0px_black] flex items-center gap-2">
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      <span className="text-xs font-bold text-gray-400">المساعد يقوم بتعديل الموقع...</span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Suggested Presets Tray */}
              <div className="p-3 bg-indigo-950/60 border-t-2 border-dashed border-indigo-800 flex gap-2 overflow-x-auto select-none shrink-0 scrollbar-none">
                {[
                  "أضف 3 أسئلة تاريخية سريعة في التحدي",
                  "تفعيل ميزة الإجابة الثانية وحصانة الخطأ",
                  "تعديل لون وطابع الموقع للنمط الملون",
                  "تعطيل ميزة المؤثرات البصرية الفائقة",
                  "تعديل وقت سباق الوقت لـ 90 ثانية"
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(preset)}
                    className="p-1 px-3 bg-indigo-950/85 hover:bg-yellow-400 hover:text-black hover:border-black border-2 border-indigo-700 text-indigo-200 text-xs font-bold rounded-lg shrink-0 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat form input */}
              <form onSubmit={handleAssistantSend} className="p-4 bg-indigo-950 border-t-4 border-black flex gap-3">
                <input 
                  type="text"
                  placeholder="أدخل وتكتب طلب تعديل الموقع للمساعد الذكي..."
                  className="flex-1 p-3 border-4 border-black bg-white text-black font-black placeholder:text-gray-400 rounded-xl focus:outline-none"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  disabled={isAssistantTyping}
                />
                <button
                  type="submit"
                  disabled={isAssistantTyping || !assistantInput.trim()}
                  className="px-6 py-3 bg-[var(--color-primary-gold)] hover:bg-yellow-400 text-black font-extrabold rounded-xl border-4 border-black shadow-[3px_3px_0px_black] active:translate-y-0.5 transition-transform disabled:opacity-50"
                >
                  إرسال وتطبيق 🚀
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Custom Feature Add Modal */}
      {showAddFeatureModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-off-white)] border-4 border-black rounded-[2rem] p-6 max-w-md w-full shadow-[8px_8px_0px_rgba(0,0,0,1)] text-right relative animate-scale-in">
            <h3 className="text-2xl font-black text-[var(--color-ink-black)] mb-4 vintage-text">ابتكار ميزة تشغيلية جديدة</h3>
            
            <form onSubmit={handleCreateFeature} className="space-y-4">
              <div>
                <label className="text-sm font-black block mb-1 text-gray-700">اسم الميزة</label>
                <input 
                  type="text"
                  className="w-full p-2.5 border-4 border-black rounded-lg font-bold"
                  placeholder="مثال: نمط مروحة الجمهور"
                  value={customFeatureName}
                  onChange={(e) => setCustomFeatureName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-black block mb-1 text-gray-700">وصف عمل الميزة</label>
                <textarea
                  rows={3}
                  className="w-full p-2.5 border-4 border-black rounded-lg font-bold resize-none"
                  placeholder="اكتب وظيفة هذه الميزة في تشغيل اللعبة بالتفصيل..."
                  value={customFeatureDesc}
                  onChange={(e) => setCustomFeatureDesc(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFeatureModal(false)}
                  className="px-4 py-2 border-2 border-black rounded-xl bg-gray-100 font-bold hover:bg-gray-200 transition-colors text-xs"
                >
                  إلغاء ❌
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 border-4 border-black rounded-xl bg-[var(--color-primary-green)] text-white font-black hover:bg-green-600 transition-colors text-xs shadow-[2px_2px_0px_black] active:translate-y-0.5"
                >
                  ابتكار وتشغيل ✨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReportsViewer;
