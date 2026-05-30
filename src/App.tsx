
import React, { useState, useEffect } from 'react';
import { GameConfig, Player, Question, GameMode, QuestionType, Difficulty } from './types';
import { 
  CartoonStar, 
  CartoonGear, 
  CartoonBook, 
  CartoonHome, 
  CartoonAlert, 
  CartoonLock, 
  CartoonRocket,
  CartoonRefresh,
  CartoonX,
  CartoonBot,
  CartoonSparkles,
  CartoonEye
} from './components/CartoonIcons';
import { motion, AnimatePresence } from 'motion/react';
import ConfigScreen from './components/ConfigScreen';
import GameScreen from './components/GameScreen';
import SummaryScreen from './components/SummaryScreen';
import RemoteBuzzer from './components/RemoteBuzzer';
import SettingsModal from './components/SettingsModal';
import ReportScreen from './components/ReportScreen';
import ReportsViewer from './components/ReportsViewer';
import BankManager from './components/BankManager';
// import GuideScreen from './components/GuideScreen';
import { useSettings } from './contexts/SettingsContext';
import { useToast } from './contexts/ToastContext';
import { playSound } from './utils/sound';
import { toggleFullScreen } from './utils/fullscreen';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [currentPath] = useState(window.location.pathname);
  const [gameState, setGameState] = useState<'config' | 'loading' | 'playing' | 'summary' | 'remote' | 'remote-taboo' | 'error' | 'bank' | 'report'>('config');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [reportedQuestion, setReportedQuestion] = useState<Question | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDebug, setShowDebug] = useState(false);
  const { settings, setIsSettingsOpen } = useSettings();
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      showToast("أنت الآن تعمل بدون إنترنت. سيتم استخدام بنك الأسئلة المحلي.", "warning");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const initializeFirebase = async () => {
      setAuthError(null);
      
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          try {
            await signInAnonymously(auth);
            // After sign in, onAuthStateChanged will fire again with the user
          } catch (error: any) {
            console.error("Auth Error:", error);
            if (error.code === 'auth/admin-restricted-operation') {
              setAuthError("عذراً، ميزة اللعب عن بُعد (Remote Buzzer) معطلة لأن 'Anonymous Authentication' غير مفعل في Firebase.");
            } else if (error.code === 'auth/network-request-failed') {
              setAuthError("فشل الاتصال بخوادم التحقق. يرجى التأكد من اتصالك بالإنترنت أو عدم وجود جدار حماية يمنع الاتصال.");
            } else {
              setAuthError(error.message);
            }
            setIsAuthReady(true);
          }
        } else {
          setIsAuthReady(true);
          setAuthError(null);
          // Only test connectivity once auth is confirmed
          await testConnection();
        }
      });
      
      return unsubscribe;
    };

    const cleanupPromise = initializeFirebase();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanupPromise.then(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
      });
    };
  }, []);

  const testConnection = async () => {
    const path = '_connectivity_test_/ping';
    try {
      const { getDocFromServer, doc } = await import('firebase/firestore');
      // We use a timeout to avoid hanging indefinitely if the connection is really stuck
      const loadPromise = getDocFromServer(doc(db, '_connectivity_test_', 'ping'));
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      
      await Promise.race([loadPromise, timeoutPromise]);
      console.log("Firebase connection successful");
      setIsFirestoreOffline(false);
    } catch (error: any) {
      console.error("Firebase connection test failed:", error);
      
      // Still set offline for timeout/unavailable
      if (error.message === 'timeout' || error.code === 'unavailable') {
        setIsFirestoreOffline(true);
      } else if (error.message?.includes('permission') || error.code === 'permission-denied') {
        // Permission denied on ping might be normal depending on rules
        console.log("Connected to Firebase (Permission restricted on ping)");
        setIsFirestoreOffline(false);
      } else {
        setIsFirestoreOffline(true);
        // Use the handler for reporting
        const { handleFirestoreError, OperationType } = await import('./lib/firestoreUtils');
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (reportError) {
          // just ignore re-thrown error here after logging
        }
      }
    }
  };

  const handleRetryAuth = () => {
    setIsAuthReady(false);
    setAuthError(null);
    signInAnonymously(auth).catch((error: any) => {
      if (error.code === 'auth/admin-restricted-operation') {
        setAuthError("عذراً، ميزة اللعب عن بُعد (Remote Buzzer) معطلة لأن 'Anonymous Authentication' غير مفعل في Firebase.");
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError("فشل الاتصال بخوادم التحقق. يرجى التأكد من اتصالك بالإنترنت أو عدم وجود جدار حماية يمنع الاتصال.");
      } else {
        setAuthError(error.message);
      }
      setIsAuthReady(true);
    });
  };

  useEffect(() => {
    const checkParams = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
      
      const isRemote = searchParams.get('mode') === 'remote' || hashParams.get('mode') === 'remote';
      const isRemoteTaboo = searchParams.get('mode') === 'taboo' || hashParams.get('mode') === 'taboo';
      
      if (isRemote) {
        console.log("Remote mode detected from URL params");
        setGameState('remote');
      } else if (isRemoteTaboo) {
        console.log("Remote Taboo mode detected from URL params");
        setGameState('remote-taboo');
      }
    };
    
    checkParams();
    window.addEventListener('hashchange', checkParams);
    window.addEventListener('popstate', checkParams);
    
    // Also check periodically for a few seconds in case of slow URL updates
    const interval = setInterval(checkParams, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    
    return () => {
      window.removeEventListener('hashchange', checkParams);
      window.removeEventListener('popstate', checkParams);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handleStartGame = async (newConfig: GameConfig) => {
    setConfig({ ...newConfig, sessionId });
    setPlayers(newConfig.players);
    setGameState('loading');
    setErrorMessage('');
    
    try {
      if (!auth.currentUser) {
        showToast("يجب تسجيل الدخول أولاً للبدء.", "info");
        await signInAnonymously(auth);
      }
      
      // Load history
      let excludedItemsSet = new Set<string>();
      try {
        const data = localStorage.getItem('gemini_quiz_question_history');
        if (data) {
          const history: string[][] = JSON.parse(data);
          excludedItemsSet = new Set(history.flat().map(i => i.trim().toLowerCase()));
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }

      if (newConfig.mode === GameMode.HEX_GRID && newConfig.hexMode === 'manual') {
        setQuestions([]);
        setGameState('playing');
        return;
      }

      if (newConfig.manualQuestions && newConfig.manualQuestions.length > 0) {
        setQuestions(newConfig.manualQuestions);
        setGameState('playing');
        return;
      }

      // Use bank source
      const requiredCount = newConfig.mode === GameMode.HEX_GRID ? 28 : (newConfig.mode === GameMode.GRID ? 25 : newConfig.numQuestions);
      const topicToUse = newConfig.topic || 'عام';
      
      let generated: Question[] = [];
      if (newConfig.manualQuestions && newConfig.manualQuestions.length > 0) {
        generated = newConfig.manualQuestions;
      } else {
        const { getQuestionsFromBank } = await import('./services/geminiService');
        generated = await getQuestionsFromBank(topicToUse, requiredCount, newConfig.mode, newConfig.difficulty, Array.from(excludedItemsSet), newConfig.categories);
      }
      
      // Final shuffle ONLY if not in GRID mode to preserve category/point ordering
      if (newConfig.mode !== GameMode.GRID) {
        generated = [...generated].sort(() => Math.random() - 0.5);
      }
      
      setQuestions(generated);
      setGameState('playing');
      
      // Save to persistent history
      try {
        const newTags = generated.flatMap(q => [q.text, q.answer, q.id]).filter(Boolean);
        if (newTags.length > 0) {
          const data = localStorage.getItem('gemini_quiz_question_history');
          let history: string[][] = data ? JSON.parse(data) : [];
          history.unshift(newTags);
          if (history.length > 50) history = history.slice(0, 50); 
          localStorage.setItem('gemini_quiz_question_history', JSON.stringify(history));
        }
      } catch (e) {}
      
    } catch (error: any) {
      console.error("Game Start Error:", error);
      showToast(error.message || "حدث خطأ غير متوقع أثناء تجهيز الأسئلة.", 'error');
      setGameState('config');
    }
  };

  const handleFinishGame = (finalPlayers: Player[]) => {
    setPlayers(finalPlayers);
    setGameState('summary');
  };

  const handleReset = () => {
    setGameState('config');
    setQuestions([]);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen text-[var(--color-ink-black)] font-[var(--font-arabic)] overflow-x-hidden relative">
      {currentPath === '/reports' ? <ReportsViewer /> : (
        <>
          {/* Debug Trigger */}
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="fixed bottom-2 left-2 z-[100] opacity-20 hover:opacity-100 text-[8px] bg-black text-white p-1 rounded"
          >
            DEBUG
          </button>

      {showDebug && (
        <div className="fixed inset-0 z-[100] bg-black/90 p-6 overflow-auto text-xs font-mono text-green-400 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-2xl border-4 border-green-500 max-w-lg w-full shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            <h3 className="text-xl font-bold mb-4 text-green-500 border-b border-green-500 pb-2">معلومات التشخيص (Diagnostic Info)</h3>
            <div className="space-y-2">
              <p><span className="text-gray-500">URL:</span> {window.location.href}</p>
              <p><span className="text-gray-500">Auth Ready:</span> {isAuthReady ? "YES" : "NO"}</p>
              <p><span className="text-gray-500">User ID:</span> {auth.currentUser?.uid || "NONE"}</p>
              <p><span className="text-gray-500">Auth Error:</span> {authError || "NONE"}</p>
              <p><span className="text-gray-500">Game State:</span> {gameState}</p>
              <p><span className="text-gray-500">Firestore Offline:</span> {isFirestoreOffline ? "YES" : "NO"}</p>
            </div>
            <button onClick={() => setShowDebug(false)} className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">إغلاق</button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-0 halftone-bg"></div>
      <SettingsModal />
      
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="bg-[var(--color-primary-gold)] text-[var(--color-ink-black)] text-center py-2 px-4 shadow-lg border-b-2 border-black flex items-center justify-center gap-2 sticky top-0 z-[110]"
          >
            <CartoonAlert size={18} />
            <span className="font-bold text-sm">وضع عدم الاتصال بالإنترنت مفعل - اللعبة تعمل من بنك الأسئلة المحلي</span>
          </motion.div>
        )}
        {isFirestoreOffline && isOnline && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="bg-[var(--color-primary-red)] text-[var(--color-off-white)] text-center py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 sticky top-0 z-[100] border-b-4 border-[var(--color-ink-black)]"
          >
            <CartoonAlert size={20} />
            <span>قاعدة البيانات غير متصلة. بعض الميزات قد لا تعمل بشكل صحيح.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState !== 'remote' && (
        <header className="vintage-panel sticky top-0 z-50 relative border-x-0 border-t-0 rounded-none">
          <div className="max-w-7xl mx-auto px-2 py-2 md:px-6 md:py-4 flex justify-between items-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-4 cursor-pointer group" 
              onClick={() => {
                playSound('click');
                handleReset();
              }}
            >
              <div className="w-10 h-10 md:w-14 md:h-14 bg-[var(--color-primary-gold)] rounded-xl flex items-center justify-center text-[var(--color-ink-black)] border-2 md:border-4 border-[var(--color-ink-black)] group-hover:rotate-12 transition-transform shadow-[2px_2px_0px_var(--color-ink-black)] md:shadow-[4px_4px_0px_var(--color-ink-black)]">
                <CartoonRocket size={24} className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-3xl font-bold text-[var(--color-ink-black)] leading-none vintage-text">ومضة</h1>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-1 md:gap-3">
              {gameState !== 'config' && gameState !== 'loading' && gameState !== 'library' && gameState !== 'start' && (
                <button 
                  onClick={() => {
                    playSound('click');
                    handleReset();
                  }} 
                  className="vintage-button bg-[var(--color-primary-red)] text-white px-2 py-2 md:px-6 md:py-3 rounded-xl text-xs md:text-md flex items-center gap-1 md:gap-3"
                >
                  <CartoonX size={16} className="w-4 h-4 md:w-6 md:h-6" /> <span className="hidden md:inline">إلغاء</span>
                </button>
              )}
              {gameState === 'config' && (
                <div className="flex items-center gap-2">
                </div>
              )}
              <button 
                onClick={() => {
                  playSound('click');
                  toggleFullScreen();
                }} 
                className="vintage-button w-9 h-9 md:w-18 md:h-18 flex items-center justify-center rounded-xl md:rounded-2xl shrink-0"
                title="ملء الشاشة"
              >
                <CartoonEye size={20} className="w-5 h-5 md:w-11 md:h-11" />
              </button>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsSettingsOpen(true);
                }} 
                className="vintage-button w-9 h-9 md:w-18 md:h-18 flex items-center justify-center rounded-xl md:rounded-2xl shrink-0"
                title="الإعدادات"
              >
                <CartoonGear size={20} className="w-5 h-5 md:w-11 md:h-11 animate-spin-slow" />
              </button>
              {/* 
              <button                
                onClick={() => {                
                  playSound('click');                
                  setGameState('guide');
                }}                
                className="vintage-button w-9 h-9 md:w-18 md:h-18 flex items-center justify-center rounded-xl md:rounded-2xl bg-[var(--color-primary-gold)] shrink-0"                
                title="دليل اللعب"
              >                
                <CartoonBook size={20} className="md:w-[44px] md:h-[44px]" />
              </button>
              */}
            </div>
          </div>
        </header>
      )}

      <main className={`${gameState === 'remote' ? 'w-full h-full' : 'container mx-auto px-2 md:px-4 pt-2 pb-2 md:pt-8 md:pb-12 max-w-7xl'} relative z-10`}>
        <AnimatePresence mode="wait">
          {!isAuthReady ? (
            <motion.div 
              key="initializing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32"
            >
              <div className="relative">
                <div className="w-24 h-24 border-8 border-[var(--color-bg-dark)]/10 rounded-full"></div>
                <div className="w-24 h-24 border-8 border-[var(--color-primary-red)] rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <CartoonGear size={40} className="animate-spin-slow" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-ink-black)] mt-8 vintage-text">جاري تجهيز النظام...</h2>
              <p className="text-[var(--color-bg-dark)] font-bold mt-2">نحن نجهز لك تجربة فريدة</p>
            </motion.div>
          ) : (
            <motion.div
              key={gameState}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {authError && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="vintage-panel p-12 rounded-[2rem] text-center max-w-md border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)]">
                    <CartoonLock size={64} className="mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-[var(--color-ink-black)] mb-4 vintage-text">خطأ في المصادقة</h2>
                    <p className="text-[var(--color-bg-dark)] mb-8 leading-relaxed font-bold">{authError}</p>
                    
                    {authError.includes('Anonymous Authentication') && (
                      <div className="bg-[var(--color-primary-gold)]/20 p-4 rounded-xl border-2 border-[var(--color-ink-black)] mb-8 text-sm font-bold">
                        تأكد من تفعيل "Anonymous Authentication" في إعدادات Firebase لتمكين ميزات اللعب الجماعي.
                      </div>
                    )}

                    <div className="flex flex-col gap-4">
                      <button onClick={handleRetryAuth} className="vintage-button w-full py-4 rounded-xl text-lg font-bold bg-[var(--color-primary-green)] text-white">
                        إعادة المحاولة
                      </button>
                      <button onClick={handleReset} className="vintage-button w-full py-4 rounded-xl text-lg font-bold bg-[var(--color-primary-gold)]">
                        العودة للرئيسية
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!authError && isAuthReady && gameState === 'remote' && <RemoteBuzzer />}
              
              {!authError && isAuthReady && gameState === 'config' && <ConfigScreen onStart={handleStartGame} />}
              
              {!authError && isAuthReady && gameState === 'bank' && <BankManager onClose={() => setGameState('config')} />}
              
              {gameState === 'loading' && (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <div className="w-24 h-24 border-8 border-[var(--color-bg-dark)]/10 rounded-full animate-spin border-t-[var(--color-primary-blue)]" />
                  <h2 className="text-3xl font-bold text-[var(--color-ink-black)] vintage-text">جاري تحضير التحدي...</h2>
                  <p className="text-[var(--color-bg-dark)] text-lg font-bold">يرجى الانتظار بينما نجهز اللعبة لك.</p>
                </div>
              )}

              {gameState === 'error' && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="vintage-panel p-12 rounded-[2rem] text-center max-w-md">
                    <CartoonAlert size={64} className="mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-[var(--color-ink-black)] mb-4 vintage-text">فشل الاتصال</h2>
                    <p className="text-[var(--color-bg-dark)] mb-8 leading-relaxed font-bold">{errorMessage}</p>
                    <button onClick={handleReset} className="vintage-button w-full py-4 rounded-xl text-lg font-bold bg-[var(--color-primary-gold)]">
                      إعادة المحاولة
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'playing' && config && (
                <GameScreen config={config} questions={questions} players={players} onFinish={handleFinishGame} onOpenReport={(q) => setReportedQuestion(q)} setGameState={setGameState} />
              )}
              
              {gameState === 'summary' && config && <SummaryScreen config={config} questions={questions} players={players} onRestart={handleReset} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
        </>
      )}

      {reportedQuestion && (
        <ReportScreen 
          question={reportedQuestion} 
          onClose={() => setReportedQuestion(null)} 
        />
      )}
    </div>
  );
};

export default App;
