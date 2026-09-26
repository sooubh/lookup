import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FiMic, FiPaperclip, FiX, FiSend, FiSquare, FiRotateCcw } from 'react-icons/fi';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { t } from '@extension/i18n';

interface ChatInputProps {
  onSendMessage: (text: string, displayText?: string) => void;
  onStopTask: () => void;
  onMicClick?: () => void;
  isRecording?: boolean;
  isProcessingSpeech?: boolean;
  disabled: boolean;
  showStopButton: boolean;
  setContent?: (setter: (text: string) => void) => void;
  isDarkMode?: boolean;
  // Historical session ID - if provided, shows replay button instead of send button
  historicalSessionId?: string | null;
  onReplay?: (sessionId: string) => void;
}

// File attachment interface
interface AttachedFile {
  name: string;
  content: string;
  type: string;
}

export default function ChatInput({
  onSendMessage,
  onStopTask,
  onMicClick,
  isRecording = false,
  isProcessingSpeech = false,
  disabled,
  showStopButton,
  setContent,
  isDarkMode = false,
  historicalSessionId,
  onReplay,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const isSendButtonDisabled = useMemo(
    () => disabled || (text.trim() === '' && attachedFiles.length === 0),
    [disabled, text, attachedFiles],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle text changes and resize textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Resize textarea
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  };

  // Expose a method to set content from outside
  useEffect(() => {
    if (setContent) {
      setContent(setText);
    }
  }, [setContent]);

  // Initial resize when component mounts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedText = text.trim();

      if (trimmedText || attachedFiles.length > 0) {
        let messageContent = trimmedText;
        let displayContent = trimmedText;

        // Security: Clearly separate user input from file content
        // The background service will sanitize file content using guardrails
        if (attachedFiles.length > 0) {
          const fileContents = attachedFiles
            .map(file => {
              // Tag file content for background service to identify and sanitize
              return `\n\n<nano_file_content type="file" name="${file.name}">\n${file.content}\n</nano_file_content>`;
            })
            .join('\n');

          // Combine user message with tagged file content (for background service)
          messageContent = trimmedText
            ? `${trimmedText}\n\n<nano_attached_files>${fileContents}</nano_attached_files>`
            : `<nano_attached_files>${fileContents}</nano_attached_files>`;

          // Create display version with only filenames (for UI)
          const fileList = attachedFiles.map(file => `[File: ${file.name}]`).join('\n');
          displayContent = trimmedText ? `${trimmedText}\n\n${fileList}` : fileList;
        }

        onSendMessage(messageContent, displayContent);
        setText('');
        setAttachedFiles([]);
      }
    },
    [text, attachedFiles, onSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const handleReplay = useCallback(() => {
    if (historicalSessionId && onReplay) {
      onReplay(historicalSessionId);
    }
  }, [historicalSessionId, onReplay]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFile[] = [];
    const allowedTypes = ['.txt', '.md', '.markdown', '.json', '.csv', '.log', '.xml', '.yaml', '.yml'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      // Check if file type is allowed
      if (!allowedTypes.includes(fileExt)) {
        console.warn(`File type ${fileExt} not supported. Only text-based files are allowed.`);
        continue;
      }

      // Check file size (limit to 1MB)
      if (file.size > 1024 * 1024) {
        console.warn(`File ${file.name} is too large. Maximum size is 1MB.`);
        continue;
      }

      try {
        const content = await file.text();
        newFiles.push({
          name: file.name,
          content,
          type: file.type || 'text/plain',
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className={`overflow-hidden rounded-xl border transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed opacity-75'
          : 'focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 hover:border-sky-400'
      } ${isDarkMode ? 'border-slate-700/80 bg-slate-800/90 shadow-sm' : 'border-slate-200/90 bg-white shadow-2xs'}`}
      aria-label={t('chat_input_form')}>
      <div className="flex flex-col">
        {/* File attachments display */}
        {attachedFiles.length > 0 && (
          <div
            className={`flex flex-wrap gap-1.5 border-b p-2 ${
              isDarkMode ? 'border-slate-700/70 bg-slate-800/60' : 'border-slate-100 bg-slate-50'
            }`}>
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-200/80 text-slate-700'
                }`}>
                <FiPaperclip className="size-3 shrink-0 opacity-70" />
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className={`ml-0.5 rounded p-0.5 transition-colors ${
                    isDarkMode
                      ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-100'
                      : 'hover:bg-slate-300 text-slate-500 hover:text-slate-800'
                  }`}
                  aria-label={`Remove ${file.name}`}>
                  <FiX className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-disabled={disabled}
          rows={3}
          className={`w-full resize-none border-none px-3.5 py-2.5 text-sm leading-relaxed focus:outline-none ${
            disabled
              ? isDarkMode
                ? 'cursor-not-allowed bg-transparent text-slate-500 placeholder-slate-600'
                : 'cursor-not-allowed bg-transparent text-slate-400 placeholder-slate-400'
              : isDarkMode
                ? 'bg-transparent text-slate-100 placeholder-slate-400'
                : 'bg-transparent text-slate-800 placeholder-slate-400'
          }`}
          placeholder={attachedFiles.length > 0 ? 'Add a message (optional)...' : t('chat_input_placeholder')}
          aria-label={t('chat_input_editor')}
        />

        <div
          className={`flex items-center justify-between px-3 py-2 border-t ${
            isDarkMode ? 'border-slate-700/50 bg-slate-800/40' : 'border-slate-100 bg-slate-50/50'
          }`}>
          <div className="flex items-center gap-1 text-slate-500">
            {/* File attachment button */}
            <button
              type="button"
              onClick={handleFileSelect}
              disabled={disabled}
              aria-label="Attach files"
              title="Attach text files (.txt, .md, .json, etc.)"
              className={`rounded-lg p-1.5 transition-all ${
                disabled
                  ? 'cursor-not-allowed opacity-40'
                  : isDarkMode
                    ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 active:scale-95'
                    : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 active:scale-95'
              }`}>
              <FiPaperclip className="size-4" />
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.markdown,.json,.csv,.log,.xml,.yaml,.yml"
              onChange={handleFileChange}
              className="hidden"
              aria-hidden="true"
            />

            {onMicClick && (
              <button
                type="button"
                onClick={onMicClick}
                disabled={disabled || isProcessingSpeech}
                aria-label={
                  isProcessingSpeech
                    ? t('chat_stt_processing')
                    : isRecording
                      ? t('chat_stt_recording_stop')
                      : t('chat_stt_input_start')
                }
                className={`rounded-lg p-1.5 transition-all ${
                  disabled || isProcessingSpeech
                    ? 'cursor-not-allowed opacity-40'
                    : isRecording
                      ? 'bg-rose-500 text-white hover:bg-rose-600 animate-pulse'
                      : isDarkMode
                        ? 'text-slate-400 hover:bg-slate-700/80 hover:text-slate-200 active:scale-95'
                        : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 active:scale-95'
                }`}>
                {isProcessingSpeech ? (
                  <AiOutlineLoading3Quarters className="size-4 animate-spin text-sky-500" />
                ) : (
                  <FiMic className="size-4" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showStopButton ? (
              <button
                type="button"
                onClick={onStopTask}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-rose-500 active:scale-95">
                <FiSquare className="size-3" />
                <span>{t('chat_buttons_stop')}</span>
              </button>
            ) : historicalSessionId ? (
              <button
                type="button"
                onClick={handleReplay}
                disabled={!historicalSessionId}
                aria-disabled={!historicalSessionId}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all hover:enabled:bg-emerald-500 active:scale-95 ${
                  !historicalSessionId ? 'cursor-not-allowed opacity-50' : ''
                }`}>
                <FiRotateCcw className="size-3" />
                <span>{t('chat_buttons_replay')}</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSendButtonDisabled}
                aria-disabled={isSendButtonDisabled}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-all ${
                  isSendButtonDisabled
                    ? isDarkMode
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-95 cursor-pointer shadow-sky-500/20'
                }`}>
                <span>{t('chat_buttons_send')}</span>
                <FiSend className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
