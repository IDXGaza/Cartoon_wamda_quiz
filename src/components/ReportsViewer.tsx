import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { playSound } from '../utils/sound';

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

export const ReportsViewer: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('reports_authorized') === 'true';
  });
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('الكل');
  
  const { showToast } = useToast();
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
    setLoading(true);
    try {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const reportsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching reports", error);
      showToast("فشل استدعاء البلاغات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated]);

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البلاغ؟")) return;
    
    playSound('click');
    try {
      await deleteDoc(doc(db, 'reports', reportId));
      setReports(prev => prev.filter(r => r.id !== reportId));
      showToast("تم حذف البلاغ وحل المشكلة بنجاح!", "success");
    } catch (error) {
      console.error("Error deleting report:", error);
      showToast("حدث خطأ أثناء حذف البلاغ", "error");
    }
  };

  // Calculate statistics
  const totalCount = reports.length;
  const questionErrorCount = reports.filter(r => r.problemType === 'خطأ في السؤال').length;
  const wrongAnswerCount = reports.filter(r => r.problemType === 'إجابة غير صحيحة').length;
  const inappropriateCount = reports.filter(r => r.problemType === 'سؤال غير مناسب').length;
  const otherCount = reports.filter(r => r.problemType === 'أخرى').length;

  // Filter and Search logic
  const filteredReports = reports.filter(report => {
    const matchesFilter = selectedFilter === 'الكل' || report.problemType === selectedFilter;
    const matchesSearch = 
      report.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.details && report.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] px-4 py-12 flex flex-col items-center justify-center font-[var(--font-arabic)]">
        <div className="vintage-panel p-8 md:p-12 w-full max-w-md rounded-[2rem] bg-[var(--color-off-white)] border-4 border-black text-center shadow-[8px_8px_0px_rgba(0,0,0,1)]">
          <div className="w-16 h-16 bg-red-100 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[2px_2px_0px_black]">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-black mb-4 text-[var(--color-ink-black)] vintage-text">صفحة البلاغات الحصريّة</h1>
          <p className="text-sm font-bold text-gray-600 mb-6 font-arabic leading-relaxed">
            منطقة الإدارة والتحكم لمراجعة البلاغات. الرجاء إدخال الرمز السري للاستمرار.
          </p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="الرمز السري للإدارة"
              className="w-full p-4 rounded-xl border-4 border-black font-bold text-center text-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-2 focus:outline-none focus:ring-4 focus:ring-yellow-400"
            />
            {error && <p className="text-red-500 font-bold text-sm mb-2">{error}</p>}
            <button 
              type="submit"
              className="w-full py-4 rounded-xl bg-[var(--color-primary-green)] text-white font-bold text-lg border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 active:translate-y-1 transition-all"
            >
              دخول للوحة التحكم
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] p-4 md:p-8 font-[var(--font-arabic)]">
      <div className="max-w-5xl mx-auto bg-[var(--color-off-white)] border-4 border-black rounded-[2rem] p-6 md:p-10 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b-4 border-black pb-6">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="w-16 h-16 bg-[var(--color-primary-gold)] border-4 border-black rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_black] text-3xl shrink-0">
              📋
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[var(--color-ink-black)] vintage-text">لوحة التحكم بالبلاغات</h1>
              <p className="text-sm font-bold text-gray-500 mt-1">تعديل ومراجعة الأسئلة التالفة والمبلغ عنها</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={fetchReports}
              disabled={loading}
              className="px-4 py-2 border-2 border-black rounded-xl bg-orange-100 hover:bg-orange-200 transition-colors text-sm font-bold shadow-[2px_2px_0px_black] active:translate-y-0.5"
            >
              {loading ? 'جاري التحديث...' : 'تحديث 🔄'}
            </button>
            <button 
              onClick={() => {
                playSound('click');
                setIsAuthenticated(false);
                sessionStorage.removeItem('reports_authorized');
              }}
              className="px-4 py-2 border-2 border-black rounded-xl bg-red-100 hover:bg-red-200 transition-colors text-sm font-bold shadow-[2px_2px_0px_black] active:translate-y-0.5 text-red-700"
            >
              تسجيل خروج 🔒
            </button>
          </div>
        </div>

        {/* Dynamic Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
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
            <p className="text-xs font-black text-gray-500 mb-1">سؤال تالف</p>
            <p className="text-3xl font-black text-orange-600">{inappropriateCount}</p>
          </div>
          <div className="col-span-2 md:col-span-1 p-4 bg-gray-100 border-4 border-black rounded-2xl text-center shadow-[3px_3px_0px_black]">
            <p className="text-xs font-black text-gray-500 mb-1">أخرى</p>
            <p className="text-3xl font-black text-gray-700">{otherCount}</p>
          </div>
        </div>

        {/* Filter and Search controls */}
        <div className="p-6 bg-yellow-400/10 border-4 border-black rounded-2xl mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="w-full md:w-1/2 relative">
              <input 
                type="text"
                placeholder="البحث بالكلمات في متن الأسئلة أو التفاصيل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 pr-10 border-4 border-black rounded-xl font-bold bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder:text-gray-400 shadow-[2px_2px_0px_black]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            </div>

            {/* Filter Pill tabs */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {['الكل', 'خطأ في السؤال', 'إجابة غير صحيحة', 'سؤال غير مناسب', 'أخرى'].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    playSound('click');
                    setSelectedFilter(type);
                  }}
                  className={`px-3 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-colors shadow-[2px_2px_0px_black] active:translate-y-0.5 ${
                    selectedFilter === type 
                      ? 'bg-black text-white' 
                      : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main List */}
        {loading ? (
          <div className="text-center py-16 space-y-4">
            <div className="inline-block w-12 h-12 border-8 border-[var(--color-bg-dark)]/15 border-t-black rounded-full animate-spin"></div>
            <p className="font-bold text-lg text-gray-600">جاري سحب البلاغات...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16 bg-white border-4 border-black border-dashed rounded-2xl">
            <span className="text-5xl block mb-4">🎉</span>
            <p className="text-xl font-black text-gray-600">قائمة نظيفة وممتازة!</p>
            <p className="text-sm text-gray-400 mt-2">لا توجد بلاغات تماثل شروط البحث حالياً.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredReports.map((report, idx) => {
              // Card styles depending on problemType
              const ringColor = 
                report.problemType === 'خطأ في السؤال' ? 'border-red-600' :
                report.problemType === 'إجابة غير صحيحة' ? 'border-yellow-500' :
                report.problemType === 'سؤال غير مناسب' ? 'border-orange-500' :
                'border-black';

              const badgeBg = 
                report.problemType === 'خطأ في السؤال' ? 'bg-red-100 text-red-700' :
                report.problemType === 'إجابة غير صحيحة' ? 'bg-yellow-100 text-yellow-800' :
                report.problemType === 'سؤال غير مناسب' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700';

              return (
                <div 
                  key={report.id} 
                  className={`p-6 bg-white rounded-2xl border-4 ${ringColor} shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-transform`}
                >
                  {/* Card head metadata */}
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
                  
                  {/* Content details */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-black text-red-500 block mb-1">❓ متن السؤال المبلغ عنه</span>
                      <p className="text-lg font-black text-[var(--color-ink-black)] leading-relaxed">
                        {report.questionText}
                      </p>
                    </div>

                    {report.questionAnswer && (
                      <div className="p-3 bg-green-50 border-2 border-[var(--color-primary-green)] rounded-xl">
                        <span className="text-xs font-black text-[var(--color-primary-green)] block mb-1">🎯 الإجابة المسجلة في بنك الأسئلة</span>
                        <p className="font-bold text-[var(--color-ink-black)] font-mono">{report.questionAnswer}</p>
                      </div>
                    )}
                    
                    {report.details ? (
                      <div className="p-4 bg-gray-50 border-2 border-black rounded-xl">
                        <span className="text-xs font-black text-gray-500 block mb-1">✏️ تفاصيل البلاغ والملاحظات المكتوبة</span>
                        <p className="font-bold text-[var(--color-ink-black)]">{report.details}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">بدون تفاصيل إضافية مضافة.</p>
                    )}
                    
                    {/* Action Panel */}
                    <div className="flex justify-between items-center pt-2 gap-4">
                      {report.userId && (
                        <span className="text-xs font-mono text-gray-400">
                          بواسطة: {report.userId.slice(0, 8)}...
                        </span>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteReport(report.id)}
                        className="mr-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl border-4 border-black font-black text-xs shadow-[3px_3px_0px_black] hover:translate-y-[1px] active:translate-y-[2px] transition-all flex items-center gap-1"
                      >
                        🗑️ تم الحل / حذف البلاغ
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsViewer;
