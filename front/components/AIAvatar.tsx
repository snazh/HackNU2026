// components/AIAvatar.tsx
'use client'

import { useOthers } from '../liveblocks.config'

export default function AIAvatar() {
  // Проверяем, видит ли кто-то другой, что агент работает [cite: 25]
  const othersThinking = useOthers((others) => 
    others.some((other) => (other.presence as any).isAgentThinking)
  )

  return (
    <div className="absolute top-4 right-4 flex items-center gap-3 bg-white/80 backdrop-blur p-2 rounded-full shadow-sm border border-gray-100 z-[998]">
      <div className="relative">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold`}>
          AI
        </div>
        {othersThinking && (
          <span className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping" />
        )}
      </div>
      <div className="pr-2">
        <p className="text-xs font-bold text-gray-800">Claude Agent</p>
        <p className="text-[10px] text-gray-500">
          {othersThinking ? 'Печатает идеи...' : 'В сети'}
        </p>
      </div>
    </div>
  )
}