import React, { useState } from 'react';
import { Question } from '../types';
import { auth, db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useToast } from '../contexts/ToastContext';
import { CartoonAlert, CartoonX } from './CartoonIcons';
import { playSound } from '../utils/sound';

interface Props {
  question: Question;
  onClose: () => void;
}

export const ReportScreen: React.FC<Props> = ({ question, onClose }) => {
  const [problemType, setProblemType] = useState('خطأ في السؤال');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    playSound('click');
    
    const reportId = `report-${Date.now()}`;
    
    try {
      await setDoc(doc(db, 'reports', reportId), {
        questionId: question.id,
        questionText: question.text,
        questionAnswer: question.answer,
        problemType,
        details,
        userId: auth.currentUser.uid,
        timestamp: Date.now()
      });
      showToast("تم إرسال بلاغك بنجاح. شكراً لك!", "success");
      onClose();
    } catch (err) {
      console.error("Error reporting question", err);
      showToast("حدث خطأ أثناء إرسال البلاغ", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
      <div className="vintage-panel p-8 md:p-12 w-full max-w-lg rounded-[2rem] bg-[var(--color-off-white)]">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold vintage-text">إبلاغ عن سؤال</h2>
          <button onClick={onClose}><CartoonX size={24} /></button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2">نوع المشكلة</label>
            <select 
              value={problemType} 
              onChange={(e) => setProblemType(e.target.value)}
              className="w-full p-4 rounded-xl border-4 border-black font-bold"
            >
              <option>خطأ في السؤال</option>
              <option>إجابة غير صحيحة</option>
              <option>سؤال غير مناسب</option>
              <option>أخرى</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2">تفاصيل إضافية</label>
            <textarea 
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full p-4 rounded-xl border-4 border-black font-bold h-32"
              placeholder="اكتب تفاصيل المشكلة هنا..."
            />
          </div>
          
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-lg border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all text-center"
            >
              إلغاء
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-xl bg-[var(--color-primary-green)] text-white font-bold text-lg border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] disabled:opacity-50 active:translate-y-0.5 transition-all text-center"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportScreen;
