import React from 'react';
import { GeometryDashGame } from './components/GeometryDashGame';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen flex flex-col lg:flex-row items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* Dynamic Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-purple-950/40 to-black pointer-events-none z-0" />
      
      <div className="z-10 text-center mb-4 lg:mb-0 lg:mr-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(0,240,255,0.5)] tracking-tighter">
          NEON DASH
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm mt-2 font-bold tracking-widest uppercase">
          React Edition
        </p>
      </div>

      <div className="relative z-10 p-1 sm:p-2 bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-2xl backdrop-blur-sm w-full sm:w-auto">
        <GeometryDashGame />
      </div>

      <div className="z-10 mt-4 lg:mt-6 text-zinc-500 text-xs font-mono text-center">
        PRESS [SPACE] or [CLICK] TO JUMP
      </div>
    </div>
  );
};

export default App;