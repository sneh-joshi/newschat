interface Props {
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ questions, onSelect }: Props) {
  return (
    <div className="px-3 pb-3">
      <p className="text-xs text-gray-500 mb-2 font-medium">Suggested questions</p>
      <div className="flex flex-col gap-1.5">
        {questions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-left text-xs text-gray-300 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg px-3 py-2 transition-all active:scale-[0.98]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
