import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Lightbulb } from "lucide-react";

interface SqlAgentPromptProps {
  onSubmit: (question: string, limit: number) => void;
  isLoading: boolean;
  initialValue?: string;
}

const suggestionChips = [
  "Contacts in Healthcare focus area with their opportunity names",
  "Opportunities by sector and tier with investment professionals",
  "Top contacts by interactions count with recent meeting info",
  "All contacts with their latest emails and meeting subjects"
];

export function SqlAgentPrompt({ onSubmit, isLoading, initialValue = "" }: SqlAgentPromptProps) {
  const [question, setQuestion] = useState(initialValue);
  const [limit, setLimit] = useState(500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SqlAgentPrompt handleSubmit called', { question: question.trim(), limit, isLoading });
    if (!question.trim() || isLoading) return;
    console.log('Calling onSubmit with:', { question: question.trim(), limit });
    onSubmit(question.trim(), limit);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const characterCount = question.length;
  const maxLength = 2000;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          What would you like to see?
        </h2>
        <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
          <Lightbulb className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            <span className="font-medium">Be specific</span> — include columns, filters, and limits 
            (e.g., full_name, email, interactions_count, opportunity_names; Healthcare; limit 500).
          </p>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-600 mb-3">Quick suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestionChips.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what data you want to see... (e.g., 'Show me all contacts in Healthcare with their recent interactions')"
            className="min-h-[120px] resize-none text-base"
            maxLength={maxLength}
            disabled={isLoading}
            aria-label="Data query prompt"
          />
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Press Shift+Enter for new line, Enter to send</span>
            <span className={characterCount > maxLength * 0.9 ? 'text-amber-600' : ''}>
              {characterCount}/{maxLength}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <label htmlFor="limit" className="text-sm font-medium text-gray-600">
              Limit results:
            </label>
            <select
              id="limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isLoading}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            >
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Send Query</span>
          </Button>
        </div>
      </form>
    </div>
  );
}