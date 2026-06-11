import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc, setDoc, where, limit, startAfter } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { useSettings } from '../contexts/SettingsContext';
import { playSound } from '../utils/sound';
import { saveToVault } from '../services/vaultService';
import { QUESTION_BANK } from '../data/localBank';
import { GameMode } from '../types';
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
  source?: 'system' | 'cloud';
  gameMode?: string;
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
  const [activeTab, setActiveTab] = useState<'reports' | 'questions'>('reports');
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
  const [qSourceFilter, setQSourceFilter] = useState<'all' | 'system' | 'cloud'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 50;

  // Flatten all system-integrated questions nicely
  const systemQuestions = React.useMemo(() => {
    const list: Question[] = [];
    Object.entries(QUESTION_BANK).forEach(([mode, qList]) => {
      if (Array.isArray(qList)) {
        qList.forEach((q, idx) => {
          list.push({
            id: q.id || `sys_${mode}_${idx}`,
            text: q.text,
            answer: q.answer,
            category: q.category || 'عام',
            difficulty: (q.difficulty || 'MEDIUM').toUpperCase(),
            source: 'system',
            gameMode: mode
          });
        });
      }
    });
    return list;
  }, []);

  const correctPasscode = 'reports2026';


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

  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMoreCloud, setHasMoreCloud] = useState(true);

  // Fetch Questions from custom vault of Logged user
  const fetchVaultQuestions = async (isLoadMore = false) => {
    if (!auth.currentUser) return;
    setQuestionsLoading(true);
    try {
      let q = query(
        collection(db, 'questions_vault'),
        where('userId', '==', auth.currentUser.uid),
        limit(50)
      );

      if (isLoadMore && lastVisibleDoc) {
        q = query(
          collection(db, 'questions_vault'),
          where('userId', '==', auth.currentUser.uid),
          startAfter(lastVisibleDoc),
          limit(50)
        );
      } else {
        // If not load more, reset visible docs map and state
        setLastVisibleDoc(null);
        setHasMoreCloud(true);
      }

      const snapshot = await getDocs(q);
      const questionsData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: d.id,
          text: d.text,
          answer: d.answer,
          category: d.category || d.topic_match || 'عام',
          difficulty: d.difficulty || 'MEDIUM',
          source: 'cloud'
        } as Question;
      });

      if (snapshot.docs.length > 0) {
        setLastVisibleDoc(snapshot.docs[snapshot.docs.length - 1]);
      }
      
      if (snapshot.docs.length < 50) {
        setHasMoreCloud(false);
      } else {
        setHasMoreCloud(true);
      }

      if (isLoadMore) {
        setVaultQuestions(prev => {
          // Prevent duplicates just in case
          const existingIds = new Set(prev.map(item => item.id));
          const uniques = questionsData.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniques];
        });
      } else {
        setVaultQuestions(questionsData);
      }
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

  // Stats for reports
  const totalCount = reports.length;
  const questionErrorCount = reports.filter(r => r.problemType === 'خطأ في السؤال').length;
  const wrongAnswerCount = reports.filter(r => r.problemType === 'إجابة غير صحيحة').length;
  const inappropriateCount = reports.filter(r => r.problemType === 'سؤال غير مناسب').length;
  const otherCount = reports.filter(r => r.problemType === 'أخرى').length;

  const filteredReports = reports.filter(report => {
    const matchesFilter = reportsFilter === 'الكل' || report.problemType === reportsFilter;
    const matchesSearch = 
      (report.questionText || '').toLowerCase().includes(reportsSearch.toLowerCase()) ||
      (report.details || '').toLowerCase().includes(reportsSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Combine questions based on source filter
  const combinedQuestions = React.useMemo(() => {
    let list: Question[] = [];
    if (qSourceFilter === 'all' || qSourceFilter === 'cloud') {
      list = [...list, ...vaultQuestions];
    }
    if (qSourceFilter === 'all' || qSourceFilter === 'system') {
      list = [...list, ...systemQuestions];
    }
    return list;
  }, [vaultQuestions, systemQuestions, qSourceFilter]);

  // Filter questions by search query
  const filteredQuestions = React.useMemo(() => {
    const queryStr = qSearchQuery.trim().toLowerCase();
    if (!queryStr) return combinedQuestions;
    return combinedQuestions.filter(q => 
      (q.text || '').toLowerCase().includes(queryStr) ||
      (q.answer || '').toLowerCase().includes(queryStr) ||
      (q.category && q.category.toLowerCase().includes(queryStr))
    );
  }, [combinedQuestions, qSearchQuery]);

  // Determine total pages for pagination
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / questionsPerPage));

  // Reset page when filters or queries change to stay in index range
  useEffect(() => {
    setCurrentPage(1);
  }, [qSearchQuery, qSourceFilter]);

  // Slices the current active elements to show based on standard size of 50
  const paginatedQuestions = React.useMemo(() => {
    const start = (currentPage - 1) * questionsPerPage;
    return filteredQuestions.slice(start, start + questionsPerPage);
  }, [filteredQuestions, currentPage]);

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

        {/* Navigation Tabs */}
        <div className="flex border-4 border-black rounded-2xl overflow-hidden mb-8 shadow-[4px_4px_0px_black] bg-white">
          <button 
            onClick={() => { playSound('click'); setActiveTab('reports'); }}
            className={`flex-1 py-4 font-black text-center border-l-4 border-black transition-all ${activeTab === 'reports' ? 'bg-[var(--color-primary-gold)] text-black' : 'bg-white hover:bg-gray-100'}`}
          >
            📋 مراجعة البلاغات ({totalCount})
          </button>
          <button 
            onClick={() => { playSound('click'); setActiveTab('questions'); }}
            className={`flex-1 py-4 font-black text-center transition-all ${activeTab === 'questions' ? 'bg-[var(--color-primary-gold)] text-black' : 'bg-white hover:bg-gray-100'}`}
          >
            🗂️ إدارة بنك الأسئلة ({vaultQuestions.length + systemQuestions.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white/50 rounded-2xl p-4 border-2 border-black border-dashed min-h-[300px]">
          {activeTab === 'reports' ? (
            <div className="space-y-6" key="reports-view">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_black] text-center">
                  <p className="text-xs font-black text-gray-500 mb-1">إجمالي البلاغات</p>
                  <p className="text-2xl font-black text-blue-600">{reports.length}</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_black] text-center">
                  <p className="text-xs font-black text-gray-500 mb-1">أخطاء أسئلة</p>
                  <p className="text-2xl font-black text-red-500">{reports.filter(r => r.problemType === 'خطأ في السؤال').length}</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_black] text-center">
                  <p className="text-xs font-black text-gray-500 mb-1">إجابات خاطئة</p>
                  <p className="text-2xl font-black text-orange-500">{reports.filter(r => r.problemType === 'إجابة غير صحيحة').length}</p>
                </div>
                <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_black] text-center">
                  <p className="text-xs font-black text-gray-500 mb-1">غير مناسب</p>
                  <p className="text-2xl font-black text-purple-500">{reports.filter(r => r.problemType === 'سؤال غير مناسب').length}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <input 
                    type="text"
                    placeholder="ابحث في متن البلاغات أو الأسئلة..."
                    className="w-full p-3 pr-10 border-4 border-black rounded-xl font-bold focus:outline-none bg-white text-black"
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                  {['الكل', 'خطأ في السؤال', 'إجابة غير صحيحة', 'سؤال غير مناسب', 'أخرى'].map((f) => (
                    <button
                      key={f}
                      onClick={() => { playSound('click'); setReportsFilter(f); }}
                      className={`whitespace-nowrap px-4 py-2 border-2 border-black rounded-xl text-sm font-bold shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${reportsFilter === f ? 'bg-[var(--color-primary-gold)] text-black' : 'bg-white hover:bg-gray-50 text-black'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports List */}
              {reportsLoading ? (
                <div className="text-center py-20 bg-white border-4 border-black rounded-2xl">
                  <div className="animate-spin w-12 h-12 border-4 border-t-transparent border-[var(--color-primary-gold)] rounded-full mx-auto mb-4"></div>
                  <p className="font-bold text-black">جاري تحميل البلاغات الجديدة...</p>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-20 bg-white border-4 border-dashed border-black rounded-[2rem]">
                  <span className="text-6xl block mb-4">🎉</span>
                  <p className="text-xl font-black text-gray-500">لا توجد بلاغات حالياً!</p>
                  <p className="text-sm text-gray-400 mt-2">الجمهور سعيد ومستمتع بالأسئلة.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div key={report.id} className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_black] hover:-translate-y-1 transition-all">
                      <div className="p-5">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full border-2 border-black text-xs font-black shadow-[1px_1px_0px_black] ${
                              report.problemType === 'خطأ في السؤال' ? 'bg-red-100 text-red-700 text-black' :
                              report.problemType === 'إجابة غير صحيحة' ? 'bg-orange-100 text-orange-700 text-black' :
                              report.problemType === 'سؤال غير مناسب' ? 'bg-purple-100 text-purple-700 text-black' : 'bg-gray-100 text-gray-700 text-black'
                            }`}>
                              {report.problemType}
                            </span>
                            <span className="text-xs font-bold text-gray-400 font-mono">
                              ID: {report.questionId}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-400">
                            {report.timestamp ? new Date(report.timestamp).toLocaleString('ar-EG') : 'بدون تاريخ'}
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div className="p-4 bg-gray-100 rounded-xl border-2 border-black border-dashed">
                            <p className="text-xs font-black text-gray-400 mb-1 uppercase tracking-wider">نص السؤال المشتكى عليه:</p>
                            <p className="text-md font-black text-gray-800 leading-relaxed capitalize">{report.questionText || 'بدون نص'}</p>
                            {report.questionAnswer && (
                              <p className="text-sm font-bold text-[var(--color-primary-green)] mt-2">الإجابة الحالية: {report.questionAnswer}</p>
                            )}
                          </div>

                          <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                            <p className="text-xs font-black text-yellow-600 mb-1 uppercase tracking-wider">تفاصيل البلاغ:</p>
                            <p className="text-sm font-bold text-gray-700">{report.details || 'لا توجد تفاصيل إضافية.'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 border-t-4 border-black flex flex-wrap justify-end gap-3">
                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="px-4 py-2 bg-red-100 text-red-700 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_black] hover:bg-red-200 transition-all active:translate-y-0.5 flex items-center gap-2"
                        >
                           🗑️ حذف البلاغ (تم الحل)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6" key="questions-view">
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
                        className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none bg-white text-black"
                        placeholder="امسح هنا واكتب السؤال المبتكر..."
                        value={newQText}
                        onChange={(e) => setNewQText(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-black block mb-1 text-gray-700">الإجابة النموذجية (بدون ال التعريف للبداية إن وجد)</label>
                      <input 
                        type="text"
                        className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none bg-white text-black"
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
                        className="w-full p-3 border-4 border-black rounded-xl font-bold focus:outline-none bg-white text-black"
                        placeholder="مثال: تاريخ، جغفرافيا، كرتون، فضائيات"
                        value={newQCategory}
                        onChange={(e) => setNewQCategory(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-black block mb-1 text-gray-700">مستوى الصعوبة</label>
                      <select
                        className="w-full p-3 border-4 border-black font-bold rounded-xl focus:outline-none bg-white text-black"
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
              <div className="bg-yellow-400/15 border-4 border-black rounded-xl p-4 space-y-4">
                <div className="relative w-full">
                  <input 
                    type="text"
                    placeholder="ابحث في بنك الأسئلة بالكلمات أو التصنيفات أو الإجابات..."
                    className="w-full p-3 pr-10 border-4 border-black rounded-xl font-bold bg-white text-black focus:outline-none"
                    value={qSearchQuery}
                    onChange={(e) => setQSearchQuery(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md text-black">🔍</span>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-black/10 pt-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-black text-gray-700">مصدر الأسئلة:</span>
                    <button
                      onClick={() => { playSound('click'); setQSourceFilter('all'); }}
                      className={`px-3 py-1.5 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${qSourceFilter === 'all' ? 'bg-[var(--color-primary-gold)] text-black' : 'bg-white text-black hover:bg-gray-50'}`}
                    >
                      الكل ({vaultQuestions.length + systemQuestions.length})
                    </button>
                    <button
                      onClick={() => { playSound('click'); setQSourceFilter('system'); }}
                      className={`px-3 py-1.5 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${qSourceFilter === 'system' ? 'bg-cyan-100 text-black border-cyan-400' : 'bg-white text-black hover:bg-gray-50'}`}
                    >
                      أسئلة النظام المدمجة ({systemQuestions.length})
                    </button>
                    <button
                      onClick={() => { playSound('click'); setQSourceFilter('cloud'); }}
                      className={`px-3 py-1.5 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${qSourceFilter === 'cloud' ? 'bg-emerald-100 text-black border-emerald-400' : 'bg-white text-black hover:bg-gray-50'}`}
                    >
                      تخزين سحابي مخصص ({vaultQuestions.length})
                    </button>
                  </div>
                  
                  <div className="text-xs font-black text-gray-600">
                    تمت تصفية {filteredQuestions.length} سؤال من أصل {combinedQuestions.length}
                  </div>
                </div>
              </div>

              {/* Vault and System questions list */}
              {questionsLoading ? (
                <div className="text-center py-12 space-y-3 bg-white border-4 border-black rounded-2xl">
                  <div className="animate-spin w-10 h-10 border-4 border-t-transparent border-[var(--color-primary-gold)] rounded-full mx-auto"></div>
                  <p className="font-bold text-black font-arabic">جاري مراجعة قائمة بنك الأسئلة...</p>
                </div>
              ) : (filteredQuestions.length === 0) ? (
                <div className="text-center p-12 bg-white border-4 border-dashed border-black rounded-2xl">
                  <span className="text-5xl block mb-2">📥</span>
                  <p className="text-lg font-black text-gray-500">بنك الأسئلة المتطابق فارغ حالياً.</p>
                  <p className="text-sm text-gray-400 mt-1">امسح الكلمات الدليلة أو غير خيارات التصفية للبحث مجدداً.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedQuestions.map((q) => (
                      <div key={q.id} className="p-4 bg-white border-4 border-black rounded-2xl shadow-[4px_4px_0px_black] flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
                        <div>
                          <div className="flex justify-between items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-yellow-100 border-2 border-black text-xs font-black rounded-lg text-black">
                              {q.category}
                            </span>
                            <span className="text-xs font-bold text-gray-400 font-mono text-black">
                              {q.difficulty === 'EASY' || q.difficulty === 'BEGINNER' ? '🟢 سهل' : q.difficulty === 'HARD' || q.difficulty === 'EXPERT' ? '🔴 صعب' : '🟡 متوسط'}
                            </span>
                          </div>
                          <p className="text-md font-black text-[var(--color-ink-black)] line-clamp-3 mb-2">{q.text}</p>
                          <p className="font-bold text-sm text-[var(--color-primary-green)] bg-green-50/50 p-2 rounded-lg border border-green-200">الإجابة: {q.answer}</p>
                        </div>

                        <div className="border-t-2 border-dashed border-gray-150 pt-3 mt-3 flex justify-between items-center">
                          <span className="text-xs font-black text-gray-500">
                            {q.source === 'system' ? '📦 مدمج بالنظام' : '☁️ سحابي مخصص'}
                          </span>
                          {q.source === 'cloud' ? (
                            <button 
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1 px-3 bg-red-100 text-red-700 hover:bg-red-200 border-2 border-black text-xs font-bold rounded-lg transition-transform active:scale-95 flex items-center gap-1"
                            >
                              🗑️ حذف السؤال
                            </button>
                          ) : (
                            <span className="text-xs text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 select-none">
                              قرائة فقط
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Cloud Questions (Infinite Scroll style) */}
                  {(qSourceFilter === 'all' || qSourceFilter === 'cloud') && hasMoreCloud && (
                    <div className="flex justify-center my-6">
                      <button
                        onClick={() => {
                          playSound('click');
                          fetchVaultQuestions(true);
                        }}
                        id="load-more-cloud-questions-btn"
                        className="px-6 py-4 bg-[var(--color-primary-gold)] text-black border-4 border-black rounded-2xl font-black text-md shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-2 animate-bounce-slow"
                      >
                        🔄 تحميل المزيد من الأسئلة السحابية (التمرير اللانهائي)
                      </button>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between gap-4 bg-white border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_black]">
                      <button
                        onClick={() => {
                          if (currentPage > 1) {
                            playSound('click');
                            setCurrentPage(p => p - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${currentPage === 1 ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-100 text-black'}`}
                      >
                        السابق ⬅️
                      </button>

                      <span className="font-black text-sm text-black">
                        الصفحة {currentPage} من {totalPages}
                      </span>

                      <button
                        onClick={() => {
                          if (currentPage < totalPages) {
                            playSound('click');
                            setCurrentPage(p => p + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_black] transition-all active:translate-y-0.5 ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-100 text-black'}`}
                      >
                        ➡️ التالي
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


      </div>
    </div>
  );
};

export default ReportsViewer;
