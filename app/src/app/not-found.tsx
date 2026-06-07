import Link from 'next/link'
import { Waves, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-900 via-sea-800 to-deep-700 flex items-center justify-center p-6">
      <div className="text-center text-white max-w-md">
        <div className="w-20 h-20 bg-white/15 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Waves className="w-10 h-10 text-white" />
        </div>
        <div className="font-display text-8xl font-bold text-white/20 mb-2">404</div>
        <h1 className="font-display text-3xl font-semibold mb-3">Страница не найдена</h1>
        <p className="text-white/70 mb-8 leading-relaxed">
          Кажется, эта страница уплыла в открытое море. Вернитесь на главную и выберите нужный раздел.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-deep-700 rounded-2xl font-semibold hover:-translate-y-1 transition-all duration-300 hover:shadow-xl"
        >
          <ArrowLeft className="w-4 h-4" /> На главную
        </Link>
      </div>
    </div>
  )
}
