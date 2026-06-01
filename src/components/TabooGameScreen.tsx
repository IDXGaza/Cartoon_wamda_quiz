import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { CartoonTimer, CartoonTrophy } from './CartoonIcons';

const TabooGameScreen: React.FC = () => {
    // For now, this is just a placeholder screen as the user wants the "main screen"
    // The actual taboo game logic (next words, scoring) needs to be hooked up to Firebase
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 p-4">
            <div className="vintage-panel p-8 rounded-3xl border-4 border-black text-center w-full max-w-lg">
                <h1 className="text-4xl font-black mb-4">لعبة قول بس لا تقول</h1>
                <p className="text-xl opacity-70">المتسابقون يحاولون التخمين...</p>
                
                <div className="flex justify-around mt-8 text-2xl font-bold">
                    <div className="bg-red-200 p-4 rounded-xl">النقاط: 0</div>
                    <div className="bg-amber-100 p-4 rounded-xl flex items-center gap-2"><CartoonTimer /> 60 ث</div>
                </div>
            </div>
        </div>
    );
};
export default TabooGameScreen;
