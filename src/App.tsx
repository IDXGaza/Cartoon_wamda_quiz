
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
import RemoteTaboo from './components/RemoteTaboo';
import TabooStartScreen from './components/TabooStartScreen';
import TabooGameScreen from './components/TabooGameScreen';
import SettingsModal from './components/SettingsModal';
import ReportScreen from './components/ReportScreen';
import ReportsViewer from './components/ReportsViewer';
import BankManager from './components/BankManager';
import { useSettings } from './contexts/SettingsContext';
import { useToast } from './contexts/ToastContext';
import { playSound } from './utils/sound';
import { toggleFullScreen } from './utils/fullscreen';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const App: React.FC = () => {
  const [currentPath] = useState(window.location.pathname);
  const [gameState, setGameState] = useState<'config' | 'loading' | 'playing' | 'summary' | 'remote' | 'remote-taboo' | 'taboo-start' | 'taboo-playing' | 'error' | 'bank' | 'report'>('config');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [reportedQuestion, setReportedQuestion] = useState<Question | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9).toUpperCase());
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
            } else if (error.code === 'auth/network-request-failed' || error.code === 'auth/internal-error') {
              // Network failed - don't block the whole app, just set status
              console.warn("Auth network failed - continuing in restricted mode");
              setIsFirestoreOffline(true);
            } else {
              setAuthError(error.message);
            }
            setIsAuthReady(true);
          }
        } else {
          setIsAuthReady(true);
          setAuthError(null);
          // Only test connectivity once auth is confirmed
          testConnection();
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

  useEffect(() => {
    const handleUnload = () => {
      const isRemoteHost = (
        ((gameState === 'taboo-playing' || gameState === 'taboo-start') && config?.tabooType === 'remote') || 
        (gameState === 'playing' && config?.mode === GameMode.BUZZER)
      );
      
      if (isRemoteHost && sessionId) {
        const roomRef = doc(db, 'rooms', sessionId);
        deleteDoc(roomRef).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [gameState, config, sessionId]);

  const testConnection = async () => {
    try {
      const { getDoc, doc } = await import('firebase/firestore');
      // Use getDoc instead of getDocFromServer to allow cached results if available
      // but if we are genuinely testing connectivity, getDocFromServer is better.
      // However, it's throwing too much. Let's use getDoc and check metadata.
      const pingDoc = await getDoc(doc(db, '_connectivity_test_', 'ping'));
      
      if (pingDoc.metadata.fromCache) {
        console.log("Firebase connected (serving from cache)");
        // If it's only from cache, we might still be offline
        // but we don't want to show a scary error yet.
        // We'll trust the browser's online status mostly.
      } else {
        console.log("Firebase connection successful (server)");
        setIsFirestoreOffline(false);
      }
    } catch (error: any) {
      console.warn("Firebase connection test skipped or failed (non-critical):", error.message);
      setIsFirestoreOffline(true);
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

      if (newConfig.mode === GameMode.TABOO) {
        setQuestions(newConfig.manualQuestions || []); // Should be populated properly
        if (newConfig.tabooType === 'local') {
          setGameState('taboo-playing');
        } else {
          setGameState('taboo-start');
        }
        return;
      }

      if (newConfig.mode === GameMode.HEX_GRID && newConfig.hexMode === 'manual' && newConfig.hexManualQuestions) {
        const manualArray = Object.entries(newConfig.hexManualQuestions).map(([letter, q]) => ({
          id: `m-${letter}-${sessionId}`,
          text: q.question,
          answer: q.answer,
          category: 'يدوي',
          points: 100,
          letter,
          type: QuestionType.OPEN,
          difficulty: newConfig.difficulty
        }));
        setQuestions(manualArray);
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

  const cleanupRemoteRoom = async (id: string) => {
    try {
      const roomRef = doc(db, 'rooms', id);
      const playersRef = collection(db, 'rooms', id, 'players');
      const playersSnap = await getDocs(playersRef);
      
      const batch = writeBatch(db);
      playersSnap.forEach(pDoc => {
        batch.delete(pDoc.ref);
      });
      batch.delete(roomRef);
      await batch.commit();
      console.log(`Room ${id} and its players cleaned up.`);
    } catch (err) {
      console.error("Failed to cleanup remote room:", err);
    }
  };

  const handleReset = () => {
    const isRemoteHost = (
      ((gameState === 'taboo-playing' || gameState === 'taboo-start') && config?.tabooType === 'remote') || 
      (gameState === 'playing' && config?.mode === GameMode.BUZZER)
    );

    if (isRemoteHost && sessionId) {
      cleanupRemoteRoom(sessionId);
    }
    setGameState('config');
    setQuestions([]);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen text-[var(--color-ink-black)] font-[var(--font-arabic)] overflow-x-hidden relative">
      {currentPath === '/reports' ? <ReportsViewer /> : (
        <>

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
        <header className="vintage-panel sticky top-0 z-50 relative border-x-0 border-t-0 rounded-none w-full box-border">
          <div className="w-full max-w-7xl mx-auto px-2 py-2 md:px-6 md:py-4 flex justify-between items-center box-border">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-4 cursor-pointer group flex-shrink-0" 
              onClick={() => {
                playSound('click');
                handleReset();
              }}
            >
              <div className="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center group-hover:rotate-12 transition-transform flex-shrink-0 overflow-hidden">
                <img src="/logo.png" alt="شعار ومضة" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col flex-shrink-0">
                <h1 className="text-xl md:text-3xl font-bold text-[var(--color-ink-black)] leading-none vintage-text">ومضة</h1>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 flex-nowrap box-border">
              {gameState !== 'config' && gameState !== 'loading' && gameState !== 'library' && gameState !== 'start' && (
                <button 
                  onClick={() => {
                    playSound('click');
                    handleReset();
                  }} 
                  className="vintage-button bg-[var(--color-primary-red)] text-white px-2 py-2 md:px-6 md:py-3 rounded-xl text-xs md:text-md flex items-center gap-1 md:gap-3 flex-shrink-0"
                >
                  <CartoonX size={16} className="w-4 h-4 md:w-6 md:h-6 shrink-0" /> <span className="hidden md:inline">إلغاء</span>
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
                className="vintage-button w-9 h-9 md:w-16 md:h-16 flex items-center justify-center rounded-xl md:rounded-2xl shrink-0"
                title="ملء الشاشة"
              >
                <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                  <CartoonEye className="w-full h-full" />
                </div>
              </button>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsSettingsOpen(true);
                }} 
                className="vintage-button w-9 h-9 md:w-16 md:h-16 flex items-center justify-center rounded-xl md:rounded-2xl shrink-0"
                title="الإعدادات"
              >
                <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0">
                  <CartoonGear className="w-full h-full animate-spin-slow" />
                </div>
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

      <main className={`${gameState === 'remote' ? 'w-full h-full' : (gameState === 'playing' ? 'w-full px-0 pt-0 pb-1 max-w-none' : 'container mx-auto px-2 md:px-4 pt-2 pb-2 md:pt-8 md:pb-12 max-w-7xl')} relative z-10`}>
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
              {!authError && isAuthReady && gameState === 'remote-taboo' && <RemoteTaboo />}
              {!authError && isAuthReady && gameState === 'taboo-start' && config && <TabooStartScreen config={config} questions={questions} roomId={sessionId} onStart={() => setGameState('taboo-playing')} />}
              {!authError && isAuthReady && gameState === 'taboo-playing' && config && (
                <TabooGameScreen 
                  config={config} 
                  questions={questions} 
                  players={config.players} 
                  onFinish={(updatedPlayers) => {
                    setConfig({ ...config, players: updatedPlayers });
                    setGameState('config');
                  }} 
                  onClose={() => setGameState('config')}
                />
              )}
              
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

      {/* تنبيه الوضع الرأسي الممتد على كامل الشاشة */}
      {!(gameState === 'remote' || gameState === 'remote-taboo' || config?.mode === GameMode.BUZZER || (config?.mode === GameMode.TABOO && config?.tabooType === 'remote')) && (
        <div id="portrait-orientation-warning" className="fixed inset-0 z-[99999] bg-[var(--color-bg-cream)] portrait-warning-overlay flex-col items-center justify-center p-6 text-center select-none overflow-y-auto">
          <div className="halftone-bg absolute inset-0 z-0 pointer-events-none"></div>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="vintage-panel p-8 sm:p-12 rounded-[2rem] border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_var(--color-ink-black)] max-w-md w-full relative z-10 flex flex-col items-center space-y-6"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[var(--color-primary-gold)] rounded-[2rem] flex items-center justify-center border-4 border-[var(--color-ink-black)] shadow-[6px_6px_0px_var(--color-ink-black)]">
              <motion.div
                animate={{ rotate: [0, -90, -90, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut", repeatDelay: 0.5 }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--color-ink-black)]" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </motion.div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-ink-black)] vintage-text leading-snug">
              تنبيه الاتجاه
            </h2>
            
            <p className="text-base sm:text-lg font-bold text-[var(--color-bg-dark)] leading-relaxed">
              الرجاء استعمال التطبيق في الوضع الافقي لتجربة أفضل
            </p>
            
            <div className="w-full h-2 bg-[var(--color-ink-black)] rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute top-0 right-0 h-full bg-[var(--color-primary-red)]"
                animate={{ width: ["0%", "100%", "0%"] }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                style={{ direction: 'rtl' }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default App;
