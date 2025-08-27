'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Workspace, PageItem, Section, Subsection, Comment } from '@/types';

interface WorkspaceState {
  workspace: Workspace | null;
  currentPage: PageItem | null;
  comments: Record<string, Comment[]>;
  isFullScreen: boolean;
  editingBlockId: string | null;
  expandedSections: string[];
}

type WorkspaceAction =
  | { type: 'SET_WORKSPACE'; payload: Workspace }
  | { type: 'SET_CURRENT_PAGE'; payload: PageItem | null }
  | { type: 'UPDATE_PAGE'; payload: PageItem }
  | { type: 'ADD_COMMENT'; payload: { pageId: string; comment: Comment } }
  | { type: 'SET_FULL_SCREEN'; payload: boolean }
  | { type: 'SET_EDITING_BLOCK'; payload: string | null }
  | { type: 'ADD_SECTION'; payload: Section }
  | { type: 'UPDATE_SECTION'; payload: Section }
  | { type: 'DELETE_SECTION'; payload: string }
  | { type: 'TOGGLE_SECTION'; payload: string }
  | { type: 'ADD_SUBSECTION'; payload: { sectionId: string; subsection: Subsection } }
  | { type: 'UPDATE_SUBSECTION'; payload: { sectionId: string; subsection: Subsection } }
  | { type: 'DELETE_SUBSECTION'; payload: { sectionId: string; subsectionId: string } }
  | { type: 'ADD_PAGE'; payload: { sectionId: string; subsectionId?: string; page: PageItem } }
  | { type: 'DELETE_PAGE'; payload: { pageId: string } };

const initialState: WorkspaceState = {
  workspace: null,
  currentPage: null,
  comments: {},
  isFullScreen: false,
  editingBlockId: null,
  expandedSections: ['overall', 'marketing', 'bd-sales'],
};

const workspaceReducer = (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'UPDATE_PAGE':
      if (!state.workspace) return state;
      
      const updatePageInSection = (section: Section): Section => ({
        ...section,
        pages: section.pages.map(page => 
          page.id === action.payload.id ? action.payload : page
        ),
        subsections: section.subsections?.map(sub => ({
          ...sub,
          pages: sub.pages.map(page => 
            page.id === action.payload.id ? action.payload : page
          )
        }))
      });

      const updatedSections = state.workspace.sections.map(updatePageInSection);
      
      return {
        ...state,
        workspace: { ...state.workspace, sections: updatedSections },
        currentPage: state.currentPage?.id === action.payload.id ? action.payload : state.currentPage
      };
    
    case 'ADD_COMMENT':
      return {
        ...state,
        comments: {
          ...state.comments,
          [action.payload.pageId]: [
            ...(state.comments[action.payload.pageId] || []),
            action.payload.comment
          ]
        }
      };
    
    case 'SET_FULL_SCREEN':
      return { ...state, isFullScreen: action.payload };
    
    case 'SET_EDITING_BLOCK':
      return { ...state, editingBlockId: action.payload };
    
    case 'TOGGLE_SECTION':
      return {
        ...state,
        expandedSections: state.expandedSections.includes(action.payload)
          ? state.expandedSections.filter(id => id !== action.payload)
          : [...state.expandedSections, action.payload]
      };
    
    case 'ADD_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: [...state.workspace.sections, action.payload]
        }
      };
    
    case 'UPDATE_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section =>
            section.id === action.payload.id ? action.payload : section
          )
        }
      };
    
    case 'DELETE_SECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.filter(section => section.id !== action.payload)
        }
      };

    case 'ADD_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: [...(section.subsections || []), action.payload.subsection]
              };
            }
            return section;
          })
        }
      };

    case 'UPDATE_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: section.subsections?.map(sub =>
                  sub.id === action.payload.subsection.id ? action.payload.subsection : sub
                )
              };
            }
            return section;
          })
        }
      };

    case 'DELETE_SUBSECTION':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              return {
                ...section,
                subsections: section.subsections?.filter(sub => sub.id !== action.payload.subsectionId)
              };
            }
            return section;
          })
        }
      };
    
    case 'ADD_PAGE':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => {
            if (section.id === action.payload.sectionId) {
              if (action.payload.subsectionId) {
                return {
                  ...section,
                  subsections: section.subsections?.map(sub =>
                    sub.id === action.payload.subsectionId
                      ? { ...sub, pages: [...sub.pages, action.payload.page] }
                      : sub
                  )
                };
              } else {
                return { ...section, pages: [...section.pages, action.payload.page] };
              }
            }
            return section;
          })
        }
      };
    
    case 'DELETE_PAGE':
      if (!state.workspace) return state;
      return {
        ...state,
        workspace: {
          ...state.workspace,
          sections: state.workspace.sections.map(section => ({
            ...section,
            pages: section.pages.filter(page => page.id !== action.payload.pageId),
            subsections: section.subsections?.map(sub => ({
              ...sub,
              pages: sub.pages.filter(page => page.id !== action.payload.pageId)
            }))
          }))
        },
        currentPage: state.currentPage?.id === action.payload.pageId ? null : state.currentPage
      };
    
    default:
      return state;
  }
};

const WorkspaceContext = createContext<{
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
} | null>(null);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
};