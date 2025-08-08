import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "유효한 메시지를 입력해주세요." },
        { status: 400 }
      );
    }

    // Create a ReadableStream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Send "Thinking..." status
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                thinking: "Analyzing the user's message...",
              })}\n\n`
            )
          );

          const ollamaResponse = await fetch(
            "http://localhost:11434/api/generate",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gpt-oss:20b",
                prompt: message,
                stream: true,
              }),
            }
          );

          if (!ollamaResponse.ok) {
            throw new Error(`Ollama API error: ${ollamaResponse.status}`);
          }

          const reader = ollamaResponse.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let buffer = "";
          let fullResponse = "";
          let isFirstChunk = true;
          let thinkingContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);

                  if (data.response) {
                    fullResponse += data.response;

                    // Simulate thinking process for first few chunks
                    if (isFirstChunk) {
                      thinkingContent = `User says "${message}". I should analyze this and provide an appropriate response. Let me think about the best way to help.`;

                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            thinking: thinkingContent,
                          })}\n\n`
                        )
                      );

                      // Small delay to show thinking
                      await new Promise((resolve) => setTimeout(resolve, 1000));

                      // Send done thinking signal
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({
                            doneThinking: true,
                          })}\n\n`
                        )
                      );

                      isFirstChunk = false;
                    }
                  }

                  if (data.done) {
                    // Send final response
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          response: fullResponse,
                        })}\n\n`
                      )
                    );
                    break;
                  }
                } catch (e) {
                  console.error("Error parsing Ollama response:", e);
                }
              }
            }
          }
        } catch (error) {
          console.error("Chat API error:", error);

          let errorMessage = "서버 오류가 발생했습니다.";
          if (error instanceof Error && error.message.includes("fetch")) {
            errorMessage =
              "Ollama 서버에 연결할 수 없습니다. Ollama가 실행 중인지 확인해주세요.";
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ response: errorMessage })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
