'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/favicon.png"
              alt="모두의연구소"
              className="w-10 h-10 rounded-xl"
            />
            <span className="font-bold text-xl text-gray-900">
              모두의연구소 <span className="text-primary">LAB</span>
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
