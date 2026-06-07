'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, Waves, ArrowLeft, LogOut,
  Calendar, BedDouble, Settings
} from 'lucide-react'

interface LinkItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const navLinks: LinkItem[] = [
  { href: '/admin/bookings', label: 'Бронирования', icon: Calendar },
  { href: '/admin/rooms', label: 'Номера', icon: BedDouble },
  { href: '/admin/settings', label: 'Настройки', icon: Settings },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
}

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Close sidebar drawer automatically on route navigation
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Disable page body scrolling when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row antialiased">
      
      {/* Mobile Header Bar */}
      <header className="lg:hidden h-16 bg-deep-800 text-white flex items-center justify-between px-4 sticky top-0 z-40 border-b border-white/10 shadow-sm">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sea-500 rounded-lg flex items-center justify-center">
            <Waves className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide">Панель управления</span>
        </Link>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 -mr-1 rounded-lg hover:bg-white/10 text-white/80 active:scale-95 transition-all outline-none"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 z-35 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Responsive Sidebar (Aside) */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-deep-800 text-white flex flex-col z-40 transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:h-screen lg:w-60 lg:flex-shrink-0 lg:overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar Header - Hidden on mobile screen since header is present */}
        <div className="p-5 border-b border-white/10 hidden lg:block">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-sea-500 rounded-xl flex items-center justify-center">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display font-semibold text-sm">Панель управления</div>
              <div className="text-white/50 text-xs">Администратор</div>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar Head with Close Button */}
        <div className="p-4 border-b border-white/10 flex lg:hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sea-500 rounded-lg flex items-center justify-center">
              <Waves className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="font-semibold text-xs text-white/90">Администратор</div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = link.exact 
              ? pathname === link.href 
              : pathname.startsWith(link.href)
            
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`admin-sidebar-link text-sm flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-sea-600 text-white font-bold shadow-xs' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <link.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-white/60'}`} />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Bottom Actions */}
        <div className="p-3 border-t border-white/10 space-y-0.5">
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL || '/'}
            className="admin-sidebar-link text-white/60 hover:text-white hover:bg-white/5 text-xs flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/55" /> На сайт
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/admin/auth/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="admin-sidebar-link w-full text-white/60 hover:text-red-400 hover:bg-red-500/10 text-xs flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-white/55" /> Выйти
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
