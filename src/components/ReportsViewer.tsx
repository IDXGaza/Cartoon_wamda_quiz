import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface Report {
  id: string;
  questionText: string;
  problemType: string;
  details: string;
  timestamp: number;
}

export const ReportsViewer: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
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
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="p-8 text-center">جاري تحميل البلاغات...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">البلاغات المستلمة</h1>
      {reports.length === 0 ? (
        <p>لا توجد بلاغات حالياً.</p>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="p-6 bg-white rounded-xl border-4 border-black">
              <h3 className="font-bold text-lg">{report.problemType}</h3>
              <p className="text-sm opacity-70 mb-2">{new Date(report.timestamp).toLocaleString()}</p>
              <p className="font-bold underline mb-2">السؤال: {report.questionText}</p>
              <p>{report.details || 'لا توجد تفاصيل إضافية.'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsViewer;
