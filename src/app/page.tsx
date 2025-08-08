"use client";

import { useState, useEffect, useRef } from "react";
import {
  PlusIcon,
  ChevronDownIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  ChatBubbleLeftIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  isThinking?: boolean;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);

    // Add thinking message immediately
    const thinkingMessage: Message = {
      role: "assistant",
      content: "",
      thinking: "",
      isThinking: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, thinkingMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let thinkingContent = "";
      let finalContent = "";
      let isInThinking = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.thinking) {
                isInThinking = true;
                thinkingContent = data.thinking;

                setMessages((prev) =>
                  prev.map((msg, index) =>
                    index === prev.length - 1 && msg.isThinking
                      ? { ...msg, thinking: thinkingContent }
                      : msg
                  )
                );
              } else if (data.response) {
                if (isInThinking) {
                  // Finished thinking, now showing response
                  isInThinking = false;
                  setMessages((prev) =>
                    prev.map((msg, index) =>
                      index === prev.length - 1 && msg.isThinking
                        ? {
                            ...msg,
                            content: data.response,
                            isThinking: false,
                            thinking: thinkingContent,
                          }
                        : msg
                    )
                  );
                } else {
                  finalContent = data.response;
                  setMessages((prev) =>
                    prev.map((msg, index) =>
                      index === prev.length - 1
                        ? { ...msg, content: finalContent }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.map((msg, index) =>
          index === prev.length - 1 && msg.isThinking
            ? {
                role: "assistant",
                content: "죄송합니다. 오류가 발생했습니다. 다시 시도해 주세요.",
                timestamp: new Date(),
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#f9f9f9] flex flex-col border-r border-[#e5e5e5]">
        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            <button className="flex items-center gap-3 w-full p-2.5 text-[#0d0d0d] hover:bg-[#f0f0f0] rounded-md transition-colors text-left text-sm">
              <ChatBubbleLeftIcon className="w-4 h-4" />새 채팅
            </button>
            <button className="flex items-center gap-3 w-full p-2.5 text-[#0d0d0d] hover:bg-[#f0f0f0] rounded-md transition-colors text-left text-sm">
              <MagnifyingGlassIcon className="w-4 h-4" />
              채팅 검색
            </button>
            <button className="flex items-center gap-3 w-full p-2.5 text-[#0d0d0d] hover:bg-[#f0f0f0] rounded-md transition-colors text-left text-sm">
              <BookmarkIcon className="w-4 h-4" />
              라이브러리
            </button>
          </div>

          {/* Chat History - Empty */}
          <div className="mt-8">
            <div className="text-xs text-[#6f6f6f] px-2 mb-2 font-medium">
              채팅
            </div>
            <div className="text-center text-[#9ca3af] text-sm py-4">
              대화 내역이 없습니다
            </div>
          </div>
        </div>

        {/* User Profile Area */}
        <div className="p-2 border-t border-[#e5e5e5]">
          <div className="flex items-center gap-2 p-2">
            <div className="w-6 h-6 bg-[#f97316] rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">U</span>
            </div>
            <div className="text-sm text-[#0d0d0d]">사용자</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#d9d9e3] px-4 py-3 bg-white">
          <div className="flex items-center justify-between mx-auto">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-medium text-[#0d0d0d]">ChatGPT</h1>

              <span className="text-lg text-gray-500">gpt-oss-20b</span>
            </div>
            <button className="text-[#6f6f6f] hover:text-[#0d0d0d]">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto px-4">
                <h2 className="text-3xl font-normal text-[#0d0d0d] mb-2">
                  무엇을 도와드릴까요?
                </h2>
              </div>
            </div>
          ) : (
            <div>
              {messages.map((message, index) => (
                <div key={index}>
                  {message.role === "user" ? (
                    // User message - right aligned
                    <div className="bg-white py-6">
                      <div className="max-w-3xl mx-auto px-4">
                        <div className="flex justify-end">
                          <div className="max-w-[70%]">
                            <div className="bg-[#f4f4f4] rounded-3xl px-5 py-3">
                              <div className="text-[#0d0d0d] text-base leading-6">
                                {message.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Assistant message - left aligned with avatar
                    <div className="bg-white py-6">
                      <div className="max-w-3xl mx-auto px-4">
                        <div className="flex gap-4">
                          <div className="flex-1 min-w-0">
                            {message.isThinking && (
                              <div className="mb-4">
                                <div className="bg-white border border-[#d1d5db] rounded-lg p-3 mb-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-[#10a37f] rounded-full animate-pulse"></div>
                                    <span className="text-sm font-medium text-[#10a37f]">
                                      Thinking...
                                    </span>
                                  </div>
                                  {message.thinking && (
                                    <div className="text-sm font-mono whitespace-pre-wrap animate-shimmer bg-gradient-to-r from-gray-700 via-white to-gray-700 bg-[length:200%_100%] bg-clip-text text-transparent">
                                      {message.thinking}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* {message.thinking && !message.isThinking && (
                              <details className="mb-3">
                                <summary className="cursor-pointer text-sm text-[#6f6f6f] hover:text-[#10a37f] transition-colors">
                                  💭 Show thinking process
                                </summary>
                                <div className="mt-2 bg-[#f0f0f0] border border-[#d1d5db] rounded-lg p-3">
                                  <div className="text-sm text-[#6f6f6f] font-mono whitespace-pre-wrap">
                                    {message.thinking}
                                  </div>
                                </div>
                              </details>
                            )} */}
                            <div className="text-[#0d0d0d] text-base leading-7">
                              <div
                                className={`whitespace-pre-wrap ${
                                  message.isThinking
                                    ? "animate-shimmer bg-gradient-to-r from-black via-white to-black bg-[length:200%_100%] bg-clip-text text-transparent"
                                    : ""
                                }`}
                              >
                                {message.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* {isLoading && (
                <div className="bg-[#f7f7f8] border-b border-black/5 py-6">
                  <div className="max-w-3xl mx-auto px-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-sm bg-[#10a37f] flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            G
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[#6f6f6f] rounded-full animate-pulse"></div>
                          <div
                            className="w-2 h-2 bg-[#6f6f6f] rounded-full animate-pulse"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-[#6f6f6f] rounded-full animate-pulse"
                            style={{ animationDelay: "0.4s" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white px-4 pb-6 pt-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <div className="flex items-center bg-white border border-[#d1d5db] rounded-3xl px-4 py-3 shadow-sm">
                <button className="p-1 text-[#6b7280] hover:text-[#374151] transition-colors mr-3">
                  <PlusIcon className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="메시지를 입력하세요..."
                    className="w-full border-0 focus:outline-none text-[#0d0d0d] placeholder-[#9ca3af] bg-transparent text-base py-1"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <button className="p-1 text-[#6b7280] hover:text-[#374151] transition-colors">
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-1 text-[#6b7280] hover:text-[#374151] transition-colors disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
