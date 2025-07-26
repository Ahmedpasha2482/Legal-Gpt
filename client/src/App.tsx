import React from 'react';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gradient">
                  ⚖️ Criminal Law AI
                </h1>
              </div>
              <div className="hidden md:block ml-6">
                <p className="text-sm text-gray-600">
                  India's Best Legal Assistant - Powered by AI
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                🟢 Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🏛️ World's Best Criminal Law AI Chatbot
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get expert legal assistance for Indian Criminal Law powered by advanced AI. 
              Covering BNS 2023, BNSS 2023, BSA 2023, and all legacy laws with smart conflict resolution.
            </p>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              <div className="card p-6">
                <div className="text-3xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold mb-2">AI-Powered Assistant</h3>
                <p className="text-gray-600">
                  Grok API integration with RAG technology for accurate, source-based legal responses.
                </p>
              </div>
              
              <div className="card p-6">
                <div className="text-3xl mb-4">📚</div>
                <h3 className="text-lg font-semibold mb-2">Comprehensive Coverage</h3>
                <p className="text-gray-600">
                  Latest 2023 laws (BNS, BNSS, BSA) with automatic mapping to legacy acts (IPC, CrPC).
                </p>
              </div>
              
              <div className="card p-6">
                <div className="text-3xl mb-4">🔄</div>
                <h3 className="text-lg font-semibold mb-2">Smart Law Mapping</h3>
                <p className="text-gray-600">
                  Automatic conflict detection and preference for newer laws with transparent citations.
                </p>
              </div>
              
              <div className="card p-6">
                <div className="text-3xl mb-4">📁</div>
                <h3 className="text-lg font-semibold mb-2">Document Analysis</h3>
                <p className="text-gray-600">
                  Upload case files for AI-powered analysis, summaries, and legal recommendations.
                </p>
              </div>
              
              <div className="card p-6">
                <div className="text-3xl mb-4">💬</div>
                <h3 className="text-lg font-semibold mb-2">Professional Chat</h3>
                <p className="text-gray-600">
                  Multi-case support with memory, export capabilities, and lawyer-grade insights.
                </p>
              </div>
              
              <div className="card p-6">
                <div className="text-3xl mb-4">🌐</div>
                <h3 className="text-lg font-semibold mb-2">Multilingual Support</h3>
                <p className="text-gray-600">
                  English and Hinglish support for wider accessibility across India.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <button className="btn-primary px-8 py-3 text-lg">
                🚀 Start Legal Consultation
              </button>
              <button className="btn-outline px-8 py-3 text-lg">
                📖 View Documentation
              </button>
            </div>

            {/* Legal Coverage */}
            <div className="card p-8 mb-8">
              <h2 className="text-2xl font-bold mb-6">📋 Legal Acts Covered</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-green-600">✅ Latest Laws (2023)</h3>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-center">
                      <span className="badge-success mr-2">NEW</span>
                      Bharatiya Nyaya Sanhita (BNS) 2023
                    </li>
                    <li className="flex items-center">
                      <span className="badge-success mr-2">NEW</span>
                      Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023
                    </li>
                    <li className="flex items-center">
                      <span className="badge-success mr-2">NEW</span>
                      Bharatiya Sakshya Adhiniyam (BSA) 2023
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-600">📚 Legacy Laws</h3>
                  <ul className="space-y-2 text-left">
                    <li className="flex items-center">
                      <span className="badge-gray mr-2">LEGACY</span>
                      Indian Penal Code (IPC) 1860
                    </li>
                    <li className="flex items-center">
                      <span className="badge-gray mr-2">LEGACY</span>
                      Criminal Procedure Code (CrPC) 1973
                    </li>
                    <li className="flex items-center">
                      <span className="badge-gray mr-2">LEGACY</span>
                      Indian Evidence Act 1872
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 text-purple-600">⚖️ Special Acts</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="badge-primary">Juvenile Justice Act</span>
                  <span className="badge-primary">NDPS Act 1985</span>
                  <span className="badge-primary">POCSO Act 2012</span>
                </div>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">🔧 Powered By</h2>
              <div className="flex flex-wrap gap-4 justify-center text-sm">
                <span className="badge-gray">🤖 Grok API (X.AI)</span>
                <span className="badge-gray">⚛️ React 19 + TypeScript</span>
                <span className="badge-gray">🟢 Node.js + Express</span>
                <span className="badge-gray">🍃 MongoDB</span>
                <span className="badge-gray">🎨 Tailwind CSS</span>
                <span className="badge-gray">🔍 Vector Search (RAG)</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-gray-200">
            <div className="text-center text-gray-600">
              <p className="mb-2">
                <strong>⚠️ Legal Disclaimer:</strong> This AI assistant provides information only. 
                Always consult qualified legal professionals for official advice.
              </p>
              <p className="text-sm">
                Built with ❤️ for the Indian Legal Community | 
                Strictly focused on Criminal Law | 
                Zero Hallucination Guarantee
              </p>
              <p className="text-xs mt-2 text-gray-500">
                Criminal Law AI Chatbot v1.0.0 | © 2024 | 
                Designed for Lawyers, Students & Legal Researchers
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
