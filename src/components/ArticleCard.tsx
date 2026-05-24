import type { ArticleData } from '../types'

interface Props {
  article: ArticleData
}

export function ArticleCard({ article }: Props) {
  const wordCount = article.wordCount
  const readTime = Math.ceil(wordCount / 200)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 mb-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
          {article.siteName ?? 'Article'}
        </span>
        <span className="text-gray-600 text-xs">·</span>
        <span className="text-xs text-gray-500">{readTime} min read</span>
      </div>

      <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2 mb-1">
        {article.title}
      </h2>

      {article.byline && (
        <p className="text-xs text-gray-500">{article.byline}</p>
      )}

      <div className="mt-2 pt-2 border-t border-gray-800 flex items-center justify-between">
        <span className="text-xs text-green-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
          Article loaded
        </span>
        <span className="text-xs text-gray-600">{wordCount.toLocaleString()} words</span>
      </div>
    </div>
  )
}
