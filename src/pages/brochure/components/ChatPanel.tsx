import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Box,
  PasswordInput,
  Button,
  Text,
  Anchor,
  Modal,
  ActionIcon,
  Tooltip,
  Menu,
} from "@mantine/core";
import {
  Key,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Square,
  Settings,
  Check,
  Copy,
  RotateCcw,
  ExternalLink,
  Trash2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  type ChatModelAdapter,
} from "@assistant-ui/react";

import type { BrochureData } from "../types";
import {
  fetchModels,
  generateContent,
  testConnection,
  CURATED_MODELS,
  type GeminiModel,
} from "../geminiService";

interface ChatPanelProps {
  currentBrochureData?: BrochureData | null;
  onBrochureGenerated: (data: BrochureData) => void;
}

// Inject keyframe animation for the thinking dots & spinner
const KEYFRAMES_CSS = `
@keyframes assistantPulse {
  0%, 80%, 100% { transform: scale(0.65); opacity: 0.35; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes assistantFadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.thinking-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #0f172a;
  display: inline-block;
  animation: assistantPulse 1.4s infinite ease-in-out both;
}
.thinking-dot:nth-child(1) { animation-delay: -0.32s; }
.thinking-dot:nth-child(2) { animation-delay: -0.16s; }
.thinking-dot:nth-child(3) { animation-delay: 0s; }
`;

// User Message Bubble
const UserMessage = () => (
  <MessagePrimitive.Root
    style={{
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: 16,
      animation: "assistantFadeIn 0.2s ease-out",
    }}
  >
    <div
      style={{
        maxWidth: "86%",
        background: "#f1f5f9",
        border: "1px solid #e2e8f0",
        borderRadius: "18px 18px 4px 18px",
        padding: "10px 15px",
        fontSize: 13.5,
        lineHeight: 1.55,
        color: "#0f172a",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

// Assistant Message Bubble with dedicated Loading State & Conditional ActionBar
const AssistantMessage = () => (
  <MessagePrimitive.Root
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 16,
      animation: "assistantFadeIn 0.2s ease-out",
    }}
  >
    <img
      src="/ai-avatar.jpg"
      alt="AI Avatar"
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        objectFit: "cover",
        border: "1px solid #e2e8f0",
        flexShrink: 0,
        marginTop: 2,
      }}
    />

    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      {/* State 1: Waiting for API response (No content yet) */}
      <MessagePrimitive.If hasContent={false}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "18px 18px 18px 4px",
            padding: "10px 16px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "#475569",
            }}
          >
            Crafting brochure layout...
          </span>
        </div>
      </MessagePrimitive.If>

      {/* State 2: Content received */}
      <MessagePrimitive.If hasContent>
        <div
          style={{
            maxWidth: "92%",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "18px 18px 18px 4px",
            padding: "12px 16px",
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "#0f172a",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <MessagePrimitive.Parts />
        </div>

        {/* Only show Copy / Regenerate actions when generation is complete */}
        <ThreadPrimitive.If running={false}>
          <ActionBarPrimitive.Root
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              marginLeft: 4,
            }}
          >
            <ActionBarPrimitive.Copy
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11.5,
                color: "#64748b",
                padding: "3px 6px",
                borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#0f172a";
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <MessagePrimitive.If copied={false}>
                <Copy size={12} />
                <span>Copy</span>
              </MessagePrimitive.If>
              <MessagePrimitive.If copied>
                <Check size={12} color="#10b981" />
                <span style={{ color: "#10b981", fontWeight: 500 }}>Copied</span>
              </MessagePrimitive.If>
            </ActionBarPrimitive.Copy>

            <ActionBarPrimitive.Reload
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 11.5,
                color: "#64748b",
                padding: "3px 6px",
                borderRadius: 6,
                fontFamily: "'Inter', sans-serif",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#0f172a";
                e.currentTarget.style.background = "#f1f5f9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#64748b";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <RotateCcw size={12} />
              <span>Retry</span>
            </ActionBarPrimitive.Reload>
          </ActionBarPrimitive.Root>
        </ThreadPrimitive.If>
      </MessagePrimitive.If>
    </div>
  </MessagePrimitive.Root>
);

const THREAD_COMPONENTS = {
  UserMessage,
  AssistantMessage,
};

export const ChatPanel = ({
  currentBrochureData,
  onBrochureGenerated,
}: ChatPanelProps) => {
  // Saved API key from localStorage
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem("gemini_api_key") || "";
    } catch {
      return "";
    }
  });

  // Curated models suitable for travel brochure generation
  const [models, setModels] = useState<GeminiModel[]>(CURATED_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);

  // Selected model (persisted in localStorage, defaults to Gemini Flash-Lite Latest)
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("gemini_model");
      if (saved && CURATED_MODELS.some((m) => m.name === saved)) {
        return saved;
      }
      return "gemini-flash-lite-latest";
    } catch {
      return "gemini-flash-lite-latest";
    }
  });

  // Settings modal state
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [testResult, setTestResult] = useState<{
    status: "idle" | "testing" | "success" | "error";
    message?: string;
  }>({ status: "idle" });

  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  const currentBrochureDataRef = useRef(currentBrochureData);
  currentBrochureDataRef.current = currentBrochureData;

  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // Fetch models dynamically from Google Gemini API
  const handleLoadModels = async (key: string) => {
    if (!key.trim()) return;
    setModelsLoading(true);
    try {
      const fetched = await fetchModels(key.trim());
      setModels(fetched);

      if (fetched.length > 0) {
        const saved = localStorage.getItem("gemini_model") || "";
        const exists = fetched.some((m) => m.name === saved);
        // Default to Flash-Lite if no valid prior model saved
        const fallback =
          fetched.find((m) => m.name.includes("flash-lite"))?.name ||
          fetched[0].name;
        const modelToSet = exists ? saved : fallback;
        setSelectedModel(modelToSet);
        try {
          localStorage.setItem("gemini_model", modelToSet);
        } catch { }
      }
    } catch (err) {
      console.warn("Failed to load Gemini models:", err);
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  // On mount: if API key exists, dynamically fetch models
  useEffect(() => {
    if (apiKey.trim()) {
      handleLoadModels(apiKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Test API key connection in settings modal
  const handleTestConnection = async () => {
    const key = tempApiKey.trim();
    if (!key) return;
    setTestResult({ status: "testing" });
    try {
      const res = await testConnection(key);
      setTestResult({
        status: "success",
        message: `API Key verified! Found ${res.models.length} available models.`,
      });
      setModels(res.models);
      if (res.models.length > 0 && !selectedModel) {
        const defaultModel = res.models[0].name;
        setSelectedModel(defaultModel);
        try {
          localStorage.setItem("gemini_model", defaultModel);
        } catch { }
      }
    } catch (err) {
      setTestResult({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Invalid API key or network error",
      });
    }
  };

  const handleSaveSettings = () => {
    const trimmedKey = tempApiKey.trim();
    setApiKey(trimmedKey);
    try {
      if (trimmedKey) {
        localStorage.setItem("gemini_api_key", trimmedKey);
        handleLoadModels(trimmedKey);
      } else {
        localStorage.removeItem("gemini_api_key");
        setModels([]);
        setSelectedModel("");
      }
    } catch (e) {
      console.warn("localStorage save error:", e);
    }
    setSettingsOpened(false);
  };

  const handleRemoveKey = () => {
    setTempApiKey("");
    setApiKey("");
    setModels([]);
    setSelectedModel("");
    setTestResult({ status: "idle" });
    try {
      localStorage.removeItem("gemini_api_key");
      localStorage.removeItem("gemini_model");
    } catch (e) {
      console.warn("localStorage remove error:", e);
    }
    setSettingsOpened(false);
  };

  const handleOpenSettings = () => {
    setTempApiKey(apiKey);
    setTestResult({ status: "idle" });
    setSettingsOpened(true);
  };

  // Define chat model adapter for assistant-ui
  const chatModel: ChatModelAdapter = useMemo(
    () => ({
      async *run({ messages, abortSignal }) {
        if (!apiKeyRef.current.trim()) {
          yield {
            content: [
              {
                type: "text",
                text: "⚠️ Google Gemini API key required. Please click the Settings (⚙️) icon in the header to enter your key.",
              },
            ],
          };
          return;
        }

        if (!selectedModelRef.current) {
          yield {
            content: [
              {
                type: "text",
                text: "⚠️ No model selected. Please select a Gemini model from the selector below.",
              },
            ],
          };
          return;
        }

        const controller = new AbortController();
        activeAbortControllerRef.current = controller;

        const onAssistantAbort = () => {
          controller.abort();
        };
        abortSignal?.addEventListener("abort", onAssistantAbort, { once: true });

        const formattedMessages = messages.map((m) => {
          const text = m.content
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("\n");
          return {
            role: m.role === "user" ? "user" : "model",
            content: text,
          };
        });

        try {
          const result = await generateContent(
            apiKeyRef.current.trim(),
            selectedModelRef.current,
            formattedMessages,
            controller.signal,
            currentBrochureDataRef.current
          );

          if (controller.signal.aborted || abortSignal?.aborted) return;

          if (result.brochureData) {
            onBrochureGenerated(result.brochureData);
            yield {
              content: [
                {
                  type: "text",
                  text: result.isEdit
                    ? `✅ Brochure updated with your requested changes! The preview on the right has been refreshed, and all your uploaded photos are preserved.`
                    : `✅ Brochure generated for "${result.brochureData.packageTitle}" with ${result.brochureData.days.length} day pages, inclusions, exclusions, and closing page.\n\nYou can preview the pages on the right, click any photo placeholder to upload photos, or ask for any edits/corrections right here.`,
                },
              ],
            };
          } else {
            yield {
              content: [
                {
                  type: "text",
                  text:
                    result.text ||
                    "Please provide tour package details, destinations, day-by-day itinerary, and hotel options.",
                },
              ],
            };
          }
        } catch (err: unknown) {
          if (
            controller.signal.aborted ||
            abortSignal?.aborted ||
            (err instanceof DOMException && err.name === "AbortError") ||
            (err instanceof Error && err.name === "AbortError")
          ) {
            // User stopped generation - exit cleanly
            return;
          }
          yield {
            content: [
              {
                type: "text",
                text: `❌ Error: ${err instanceof Error
                  ? err.message
                  : "Failed to generate brochure"
                  }. Please verify your API key or try another model.`,
              },
            ],
          };
        } finally {
          abortSignal?.removeEventListener("abort", onAssistantAbort);
          activeAbortControllerRef.current = null;
        }
      },
    }),
    [onBrochureGenerated]
  );

  const runtime = useLocalRuntime(chatModel);
  const isConnected = Boolean(apiKey.trim());

  // Track viewport scroll state to conditionally render ScrollToBottom button
  const [canScrollDown, setCanScrollDown] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const checkScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) {
      setCanScrollDown(false);
      return;
    }
    // Vertical scrollbar exists if content exceeds visible client height
    const hasScrollbar = el.scrollHeight > el.clientHeight + 10;
    // Not at bottom if user is scrolled away from bottom by more than 35px
    const notAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 35;

    setCanScrollDown(hasScrollbar && notAtBottom);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    checkScroll();

    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [checkScroll]);

  const activeModelDisplayName = useMemo(() => {
    if (!selectedModel) return "";
    const found = models.find((m) => m.name === selectedModel);
    return found?.displayName || selectedModel.replace(/^models\//, "");
  }, [models, selectedModel]);

  return (
    <Box
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "#ffffff",
      }}
    >
      <style>{KEYFRAMES_CSS}</style>

      {/* Sleek Minimalist Header */}
      <Box
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid #f1f5f9",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/ai-avatar.jpg"
            alt="AI Avatar"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          />
          <div>
            <Text size="sm" fw={600} c="#0f172a" style={{ lineHeight: 1.2 }}>
              Brochure Assistant
            </Text>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isConnected ? "#10b981" : "#94a3b8",
                }}
              />
              <Text size="xs" c="#64748b">
                {isConnected
                  ? activeModelDisplayName ||
                  (modelsLoading ? "Fetching models..." : "Select model below")
                  : "API key required"}
              </Text>
            </div>
          </div>
        </div>

        <Tooltip label="API Key Settings" position="bottom" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="md"
            onClick={handleOpenSettings}
            aria-label="API Key Settings"
            style={{ color: "#475569" }}
          >
            <Settings size={17} />
          </ActionIcon>
        </Tooltip>
      </Box>

      {/* Assistant UI Chat Thread Area */}
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            background: "#ffffff",
          }}
        >
          {/* Message Viewport */}
          <ThreadPrimitive.Viewport
            ref={viewportRef}
            onScroll={checkScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Empty Thread Screen */}
            <ThreadPrimitive.Empty>
              {!isConnected && (
                <Box
                  p="xl"
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 14,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                    margin: "24px 0",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Key size={18} color="#0f172a" />
                  </div>
                  <div>
                    <Text size="sm" fw={600} c="#0f172a" mb={4}>
                      Gemini API Key Required
                    </Text>
                    <Text size="xs" c="#64748b" maw={320} lh={1.6}>
                      Configure your Google Gemini API key to start creating
                      structured multi-page tour brochures.
                    </Text>
                  </div>
                  <Button
                    size="xs"
                    radius="md"
                    onClick={handleOpenSettings}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      fontWeight: 500,
                      marginTop: 4,
                    }}
                  >
                    Configure API Key
                  </Button>
                </Box>
              )}
            </ThreadPrimitive.Empty>

            {/* Messages */}
            <ThreadPrimitive.Messages components={THREAD_COMPONENTS} />
          </ThreadPrimitive.Viewport>

          {/* Floating Scroll-to-Bottom Button (only shown when there is a scrollbar and not at bottom) */}
          {canScrollDown && (
            <ThreadPrimitive.ScrollToBottom
              style={{
                position: "absolute",
                bottom: 108,
                right: 28,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                boxShadow: "0 2px 8px rgba(15, 23, 42, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#0f172a",
                zIndex: 10,
                animation: "assistantFadeIn 0.2s ease-out",
              }}
            >
              <ArrowDown size={15} />
            </ThreadPrimitive.ScrollToBottom>
          )}

          {/* Minimalist Capsule Input */}
          <ComposerPrimitive.Root
            style={{
              padding: "10px 18px 18px 18px",
              background: "#ffffff",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 20,
                padding: "12px 14px 10px 16px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                transition: "border-color 0.15s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#0f172a";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
            >
              {/* Textarea Input */}
              <ComposerPrimitive.Input
                placeholder={
                  isConnected
                    ? "Paste tour itinerary, inclusions, exclusions... (Enter to send, Shift+Enter for new line)"
                    : "Configure your Gemini API key in Settings (⚙️) to start chatting..."
                }
                disabled={!isConnected}
                minRows={1}
                maxRows={6}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  fontSize: 13.5,
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.5,
                  resize: "none",
                  outline: "none",
                  padding: "0 0 8px 0",
                  color: isConnected ? "#0f172a" : "#94a3b8",
                }}
              />

              {/* Bottom Toolbar row: Model selection on Left, Send/Stop on Right */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 6,
                  gap: 12,
                }}
              >
                {/* Left side: Frameless Model Selector Dropdown */}
                <Menu shadow="md" width={250} position="top-start" radius="md">
                  <Menu.Target>
                    <button
                      type="button"
                      disabled={!isConnected || modelsLoading}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor:
                          isConnected && !modelsLoading ? "pointer" : "default",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12.5,
                        fontWeight: 500,
                        color: isConnected ? "#475569" : "#94a3b8",
                        padding: "4px 8px",
                        borderRadius: 6,
                        transition: "all 0.15s ease",
                        outline: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (isConnected && !modelsLoading) {
                          e.currentTarget.style.color = "#0f172a";
                          e.currentTarget.style.background = "#f1f5f9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isConnected && !modelsLoading) {
                          e.currentTarget.style.color = "#475569";
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <span
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {!isConnected
                          ? "API Key Required"
                          : modelsLoading
                            ? "Loading..."
                            : activeModelDisplayName ||
                            selectedModel.replace(/^models\//, "") ||
                            "Select Model"}
                      </span>
                      <ChevronDown
                        size={13}
                        strokeWidth={2}
                        style={{ color: "#94a3b8", flexShrink: 0 }}
                      />
                    </button>
                  </Menu.Target>

                  <Menu.Dropdown style={{ maxHeight: 280, overflowY: "auto" }}>
                    <Menu.Label>Available Gemini Models</Menu.Label>
                    {models.length === 0 ? (
                      <Menu.Item
                        disabled
                        style={{ fontSize: 12, color: "#94a3b8" }}
                      >
                        {modelsLoading
                          ? "Fetching models..."
                          : "No models found"}
                      </Menu.Item>
                    ) : (
                      models.map((m) => {
                        const cleanName = m.name.replace(/^models\//, "");
                        const isSelected =
                          cleanName ===
                          selectedModel.replace(/^models\//, "");
                        return (
                          <Menu.Item
                            key={m.name}
                            onClick={() => {
                              setSelectedModel(cleanName);
                              try {
                                localStorage.setItem("gemini_model", cleanName);
                              } catch { }
                            }}
                            rightSection={
                              isSelected ? (
                                <Check
                                  size={14}
                                  color="#2563eb"
                                  strokeWidth={2.5}
                                />
                              ) : null
                            }
                            style={{
                              fontSize: 12.5,
                              fontWeight: isSelected ? 600 : 400,
                              color: isSelected ? "#0f172a" : "#334155",
                              background: isSelected ? "#f1f5f9" : undefined,
                            }}
                          >
                            {m.displayName || cleanName}
                          </Menu.Item>
                        );
                      })
                    )}
                  </Menu.Dropdown>
                </Menu>

                {/* Right side: Send / Stop Icon Toggle */}
                <div>
                  {/* Circular Blue Send Button */}
                  <ThreadPrimitive.If running={false}>
                    <ComposerPrimitive.Send
                      disabled={!isConnected || !selectedModel}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        background:
                          isConnected && selectedModel ? "#2563eb" : "#e2e8f0",
                        color:
                          isConnected && selectedModel ? "#ffffff" : "#94a3b8",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor:
                          isConnected && selectedModel
                            ? "pointer"
                            : "not-allowed",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (isConnected && selectedModel) {
                          (e.currentTarget as HTMLElement).style.background =
                            "#1d4ed8";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isConnected && selectedModel) {
                          (e.currentTarget as HTMLElement).style.background =
                            "#2563eb";
                        }
                      }}
                    >
                      <ArrowUp size={16} strokeWidth={2.4} />
                    </ComposerPrimitive.Send>
                  </ThreadPrimitive.If>

                  {/* Circular Stop Button with immediate abort onClick */}
                  <ThreadPrimitive.If running>
                    <Tooltip label="Stop generating" position="top" withArrow>
                      <ComposerPrimitive.Cancel
                        onClick={() => {
                          activeAbortControllerRef.current?.abort();
                        }}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          background: "#0f172a",
                          color: "#ffffff",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "#334155";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "#0f172a";
                        }}
                      >
                        <Square size={11} fill="currentColor" />
                      </ComposerPrimitive.Cancel>
                    </Tooltip>
                  </ThreadPrimitive.If>
                </div>
              </div>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>

      {/* Settings Modal (API Key + Connection Test) */}
      <Modal
        opened={settingsOpened}
        onClose={() => setSettingsOpened(false)}
        title={
          <Text fw={600} size="sm" c="#0f172a">
            API Key Configuration
          </Text>
        }
        centered
        radius="md"
        padding="lg"
      >
        <Box style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isConnected && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#10b981",
                  }}
                />
                <Text size="xs" c="#334155" fw={500}>
                  API key is saved locally
                </Text>
              </div>
              <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                leftSection={<Trash2 size={12} />}
                onClick={handleRemoveKey}
                style={{ fontSize: 11 }}
              >
                Remove Key
              </Button>
            </div>
          )}

          <div>
            <PasswordInput
              label="Google Gemini API Key"
              description={
                <span style={{ fontSize: 11.5 }}>
                  Get your API key from{" "}
                  <Anchor
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    size="xs"
                    c="#0f172a"
                    style={{
                      fontWeight: 500,
                      textDecoration: "underline",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    Google AI Studio <ExternalLink size={10} />
                  </Anchor>
                </span>
              }
              placeholder="Paste AI Studio API key (AIzaSy...)"
              value={tempApiKey}
              onChange={(e) => {
                setTempApiKey(e.target.value);
                setTestResult({ status: "idle" });
              }}
              styles={{
                label: {
                  fontWeight: 600,
                  fontSize: 12.5,
                  marginBottom: 2,
                  color: "#0f172a",
                },
                description: { marginBottom: 6, color: "#64748b" },
              }}
            />

            <Button
              size="xs"
              variant="default"
              mt="xs"
              onClick={handleTestConnection}
              loading={testResult.status === "testing"}
              leftSection={<RefreshCw size={12} />}
              disabled={!tempApiKey.trim()}
              style={{ borderColor: "#cbd5e1", color: "#334155" }}
            >
              Test Connection
            </Button>
          </div>

          {testResult.status === "success" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                fontSize: 12,
                color: "#166534",
              }}
            >
              <Check size={14} color="#16a34a" style={{ flexShrink: 0 }} />
              <span>{testResult.message}</span>
            </div>
          )}

          {testResult.status === "error" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                fontSize: 12,
                color: "#991b1b",
              }}
            >
              <AlertCircle size={14} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{testResult.message}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 6,
            }}
          >
            <Button
              variant="default"
              onClick={() => setSettingsOpened(false)}
              radius="md"
              size="xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              radius="md"
              size="xs"
              style={{ background: "#0f172a", color: "#ffffff" }}
              leftSection={<Check size={14} />}
            >
              Save API Key
            </Button>
          </div>
        </Box>
      </Modal>
    </Box>
  );
};