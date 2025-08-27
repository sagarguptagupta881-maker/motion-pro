export interface ContentBlock {
  id: string;
  type: 'text' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'quote' | 'code' | 'divider' | 'image' | 'table' | 'checklist';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageItem {
  id: string;
  title: string;
  icon: string;
  type: 'page' | 'database';
  parentId?: string;
  status?: 'Management' | 'Execution' | 'Inbox';
  assignees?: string[];
  deadline?: string;
  content?: ContentBlock[];
  properties?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  pageId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Subsection {
  id: string;
  title: string;
  pages: PageItem[];
  order: number;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  pages: PageItem[];
  subsections?: Subsection[];
  order: number;
}

export interface Workspace {
  id: string;
  name: string;
  sections: Section[];
  members: WorkspaceMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
}

export type BlockType = ContentBlock['type'];