
import React, { useState, useEffect } from 'react';
import { GameConfig, Player, Question, GameMode, QuestionType, SavedSet, Difficulty } from './types';
import { generateQuestions, parseCustomJson } from './services/geminiService';
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
import { motion, AnimatePresence } from 'framer-motion';
import ConfigScreen from './components/ConfigScreen';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import SummaryScreen from './components/SummaryScreen';
import RemoteBuzzer from './components/RemoteBuzzer';
import TabooScreen from './components/TabooScreen';
import SettingsModal from './components/SettingsModal';
import LibraryScreen from './components/LibraryScreen';
import BankManager from './components/BankManager';
import { useSettings } from './contexts/SettingsContext';
import { useToast } from './contexts/ToastContext';
import { playSound } from './utils/sound';
import { toggleFullScreen } from './utils/fullscreen';
import { auth, db } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'start' | 'config' | 'loading' | 'playing' | 'summary' | 'remote' | 'remote-taboo' | 'error' | 'library' | 'bank'>('start');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingTime, setLoadingTime] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("جاري تجهيز اللعبة...");
  const loadingTimerRef = React.useRef<NodeJS.Timeout | null>(null);
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
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
      
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
    setLoadingTime(0);
    setLoadingStatus("تنشيط الذكاء الاصطناعي...");
    setErrorMessage('');

    if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    loadingTimerRef.current = setInterval(() => {
      setLoadingTime(prev => {
        const next = prev + 0.1;
        if (next < 3) setLoadingStatus("جاري الاتصال بالخوادم...");
        else if (next < 7) setLoadingStatus("توليد الفئات وتحليل الموضوع...");
        else if (next < 12) setLoadingStatus("صياغة الأسئلة بالتوازي (دقة عالية)...");
        else if (next < 16) setLoadingStatus("ضبط مستويات الصعوبة والمراجعة...");
        else if (next < 19) setLoadingStatus("المسات النهائية وتجهيز الشبكة...");
        else setLoadingStatus("يتم إنهاء التوليد الآن...");
        return next;
      });
    }, 100);
    
    try {
      if (!auth.currentUser) {
        showToast("يجب تسجيل الدخول أولاً للبدء. جاري المحاولة...", "info");
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

      // Determine required count for start
      const isHexAI = newConfig.mode === GameMode.HEX_GRID && newConfig.questionSource === 'ai';
      const requiredCount = isHexAI ? 0 : (newConfig.mode === GameMode.GRID ? 25 : newConfig.numQuestions);
      const topicToUse = newConfig.topic || 'عام';

      let generated: Question[] = [];
      let lastError: any = null;

      // Force bank source if offline
      const finalQuestionSource = !isOnline ? 'bank' : newConfig.questionSource;

      if (finalQuestionSource === 'bank') {
        const requiredCount = newConfig.mode === GameMode.HEX_GRID ? 28 : (newConfig.mode === GameMode.GRID ? 25 : newConfig.numQuestions);
        // Use the new getQuestionsFromBank helper
        const { getQuestionsFromBank } = await import('./services/geminiService');
        generated = await getQuestionsFromBank(topicToUse, requiredCount, newConfig.mode, newConfig.difficulty, Array.from(excludedItemsSet), newConfig.categories);
        
        // Final shuffle ONLY if not in GRID mode to preserve category/point ordering
        if (newConfig.mode !== GameMode.GRID) {
          generated = [...generated].sort(() => Math.random() - 0.5);
        }
        
        setQuestions(generated);
        setGameState('playing');
        
        // Save to persistent history
        try {
          // Save both text and answer to history to catch repetitions effectively
          const newTags = generated.flatMap(q => [q.text, q.answer, q.id]).filter(Boolean);
          if (newTags.length > 0) {
            const data = localStorage.getItem('gemini_quiz_question_history');
            let history: string[][] = data ? JSON.parse(data) : [];
            history.unshift(newTags);
            if (history.length > 50) history = history.slice(0, 50); 
            localStorage.setItem('gemini_quiz_question_history', JSON.stringify(history));
          }
        } catch (e) {}
        
        return;
      }

      if (newConfig.customJson) {
        generated = parseCustomJson(newConfig.customJson, topicToUse, newConfig.mode, newConfig.difficulty);
      } else {
        let attempts = 0;
        const maxStartAttempts = 10;
        while (generated.length < requiredCount && attempts < maxStartAttempts) {
          const needed = requiredCount - generated.length;
          console.log(`Attempt ${attempts + 1}: Generating ${needed} questions for topic: ${topicToUse}`);
          
          try {
            // Relax constraints after 5 failed attempts
            const activeExclusions = attempts > 5 ? [] : Array.from(excludedItemsSet);
            
            const batch = await generateQuestions(
              topicToUse,
              needed,
              newConfig.questionTypes,
              newConfig.mode,
              newConfig.difficulty,
              settings.aiModel === 'custom' ? (settings.customModel || 'gemini-1.5-flash') : settings.aiModel,
              newConfig.categories,
              activeExclusions
            );
            
            console.log(`Batch received: ${batch?.length || 0} questions`);
            
            if (batch && batch.length > 0) {
              const newQuestions = batch.filter(bq => {
                const bqAns = bq.answer.trim().toLowerCase();
                const bqText = bq.text.trim().toLowerCase();
                return !generated.some(gq => gq.answer === bq.answer || gq.text === bq.text) && 
                  (attempts > 7 || (!excludedItemsSet.has(bqAns) && !excludedItemsSet.has(bqText)));
              });
              
              console.log(`New unique questions after filtering: ${newQuestions.length}`);
              
              // Check if these are fallback questions
              const isFallback = newQuestions.some(q => q.id.startsWith('static-') || q.text.includes('(حدث خطأ'));
              if (isFallback) {
                showToast("تم استخدام أسئلة احتياطية بسبب مشكلة في الاتصال بالذكاء الاصطناعي.", "warning");
              }
              
              if (newQuestions.length === 0 && batch.length > 0) {
                console.warn("All generated questions were filtered out as duplicates.");
              }
              
              generated.push(...newQuestions);
            }
          } catch (batchError: any) {
            console.error(`Error in batch generation attempt ${attempts + 1}:`, batchError);
            lastError = batchError;
            
            // If it's a safety error, don't keep retrying as it will likely fail again
            if (batchError.message?.includes('فلاتر الأمان') || batchError.message?.includes('SAFETY')) {
              break;
            }
          }
          
          attempts++;
        }
        
        if (generated.length === 0 && lastError) {
          throw lastError;
        }
      }
      
      if (!isHexAI && (!generated || generated.length === 0)) {
        if (lastError) {
          throw lastError;
        }
        throw new Error("عذراً، لم نتمكن من الحصول على أسئلة جديدة. يرجى محاولة تغيير الموضوع.");
      }
      
      if (generated.length < requiredCount && generated.length > 0) {
        showToast(`تم توليد ${generated.length} سؤالاً فقط من أصل ${requiredCount}.`, 'warning');
      }
      
      setQuestions(generated);
      
      // Shuffle questions for non-GRID modes to ensure a fresh experience Each time
      if (newConfig.mode !== GameMode.GRID) {
        const shuffled = [...generated].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
        generated = shuffled;
      } else {
        setQuestions(generated);
      }
      
      // Save to persistent history
      try {
        // Save both text and answer to history to catch repetitions effectively
        const newTags = generated.flatMap(q => [q.text, q.answer, q.id]).filter(Boolean);
        if (newTags.length > 0) {
          const data = localStorage.getItem('gemini_quiz_question_history');
          let history: string[][] = data ? JSON.parse(data) : [];
          history.unshift(newTags);
          // Keep up to 50 rounds of history to prevent repetition across rounds
          if (history.length > 50) history = history.slice(0, 50); 
          localStorage.setItem('gemini_quiz_question_history', JSON.stringify(history));
        }
      } catch (e) {
        console.error("Failed to save history", e);
      }

      setGameState('playing');
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    } catch (error: any) {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      console.error("Game Start Error:", error);
      showToast(error.message || "حدث خطأ غير متوقع أثناء توليد الأسئلة.", 'error');
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

  const handlePlaySavedSet = (set: SavedSet, selectedPlayers: Player[]) => {
    const newConfig: GameConfig = {
      topic: set.topic,
      numQuestions: set.numQuestions,
      mode: set.mode,
      questionTypes: [QuestionType.OPEN],
      difficulty: set.difficulty,
      players: selectedPlayers,
      manualQuestions: set.questions,
      sessionId
    };
    setConfig(newConfig);
    setPlayers(newConfig.players);
    setQuestions(set.questions);
    setGameState('playing');
  };

  return (
    <div className="min-h-screen text-[var(--color-ink-black)] font-[var(--font-arabic)] overflow-x-hidden relative">
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
                <CartoonRocket size={24} className="md:w-[32px] md:h-[32px]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-3xl font-bold text-[var(--color-ink-black)] leading-none vintage-text">ومضة</h1>
              </div>
            </motion.div>
            
            <div className="flex items-center gap-3">
              {gameState !== 'config' && gameState !== 'loading' && gameState !== 'library' && gameState !== 'start' && (
                <button 
                  onClick={() => {
                    playSound('click');
                    handleReset();
                  }} 
                  className="vintage-button bg-[var(--color-primary-red)] text-white px-3 py-2 md:px-6 md:py-3 rounded-xl text-sm md:text-md flex items-center gap-2 md:gap-3"
                >
                  <CartoonX size={20} className="md:w-[24px] md:h-[24px]" /> <span className="hidden md:inline">إلغاء</span>
                </button>
              )}
              {gameState === 'config' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      playSound('click');
                      setGameState('bank');
                    }} 
                    className="vintage-button px-3 py-2 md:px-5 md:py-2.5 text-xs md:text-sm flex items-center gap-1 md:gap-2"
                  >
                    <CartoonBook size={16} /> <span className="hidden md:inline">البنك</span>
                  </button>
                  <button 
                    onClick={() => {
                      playSound('click');
                      setGameState('library');
                    }} 
                    className="vintage-button px-3 py-2 md:px-5 md:py-2.5 text-xs md:text-sm flex items-center gap-1 md:gap-2"
                  >
                    <CartoonStar size={16} /> <span className="hidden md:inline">مجموعاتي</span>
                  </button>
                </div>
              )}
              <button 
                onClick={() => {
                  playSound('click');
                  toggleFullScreen();
                }} 
                className="vintage-button w-10 h-10 md:w-18 md:h-18 flex items-center justify-center rounded-xl md:rounded-2xl"
                title="ملء الشاشة"
              >
                <CartoonEye size={24} className="md:w-[44px] md:h-[44px]" />
              </button>
              <button 
                onClick={() => {
                  playSound('click');
                  setIsSettingsOpen(true);
                }} 
                className="vintage-button w-10 h-10 md:w-18 md:h-18 flex items-center justify-center rounded-xl md:rounded-2xl"
                title="الإعدادات"
              >
                <CartoonGear size={24} className="md:w-[44px] md:h-[44px] animate-spin-slow" />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={`${gameState === 'remote' ? 'w-full h-full' : 'container mx-auto px-2 md:px-4 py-4 md:py-12 max-w-7xl'} relative z-10`}>
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

              {!authError && isAuthReady && gameState === 'start' && <StartScreen onStart={() => setGameState('config')} />}

              {!authError && isAuthReady && gameState === 'remote' && <RemoteBuzzer />}
              
              {!authError && isAuthReady && gameState === 'remote-taboo' && <TabooScreen />}
              
              {!authError && isAuthReady && gameState === 'config' && <ConfigScreen onStart={handleStartGame} />}
              
              {!authError && isAuthReady && gameState === 'library' && <LibraryScreen onPlaySet={handlePlaySavedSet} onClose={() => setGameState('config')} />}
              
              {!authError && isAuthReady && gameState === 'bank' && <BankManager onClose={() => setGameState('config')} />}
              
              {gameState === 'loading' && config && (
                <div className="flex flex-col items-center justify-center py-32 space-y-12">
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="w-40 h-40 border-4 border-dashed border-[var(--color-primary-blue)] rounded-full absolute -inset-4"
                    />
                    <div className="w-32 h-32 bg-[var(--color-off-white)] rounded-full flex items-center justify-center border-4 border-[var(--color-ink-black)] shadow-[8px_8px_0px_rgba(0,0,0,0.1)] relative">
                      <CartoonRocket size={64} className="animate-bounce" />
                      <div className="absolute -bottom-6 bg-[var(--color-primary-gold)] px-4 py-1 rounded-full border-2 border-black font-black shadow-[2px_2px_0px_black] text-sm animate-pulse whitespace-nowrap">
                        00:{loadingTime.toString().padStart(2, '0')} ث
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <h2 className="text-4xl font-bold text-[var(--color-ink-black)] mb-4 vintage-text">جاري تحضير التحدي...</h2>
                    <p className="text-[var(--color-bg-dark)] text-xl font-bold">جاري تأليف الأسئلة وتجهيز اللعبة</p>
                    <div className="mt-8 bg-black/5 p-6 rounded-2xl border-2 border-dashed border-black/20 max-w-sm mx-auto">
                      {(() => {
                        // Dynamic estimation based on mode and expected parallel speed
                        const estimated = config.mode === GameMode.GRID 
                          ? 60 
                          : (config.mode === GameMode.HEX_GRID ? 90 : 40);
                        
                        let progress = 0;
                        if (loadingTime < estimated * 0.7) {
                          progress = Math.floor((loadingTime / estimated) * 100);
                        } else {
                          // Slow down progress after 70% to avoid stalling at 99%
                          const overflow = loadingTime - (estimated * 0.7);
                          progress = Math.min(99, 70 + Math.floor(overflow * 0.5));
                        }

                        return (
                          <>
                            <div className="w-full h-3 bg-black/10 rounded-full mb-4 overflow-hidden border border-black/10">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-[var(--color-primary-gold)]"
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                            <div className="flex justify-between text-xs font-black opacity-60 mb-2">
                              <span>المرحلة: {loadingStatus}</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="flex justify-between text-xs font-black opacity-60 mb-2">
                              <span>الوقت المنقضي: {Math.floor(loadingTime)}ث</span>
                              <span>المتبقي التقريبي: {Math.max(1, Math.ceil(estimated - loadingTime))}ث</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {[0, 1, 2].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1], rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                        className="w-6 h-6 bg-[var(--color-primary-gold)] border-2 border-[var(--color-ink-black)] rounded-lg shadow-[2px_2px_0px_var(--color-ink-black)]"
                      />
                    ))}
                  </div>
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
                <GameScreen config={config} questions={questions} players={players} onFinish={handleFinishGame} />
              )}
              
              {gameState === 'summary' && config && <SummaryScreen config={config} questions={questions} players={players} onRestart={handleReset} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
