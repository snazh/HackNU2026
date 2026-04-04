// components/ui/AIActionMenu.tsx
'use client'

import { useState } from 'react'
import { Editor, createShapeId } from '@tldraw/tldraw'
// import { useMutation } from '@/liveblocks.config' // Настройте путь к вашему конфигу
import { useMutation } from '../../liveblocks.config'
interface Props {
  editor: Editor
} 
       
export default function AIActionMenu({ editor }: Props) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)

  // Обновляем статус "ИИ думает" для всех в комнате через Liveblocks Presence
  const updatePresence = useMutation(({ setMyPresence }) => {
    setMyPresence({ isAgentThinking: loading })
  }, [loading])

  const handleIdentifyContext = () => {
    // Собираем все фигуры с текстом, чтобы ИИ понимал, что происходит на доске
    const shapes = editor.getCurrentPageShapes()
    return shapes.map(s => ({
      id: s.id,
      type: s.type,
      text: (s.props as any).text || '',
      x: s.x,
      y: s.y,
    })).filter(s => s.text.length > 0)
  }

  const askAI = async () => {
    if (!prompt) return
    setLoading(true)
    updatePresence()

    try {
      const context = handleIdentifyContext()
      
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      })

      const data = await response.json()

      // ИИ "отвечает" прямо на холсте, создавая новые стикеры
      if (data.suggestions) {
        editor.createShapes(data.suggestions.map((s: any) => ({
          id: createShapeId(),
          type: 'geo',
          x: s.x || editor.getViewportScreenCenter().x,
          y: s.y || editor.getViewportScreenCenter().y,
          props: {
            geo: 'rectangle',
            color: 'blue',
            text: s.text,
          },
        })))
      }
    } catch (error) {
      console.error("AI Error:", error)
    } finally {
      setLoading(false)
      setPrompt('')
      updatePresence()
    }
  }

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 bg-white p-2 rounded-xl shadow-2xl border border-gray-200 z-[999]">
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="О чем поштурмим?..."
        className="w-80 px-4 py-2 outline-none text-sm"
        onKeyDown={(e) => e.key === 'Enter' && askAI()}
      />
      <button
        onClick={askAI}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium transition ${
          loading ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {loading ? 'ИИ думает...' : 'Brainstorm'}
      </button>
    </div>
  )
}