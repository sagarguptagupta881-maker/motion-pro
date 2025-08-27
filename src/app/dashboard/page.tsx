'use client';

import React, { useEffect } from 'react';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageViewer } from '@/components/workspace/PageViewer';
import { mockWorkspaceData } from '@/lib/mockData';

const DashboardContent: React.FC = () => {
  const { state, dispatch } = useWorkspace();

  useEffect(() => {
    // Initialize workspace data
    dispatch({ type: 'SET_WORKSPACE', payload: mockWorkspaceData });
  }, [dispatch]);

  if (!state.workspace) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Motion-Pro</h2>
          <p className="text-gray-400">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {state.currentPage ? (
          <PageViewer page={state.currentPage} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  return (
    <WorkspaceProvider>
      <DashboardContent />
    </WorkspaceProvider>
  );
};

export default DashboardPage;