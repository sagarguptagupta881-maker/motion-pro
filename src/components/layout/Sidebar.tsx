'use client';

import React, { useState } from 'react';
import { 
  Search, Inbox, ChevronDown, ChevronRight, Plus, 
  MoreHorizontal, Edit3, Trash2, X, Check
} from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContext';
import { Section, Subsection, PageItem } from '@/types';

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSubsectionTitle, setNewSubsectionTitle] = useState('');
  const [showNewSectionForm, setShowNewSectionForm] = useState(false);
  const [showNewSubsectionForm, setShowNewSubsectionForm] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ 
    type: 'section' | 'subsection'; 
    id: string; 
    sectionId?: string; 
    x: number; 
    y: number;
  } | null>(null);

  const toggleSection = (sectionId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', payload: sectionId });
  };

  const openPage = (page: PageItem) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
    dispatch({ type: 'SET_FULL_SCREEN', payload: false });
  };

  const createNewPage = (sectionId: string, subsectionId?: string) => {
    const newPage: PageItem = {
      id: `page-${Date.now()}`,
      title: 'Untitled',
      icon: '📄',
      type: 'page',
      content: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    dispatch({ 
      type: 'ADD_PAGE', 
      payload: { sectionId, subsectionId, page: newPage } 
    });
    
    openPage(newPage);
  };

  const createNewSection = () => {
    if (!newSectionTitle.trim()) return;
    
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: newSectionTitle,
      icon: '📁',
      pages: [],
      subsections: [
        { id: `sub-mgmt-${Date.now()}`, title: 'Management', pages: [], order: 1 },
        { id: `sub-exec-${Date.now()}`, title: 'Execution', pages: [], order: 2 },
        { id: `sub-inbox-${Date.now()}`, title: 'Inbox', pages: [], order: 3 }
      ],
      order: (state.workspace?.sections.length || 0) + 1
    };

    dispatch({ type: 'ADD_SECTION', payload: newSection });
    setNewSectionTitle('');
    setShowNewSectionForm(false);
    dispatch({ type: 'TOGGLE_SECTION', payload: newSection.id });
  };

  const updateSection = (sectionId: string, newTitle: string) => {
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    if (section) {
      const updatedSection = { ...section, title: newTitle };
      dispatch({ type: 'UPDATE_SECTION', payload: updatedSection });
    }
    setEditingSection(null);
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Delete this section and all its content?')) {
      dispatch({ type: 'DELETE_SECTION', payload: sectionId });
    }
    setContextMenu(null);
  };

  const createNewSubsection = (sectionId: string) => {
    if (!newSubsectionTitle.trim()) return;
    
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    const newSubsection: Subsection = {
      id: `subsection-${Date.now()}`,
      title: newSubsectionTitle,
      pages: [],
      order: (section?.subsections?.length || 0) + 1
    };

    dispatch({ 
      type: 'ADD_SUBSECTION', 
      payload: { sectionId, subsection: newSubsection } 
    });
    setNewSubsectionTitle('');
    setShowNewSubsectionForm(null);
  };

  const updateSubsection = (sectionId: string, subsectionId: string, newTitle: string) => {
    const section = state.workspace?.sections.find(s => s.id === sectionId);
    const subsection = section?.subsections?.find(sub => sub.id === subsectionId);
    
    if (subsection) {
      const updatedSubsection = { ...subsection, title: newTitle };
      dispatch({ 
        type: 'UPDATE_SUBSECTION', 
        payload: { sectionId, subsection: updatedSubsection } 
      });
    }
    setEditingSubsection(null);
  };

  const deleteSubsection = (sectionId: string, subsectionId: string) => {
    if (confirm('Delete this subsection and all its pages?')) {
      dispatch({ 
        type: 'DELETE_SUBSECTION', 
        payload: { sectionId, subsectionId } 
      });
    }
    setContextMenu(null);
  };

  const handleRightClick = (e: React.MouseEvent, type: 'section' | 'subsection', id: string, sectionId?: string) => {
    e.preventDefault();
    setContextMenu({
      type,
      id,
      sectionId,
      x: e.clientX,
      y: e.clientY
    });
  };

  const ContextMenu = () => {
    if (!contextMenu) return null;

    return (
      <div 
        className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 z-50 min-w-[120px]"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onMouseLeave={() => setContextMenu(null)}
      >
        <button
          onClick={() => {
            if (contextMenu.type === 'section') {
              setEditingSection(contextMenu.id);
            } else {
              setEditingSubsection(contextMenu.id);
            }
            setContextMenu(null);
          }}
          className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-2"
        >
          <Edit3 className="w-3 h-3" />
          <span>Rename</span>
        </button>
        <button
          onClick={() => {
            if (contextMenu.type === 'section') {
              deleteSection(contextMenu.id);
            } else if (contextMenu.sectionId) {
              deleteSubsection(contextMenu.sectionId, contextMenu.id);
            }
          }}
          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-600 hover:text-white transition-colors flex items-center space-x-2"
        >
          <Trash2 className="w-3 h-3" />
          <span>Delete</span>
        </button>
      </div>
    );
  };

  if (!state.workspace) {
    return (
      <div className="w-60 bg-gray-850 border-r border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400 text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-60 bg-gray-850 border-r border-gray-700 flex flex-col h-full">
        {/* Workspace Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <span className="text-xs font-bold text-white">A</span>
              </div>
              <span className="font-medium text-white">{state.workspace.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
            <button
              onClick={() => setShowNewSectionForm(true)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
              title="Add new section"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Search and Navigation */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-9 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button className="flex items-center justify-between w-full text-gray-300 hover:text-white transition-colors">
            <div className="flex items-center space-x-2">
              <Inbox className="w-4 h-4" />
              <span className="text-sm">Inbox</span>
            </div>
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">3</span>
          </button>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Shared</div>
            
            <div className="space-y-1">
              <button className="w-full flex items-center space-x-2 px-2 py-2 rounded text-sm bg-gray-700 text-white">
                <span className="text-base">🤝</span>
                <span>Collaboration Hub</span>
              </button>

              {/* New Section Form */}
              {showNewSectionForm && (
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Section name..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') createNewSection();
                      if (e.key === 'Escape') {
                        setShowNewSectionForm(false);
                        setNewSectionTitle('');
                      }
                    }}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={createNewSection}
                      className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowNewSectionForm(false);
                        setNewSectionTitle('');
                      }}
                      className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex items-center space-x-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Sections */}
              {state.workspace.sections.map(section => (
                <div key={section.id}>
                  <div className="group relative">
                    {editingSection === section.id ? (
                      <div className="flex items-center space-x-2 px-2 py-2">
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                        <span className="text-base flex-shrink-0">{section.icon}</span>
                        <input
                          type="text"
                          defaultValue={section.title}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateSection(section.id, (e.target as HTMLInputElement).value);
                            }
                            if (e.key === 'Escape') setEditingSection(null);
                          }}
                          onBlur={(e) => updateSection(section.id, e.target.value)}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleSection(section.id)}
                        onContextMenu={(e) => handleRightClick(e, 'section', section.id)}
                        className="w-full flex items-center justify-between px-2 py-2 rounded text-sm text-gray-300 hover:text-white hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex items-center space-x-2">
                          {state.expandedSections.includes(section.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="text-base">{section.icon}</span>
                          <span>{section.title}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowNewSubsectionForm(section.id);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="Add subsection"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRightClick(e, 'section', section.id);
                            }}
                            className="p-1 hover:bg-gray-700 rounded"
                            title="More options"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                  
                  {state.expandedSections.includes(section.id) && (
                    <div className="ml-6 space-y-1">
                      {/* Direct pages */}
                      {section.pages.map(page => (
                        <button
                          key={page.id}
                          onClick={() => openPage(page)}
                          className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors ${
                            state.currentPage?.id === page.id
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          <span className="text-sm">{page.icon}</span>
                          <span className="truncate">{page.title}</span>
                        </button>
                      ))}
                      
                      {/* New Subsection Form */}
                      {showNewSubsectionForm === section.id && (
                        <div className="ml-2 bg-gray-800 border border-gray-600 rounded-lg p-2 space-y-2">
                          <input
                            type="text"
                            value={newSubsectionTitle}
                            onChange={(e) => setNewSubsectionTitle(e.target.value)}
                            placeholder="Subsection name..."
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') createNewSubsection(section.id);
                              if (e.key === 'Escape') {
                                setShowNewSubsectionForm(null);
                                setNewSubsectionTitle('');
                              }
                            }}
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => createNewSubsection(section.id)}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                            <button
                              onClick={() => {
                                setShowNewSubsectionForm(null);
                                setNewSubsectionTitle('');
                              }}
                              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 flex items-center space-x-1"
                            >
                              <X className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Subsections */}
                      {section.subsections?.map(subsection => (
                        <div key={subsection.id} className="ml-2">
                          <div className="group relative">
                            {editingSubsection === subsection.id ? (
                              <div className="flex items-center space-x-2 py-1">
                                <input
                                  type="text"
                                  defaultValue={subsection.title}
                                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateSubsection(section.id, subsection.id, (e.target as HTMLInputElement).value);
                                    }
                                    if (e.key === 'Escape') setEditingSubsection(null);
                                  }}
                                  onBlur={(e) => updateSubsection(section.id, subsection.id, e.target.value)}
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center justify-between py-1 group hover:bg-gray-800 rounded px-2"
                                onContextMenu={(e) => handleRightClick(e, 'subsection', subsection.id, section.id)}
                              >
                                <div className="text-xs text-gray-500 font-medium">{subsection.title}</div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                                  <button
                                    onClick={() => createNewPage(section.id, subsection.id)}
                                    className="p-1 hover:bg-gray-700 rounded transition-all"
                                    title="Add page"
                                  >
                                    <Plus className="w-3 h-3 text-gray-400" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRightClick(e, 'subsection', subsection.id, section.id);
                                    }}
                                    className="p-1 hover:bg-gray-700 rounded transition-all"
                                    title="More options"
                                  >
                                    <MoreHorizontal className="w-3 h-3 text-gray-400" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Pages in subsection */}
                          {subsection.pages.map(page => (
                            <button
                              key={page.id}
                              onClick={() => openPage(page)}
                              className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors group ${
                                state.currentPage?.id === page.id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              }`}
                            >
                              <span className="text-sm">{page.icon}</span>
                              <span className="truncate text-xs flex-1 text-left">{page.title}</span>
                              {page.status && (
                                <span className={`w-2 h-2 rounded-full ${
                                  page.status === 'Management' ? 'bg-gray-500' :
                                  page.status === 'Execution' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}></span>
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                      
                      {/* Add page button */}
                      <button
                        onClick={() => createNewPage(section.id)}
                        className="w-full flex items-center space-x-2 px-2 py-1 rounded text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="text-xs">Add page</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 border-t border-gray-700">
          <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
            Join or create workspace
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <ContextMenu />
      
      {/* Click outside to close context menu */}
      {contextMenu && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}
    </>
  );
};