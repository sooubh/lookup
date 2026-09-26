import type { Message } from '@extension/storage';
import { ACTOR_PROFILES } from '../types/message';
import { memo } from 'react';

interface MessageListProps {
  messages: Message[];
  isDarkMode?: boolean;
}

export default memo(function MessageList({ messages, isDarkMode = false }: MessageListProps) {
  return (
    <div className="max-w-full space-y-4">
      {messages.map((message, index) => (
        <MessageBlock
          key={`${message.actor}-${message.timestamp}-${index}`}
          message={message}
          isSameActor={index > 0 ? messages[index - 1].actor === message.actor : false}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
});

interface MessageBlockProps {
  message: Message;
  isSameActor: boolean;
  isDarkMode?: boolean;
}

function MessageBlock({ message, isSameActor, isDarkMode = false }: MessageBlockProps) {
  if (!message.actor) {
    console.error('No actor found');
    return <div />;
  }
  const actor = ACTOR_PROFILES[message.actor as keyof typeof ACTOR_PROFILES];
  const isProgress = message.content === 'Showing progress...';

  const isUser = message.actor === 'user';

  return (
    <div
      className={`flex max-w-full gap-3 ${
        !isSameActor
          ? `mt-3.5 border-t ${isDarkMode ? 'border-slate-800/60' : 'border-slate-200/60'} pt-3.5 first:mt-0 first:border-t-0 first:pt-0`
          : 'mt-1.5'
      }`}>
      {!isSameActor && (
        <div
          className="flex size-7 shrink-0 items-center justify-center rounded-lg shadow-2xs"
          style={{ backgroundColor: isUser ? '#0284C7' : actor.iconBackground }}>
          <img src={actor.icon} alt={actor.name} className="size-4.5" />
        </div>
      )}
      {isSameActor && <div className="w-7 shrink-0" />}

      <div className="min-w-0 flex-1">
        {!isSameActor && (
          <div className="mb-1 flex items-center gap-2">
            <span className={`text-xs font-bold tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {actor.name}
            </span>
            <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <div
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
              isUser
                ? `rounded-xl rounded-tl-xs px-3 py-2 border ${
                    isDarkMode
                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-100'
                      : 'border-sky-200 bg-sky-50/80 text-sky-950'
                  }`
                : isDarkMode
                  ? 'text-slate-200'
                  : 'text-slate-800'
            }`}>
            {isProgress ? (
              <div className={`h-1.5 overflow-hidden rounded-full ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className="h-full animate-progress bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" />
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Formats a timestamp (in milliseconds) to a readable time string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted time string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if the message is from today
  const isToday = date.toDateString() === now.toDateString();

  // Check if the message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  // Check if the message is from this year
  const isThisYear = date.getFullYear() === now.getFullYear();

  // Format the time (HH:MM)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeStr; // Just show the time for today's messages
  }

  if (isYesterday) {
    return `Yesterday, ${timeStr}`;
  }

  if (isThisYear) {
    // Show month and day for this year
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  }

  // Show full date for older messages
  return `${date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}, ${timeStr}`;
}
