"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Send, MessageCircle, Loader2 } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        '你好！我是礼物管理助手。你可以问我任何关于礼物、联系人、库存的问题，比如："张三送过什么礼物？"、"库存还有多少茅台？"、"我该给李四送什么？"',
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.slice(-6), // 只发送最近3轮对话
        }),
      })

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
        },
      ])
    } catch (error) {
      console.error("[v0] 聊天错误:", error)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，我遇到了一些问题。请稍后再试。",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
        className="w-16 h-16 bg-gradient-to-br from-[#B8323F] via-[#D32F2F] to-[#8B0000] rounded-full shadow-lg hover:shadow-2xl hover:shadow-[#D4AF37]/30 transition-all flex items-center justify-center text-white hover:scale-110 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
        <MessageCircle className="w-7 h-7 relative z-10" />
        <div className="absolute top-2 right-2 w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div
      style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}
      className="w-96 max-h-[90vh] min-h-[400px] bg-[#FAF7F0] rounded-lg shadow-2xl flex flex-col border-2 border-[#D4AF37]/30"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#B8323F] via-[#D32F2F] to-[#8B0000] text-white p-4 rounded-t-lg flex items-center justify-between relative overflow-hidden shrink-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1" fill="#D4AF37" />
            </pattern>
            <rect width="100" height="100" fill="url(#pattern)" />
          </svg>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">AI礼物助手</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 rounded p-1 transition-colors relative z-10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-[#B8323F] to-[#8B0000] text-white shadow-md"
                  : "bg-gradient-to-br from-white to-[#F5F5DC] text-gray-900 border border-[#D4AF37]/20 shadow-sm"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-white to-[#F5F5DC] border border-[#D4AF37]/20 rounded-lg p-3">
              <Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-[#D4AF37]/30 bg-white/50 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入你的问题..."
            className="flex-1 px-3 py-2 border-2 border-[#D4AF37]/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8323F] focus:border-transparent bg-white"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-br from-[#B8323F] to-[#8B0000] hover:from-[#D32F2F] hover:to-[#B8323F] shadow-md hover:shadow-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
