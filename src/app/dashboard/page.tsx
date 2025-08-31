'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageViewer } from '@/components/workspace/PageViewer';

// --- HELPER ICONS (Placeholder components) ---

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const UserCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 rounded-full text-gray-500" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0012 11z" clipRule="evenodd" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// --- UPDATED COMPONENT: UserProfile ---
const UserProfile: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('Logout successful');
        router.push('/login');
      } else {
        const data = await response.json();
        console.error('Logout failed:', data.error || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('An error occurred during logout:', error);
    } finally {
      setIsOpen(false);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 rounded-full">
        <UserCircleIcon />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-lg py-2 z-50 ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm text-gray-400">Signed in as</p>
            <p className="text-sm font-medium text-white truncate">user@motion-pro.com</p>
          </div>
          <div className="py-1">
            <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">Account Settings</a>
          </div>
          <div className="py-1 border-t border-gray-700">
            <button onClick={handleLogout} className="group flex items-center w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-red-600/50 hover:text-white">
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENT: Notifications ---
const Notifications: React.FC = () => {
  return (
    <button className="relative p-2 rounded-full group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500">
      <BellIcon />
      <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-gray-900"></span>
    </button>
  );
};

// --- COMPONENT: Header ---
const Header: React.FC = () => {
  return (
    <header className="flex-shrink-0 bg-gray-900 border-b border-gray-700/50">
      <div className="flex items-center justify-between p-2 h-16">
        <div className="text-gray-500"></div>
        <div className="flex items-center space-x-3 mr-2">
          <Notifications />
          <UserProfile />
        </div>
      </div>
    </header>
  );
};

// --- Error Component ---
const ErrorDisplay: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  return (
    <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-white">!</span>
        </div>
        <h2 className="text-2xl font-semibold text-red-400 mb-3">
          Failed to Load Workspace
        </h2>
        <p className="text-gray-400 mb-6">
          {error || 'An unexpected error occurred while loading your workspace.'}
        </p>
        <div className="space-y-3">
          <button 
            onClick={onRetry}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <p className="text-xs text-gray-500">
            If the problem persists, please check your database connection.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- DashboardContent Component with MySQL Integration ---
const DashboardContent: React.FC = () => {
  const { state, actions } = useWorkspace();

  // Retry function for error state
  const handleRetry = () => {
    actions.loadWorkspace();
  };

  // Loading state
  if (state.loading && !state.workspace) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Motion-Pro</h2>
          <p className="text-gray-400">Connecting to your workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error && !state.workspace) {
    return <ErrorDisplay error={state.error} onRetry={handleRetry} />;
  }

  // Main dashboard interface
  if (!state.workspace) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 bg-gray-700 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up workspace...</h2>
          <p className="text-gray-400">Please wait while we initialize your data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto">
          {/* Show error banner if there's an error but workspace is still loaded */}
          {state.error && (
            <div className="bg-red-900/50 border-l-4 border-red-500 p-4 mb-4 mx-4 mt-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-200">
                    {state.error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {state.currentPage ? (
            <PageViewer page={state.currentPage} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl font-bold text-white">MP</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-300 mb-3">
                  Welcome to Motion-Pro
                </h2>
                <p className="text-gray-500 mb-6">
                  Select a page from the sidebar to start editing content, or create a new page to begin your work.
                </p>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>💡 Tip: Click the + button next to any section to add pages</p>
                  <p>⚡ Use "/" in any text block for quick formatting</p>
                  <p>💬 Comments are available on every page</p>
                </div>
                <div className="mt-6 text-xs text-gray-500">
                  <p>Connected to: {state.workspace.name}</p>
                  <p>Sections: {state.workspace.sections.length}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// --- DashboardPage Component ---
const DashboardPage: React.FC = () => {
  return (
    <WorkspaceProvider>
      <DashboardContent />
    </WorkspaceProvider>
  );
};

export default DashboardPage;