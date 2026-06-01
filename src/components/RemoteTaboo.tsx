import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import TabooScreen from './TabooScreen';
import { Question } from '../types';

const RemoteTaboo: React.FC = () => {
  const [roomId, setRoomId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [roomState, setRoomState] = useState<any>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('roomId');
    if (id) setRoomId(id);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
        if (snap.exists()) setRoomState(snap.data());
    });
    return unsub;
  }, [roomId]);

  if (!roomState) return <div>جاري الاتصال...</div>;

  const currentQuestion = roomState.activeQuestion as Question;
  
  if (roomState.describerId === auth.currentUser?.uid) {
    return <TabooScreen 
        question={currentQuestion} 
        onCorrect={() => {}} 
        onWrong={() => {}} 
        onSkip={() => {}} 
    />;
  }

  return <div>بانتظار دورك...</div>;
};

export default RemoteTaboo;
