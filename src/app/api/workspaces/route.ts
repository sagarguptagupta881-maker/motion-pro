// app/api/workspaces/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getConnection, setupDatabase, ensureDefaultWorkspace } from "@/lib/database";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// -------- Utils --------
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function safeParseJSON<T>(val: any, fallback: T): T {
  try {
    if (val == null) return fallback;
    if (typeof val === "string") return JSON.parse(val) as T;
    return (val as T) ?? fallback;
  } catch {
    return fallback;
  }
}

// Build nested page hierarchy
async function buildNestedPages(db: any, parentId: string | null, workspaceId: string, sectionId?: string, subsectionId?: string): Promise<any[]> {
  let query = `
    SELECT * FROM pages 
    WHERE workspace_id = ? AND parent_id ${parentId ? '= ?' : 'IS NULL'}
  `;
  
  const params: any[] = [workspaceId];
  if (parentId) params.push(parentId);
  
  if (sectionId) {
    query += ` AND section_id = ?`;
    params.push(sectionId);
  }
  
  if (subsectionId) {
    query += ` AND subsection_id = ?`;
    params.push(subsectionId);
  }
  
  query += ` ORDER BY page_order ASC, created_at ASC`;
  
  const [pageRows] = (await db.execute(query, params)) as [RowDataPacket[], any];
  
  const pages: any[] = [];
  
  for (const page of pageRows) {
    // Get content blocks for this page
    const [blockRows] = (await db.execute(
      `SELECT * FROM content_blocks
       WHERE page_id = ?
       ORDER BY block_order ASC`,
      [page.id]
    )) as [RowDataPacket[], any];
    
    // Recursively get nested pages
    const nestedPages = await buildNestedPages(db, page.id, workspaceId);
    
    pages.push({
      id: page.id,
      title: page.title,
      icon: page.icon,
      type: page.type,
      status: page.status,
      assignees: safeParseJSON<string[]>(page.assignees, []),
      deadline: page.deadline,
      properties: safeParseJSON<Record<string, any>>(page.properties, {}),
      parentId: page.parent_id,
      pageOrder: page.page_order,
      createdAt: page.created_at,
      updatedAt: page.updated_at,
      content: blockRows.map((block: any) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        metadata: safeParseJSON<Record<string, any>>(block.metadata, {}),
        order: block.block_order,
        createdAt: block.created_at,
        updatedAt: block.updated_at,
      })),
      nestedPages: nestedPages, // Child pages
    });
  }
  
  return pages;
}

// Build full nested workspace payload with nested pages
async function buildWorkspaceData(db: any, workspaceId: string) {
  // Workspace
  const [wsRows] = (await db.execute(
    "SELECT * FROM workspaces WHERE id = ?",
    [workspaceId]
  )) as [RowDataPacket[], any];

  if (wsRows.length === 0) return null;
  const workspace = wsRows[0];

  // Members
  const [memberRows] = (await db.execute(
    `SELECT id, name, email, avatar, role, created_at, updated_at
     FROM workspace_members
     WHERE workspace_id = ?
     ORDER BY created_at`,
    [workspaceId]
  )) as [RowDataPacket[], any];

  // Sections
  const [sectionRows] = (await db.execute(
    `SELECT * FROM sections
     WHERE workspace_id = ?
     ORDER BY section_order ASC`,
    [workspaceId]
  )) as [RowDataPacket[], any];

  const sections: any[] = [];

  for (const section of sectionRows) {
    // Subsections for this section
    const [subsectionRows] = (await db.execute(
      `SELECT * FROM subsections
       WHERE section_id = ?
       ORDER BY subsection_order ASC`,
      [section.id]
    )) as [RowDataPacket[], any];

    const subsections: any[] = [];

    for (const subsection of subsectionRows) {
      // Get nested pages for this subsection (only root level pages)
      const subsectionPages = await buildNestedPages(db, null, workspaceId, section.id, subsection.id);

      subsections.push({
        id: subsection.id,
        title: subsection.title,
        order: subsection.subsection_order,
        pages: subsectionPages,
      });
    }

    // Direct pages under section (no subsection) - only root level
    const directPages = await buildNestedPages(db, null, workspaceId, section.id);

    sections.push({
      id: section.id,
      title: section.title,
      icon: section.icon,
      order: section.section_order,
      pages: directPages,
      subsections,
    });
  }

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    createdAt: workspace.created_at,
    updatedAt: workspace.updated_at,
    members: memberRows.map((m: any) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      role: m.role,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })),
    sections,
  };
}

// Update page hierarchy and handle filename changes
async function updatePageHierarchy(db: any, pageId: string, updates: any) {
  const { title, parentId, pageOrder, ...otherUpdates } = updates;
  
  // If title changed, update any related filenames
  if (title) {
    // Update the page title and handle filename updates
    const sanitizedFileName = sanitizeFileName(title);
    
    // Update content blocks that might reference files
    const [blockRows] = (await db.execute(
      `SELECT id, metadata FROM content_blocks 
       WHERE page_id = ? AND type IN ('image', 'file')`,
      [pageId]
    )) as [RowDataPacket[], any];
    
    for (const block of blockRows) {
      const metadata = safeParseJSON<any>(block.metadata, {});
      if (metadata.originalFileName) {
        // Update filename while preserving extension
        const extension = metadata.originalFileName.split('.').pop();
        metadata.suggestedFileName = `${sanitizedFileName}.${extension}`;
        
        await db.execute(
          `UPDATE content_blocks SET metadata = ? WHERE id = ?`,
          [JSON.stringify(metadata), block.id]
        );
      }
    }
  }
  
  // Handle parent changes (for nested structure)
  if (parentId !== undefined) {
    // Validate parent exists and isn't a descendant
    if (parentId) {
      const isValidParent = await validatePageParent(db, pageId, parentId);
      if (!isValidParent) {
        throw new Error("Invalid parent: would create circular reference");
      }
    }
    
    // Recalculate page orders when moving between parents
    if (pageOrder === undefined) {
      const newOrder = await getNextPageOrder(db, parentId, pageId);
      otherUpdates.page_order = newOrder;
    }
  }
  
  // Build update query
  const updateFields: string[] = [];
  const updateValues: any[] = [];
  
  if (title !== undefined) {
    updateFields.push('title = ?');
    updateValues.push(title);
  }
  
  if (parentId !== undefined) {
    updateFields.push('parent_id = ?');
    updateValues.push(parentId);
  }
  
  if (pageOrder !== undefined || otherUpdates.page_order !== undefined) {
    updateFields.push('page_order = ?');
    updateValues.push(pageOrder || otherUpdates.page_order);
  }
  
  // Add other update fields
  Object.entries(otherUpdates).forEach(([key, value]) => {
    if (key !== 'page_order') {
      updateFields.push(`${key} = ?`);
      updateValues.push(value);
    }
  });
  
  if (updateFields.length > 0) {
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(pageId);
    
    await db.execute(
      `UPDATE pages SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  }
}

// Validate that parent page exists and won't create circular reference
async function validatePageParent(db: any, pageId: string, parentId: string): Promise<boolean> {
  // Check if parent exists
  const [parentExists] = (await db.execute(
    'SELECT id FROM pages WHERE id = ?',
    [parentId]
  )) as [RowDataPacket[], any];
  
  if (parentExists.length === 0) return false;
  
  // Check for circular reference by traversing up the tree
  let currentParent = parentId;
  const visited = new Set([pageId]);
  
  while (currentParent) {
    if (visited.has(currentParent)) return false; // Circular reference
    visited.add(currentParent);
    
    const [parent] = (await db.execute(
      'SELECT parent_id FROM pages WHERE id = ?',
      [currentParent]
    )) as [RowDataPacket[], any];
    
    currentParent = parent[0]?.parent_id || null;
  }
  
  return true;
}

// Get next page order for a parent
async function getNextPageOrder(db: any, parentId: string | null, excludePageId?: string): Promise<number> {
  const query = `
    SELECT COALESCE(MAX(page_order), 0) + 1 as next_order 
    FROM pages 
    WHERE parent_id ${parentId ? '= ?' : 'IS NULL'}
    ${excludePageId ? 'AND id != ?' : ''}
  `;
  
  const params: any[] = [];
  if (parentId) params.push(parentId);
  if (excludePageId) params.push(excludePageId);
  
  const [[result]] = (await db.execute(query, params)) as any;
  return result.next_order;
}

// Sanitize filename for safe storage
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase()
    .substring(0, 50); // Limit length
}

// -------- Handlers --------

// GET /api/workspaces
// - With ?id=... -> returns full workspace tree with nested pages
// - Without id   -> returns list of all workspaces (basic info)
export async function GET(request: NextRequest) {
  try {
    await setupDatabase();

    const db = await getConnection();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("id");

    if (workspaceId) {
      if (workspaceId === "default-workspace") {
        await ensureDefaultWorkspace();
      }

      const data = await buildWorkspaceData(db, workspaceId);
      if (!data) {
        console.error(`❌ Workspace not found: ${workspaceId}`);
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      }
      
      console.log(`✅ Successfully fetched workspace with nested pages: ${workspaceId}`);
      return NextResponse.json(data, { status: 200 });
    }

    // List all workspaces (basic info)
    const [rows] = (await db.execute(
      `SELECT id, name, description, created_at, updated_at
       FROM workspaces
       ORDER BY created_at DESC`
    )) as [RowDataPacket[], any];

    const list = rows.map((w: any) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));

    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error("❌ Error fetching workspaces:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}

// POST /api/workspaces
// Body: { 
//   name: string, 
//   description?: string, 
//   ownerName?: string, 
//   ownerEmail?: string,
//   page?: { // For creating nested pages
//     title: string,
//     parentId?: string,
//     sectionId?: string,
//     subsectionId?: string,
//     icon?: string,
//     type?: 'page' | 'database',
//     status?: 'Management' | 'Execution' | 'Inbox'
//   }
// }
export async function POST(request: NextRequest) {
  const db = await getConnection();
  const body = await request.json();
  const { name, description, ownerName, ownerEmail, page } = body || {};

  // Handle page creation
  if (page) {
    return await createNestedPage(db, page);
  }

  // Handle workspace creation
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
  }

  const workspaceId = generateUUID();

  try {
    await db.beginTransaction();

    // Create workspace
    await db.execute(
      `INSERT INTO workspaces (id, name, description)
       VALUES (?, ?, ?)`,
      [workspaceId, String(name).trim(), description || null]
    );

    // Owner member (optional)
    if (ownerName && ownerEmail) {
      const ownerId = generateUUID();
      await db.execute(
        `INSERT INTO workspace_members (id, workspace_id, name, email, role)
         VALUES (?, ?, ?, ?, 'owner')`,
        [ownerId, workspaceId, String(ownerName).trim(), String(ownerEmail).trim()]
      );
    }

    // Default sections + subsections
    const defaultSections = [
      { title: "Company Overview", icon: "🏢", order: 1 },
      { title: "Marketing",        icon: "📈", order: 2 },
      { title: "BD & Sales",       icon: "💼", order: 3 },
      { title: "HR & Operation",   icon: "👥", order: 4 },
    ];

    for (const s of defaultSections) {
      const sectionId = generateUUID();
      await db.execute(
        `INSERT INTO sections (id, workspace_id, title, icon, section_order)
         VALUES (?, ?, ?, ?, ?)`,
        [sectionId, workspaceId, s.title, s.icon, s.order]
      );

      const defaultSubsections = [
        { title: "Management", order: 1 },
        { title: "Execution",  order: 2 },
        { title: "Inbox",      order: 3 },
      ];

      for (const sub of defaultSubsections) {
        const subsectionId = generateUUID();
        await db.execute(
          `INSERT INTO subsections (id, section_id, title, subsection_order)
           VALUES (?, ?, ?, ?)`,
          [subsectionId, sectionId, sub.title, sub.order]
        );
      }
    }

    await db.commit();

    const created = await buildWorkspaceData(db, workspaceId);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    await db.rollback();
    console.error("❌ Error creating workspace:", error);
    return NextResponse.json(
      {
        error: "Failed to create workspace",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}

// Create nested page
async function createNestedPage(db: any, pageData: any) {
  const { 
    title, 
    parentId, 
    workspaceId, 
    sectionId, 
    subsectionId, 
    icon = '📄', 
    type = 'page',
    status,
    assignees = [],
    properties = {}
  } = pageData;

  if (!title || !workspaceId) {
    return NextResponse.json({ 
      error: "Page title and workspace ID are required" 
    }, { status: 400 });
  }

  try {
    const pageId = generateUUID();
    const pageOrder = await getNextPageOrder(db, parentId || null);

    await db.execute(
      `INSERT INTO pages (
        id, workspace_id, section_id, subsection_id, parent_id,
        title, icon, type, status, assignees, properties, page_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pageId,
        workspaceId,
        sectionId || null,
        subsectionId || null,
        parentId || null,
        title,
        icon,
        type,
        status || null,
        JSON.stringify(assignees),
        JSON.stringify(properties),
        pageOrder
      ]
    );

    // Get created page with nested structure
    const createdPage = await buildNestedPages(db, parentId || null, workspaceId, sectionId, subsectionId);
    const newPage = createdPage.find(p => p.id === pageId);

    return NextResponse.json(newPage, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating nested page:", error);
    return NextResponse.json(
      {
        error: "Failed to create page",
        details: process.env.NODE_ENV === "development" ? (error as Error).message : undefined,
      },
      { status: 500 }
    );
  }
}

// PUT /api/workspaces
// Body: { 
//   id: string, 
//   name?: string, 
//   description?: string,
//   pageUpdate?: {
//     pageId: string,
//     title?: string,
//     parentId?: string,
//     pageOrder?: number,
//     status?: string,
//     assignees?: string[],
//     properties?: Record<string, any>
//   }
// }
export async function PUT(request: NextRequest) {
  const db = await getConnection();
  const body = await request.json();
  const { id, name, description, pageUpdate } = body || {};

  if (!id) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
  }

  try {
    // Handle page updates
    if (pageUpdate) {
      const { pageId, ...updates } = pageUpdate;
      
      if (!pageId) {
        return NextResponse.json({ error: "Page ID is required for page updates" }, { status: 400 });
      }

      await updatePageHierarchy(db, pageId, updates);
      
      // Return updated workspace data
      const updated = await buildWorkspaceData(db, id);
      return NextResponse.json(updated, { status: 200 });
    }

    // Handle workspace updates
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const [existing] = (await db.execute(
      `SELECT id FROM workspaces WHERE id = ?`,
      [id]
    )) as [RowDataPacket[], any];

    if (existing.length === 0) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [result] = (await db.execute(
      `UPDATE workspaces
       SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [String(name).trim(), description || null, id]
    )) as [ResultSetHeader, any];

    if ((result as ResultSetHeader).affectedRows === 0) {
      return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }

    const updated = await buildWorkspaceData(db, id);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating workspace/page:", error);
    return NextResponse.json(
      {
        error: "Failed to update",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces?id=...&pageId=... (for deleting pages)
export async function DELETE(request: NextRequest) {
  const db = await getConnection();
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("id");
  const pageId = searchParams.get("pageId");

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
  }

  try {
    // Delete specific page (and all its nested pages)
    if (pageId) {
      const [existing] = (await db.execute(
        `SELECT id, title FROM pages WHERE id = ? AND workspace_id = ?`,
        [pageId, workspaceId]
      )) as [RowDataPacket[], any];

      if (existing.length === 0) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      // Delete page and all its nested pages (CASCADE will handle content_blocks)
      await deletePageAndChildren(db, pageId);

      return NextResponse.json(
        {
          success: true,
          message: `Page "${existing[0].title}" and all nested pages deleted`,
        },
        { status: 200 }
      );
    }

    // Delete entire workspace
    const [existing] = (await db.execute(
      `SELECT id, name FROM workspaces WHERE id = ?`,
      [workspaceId]
    )) as [RowDataPacket[], any];

    if (existing.length === 0) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Stats before deletion
    const [[{ count: sectionsCount }]] = (await db.execute(
      `SELECT COUNT(*) AS count FROM sections WHERE workspace_id = ?`,
      [workspaceId]
    )) as any;

    const [[{ count: pagesCount }]] = (await db.execute(
      `SELECT COUNT(*) AS count FROM pages WHERE workspace_id = ?`,
      [workspaceId]
    )) as any;

    const [res] = (await db.execute(
      `DELETE FROM workspaces WHERE id = ?`,
      [workspaceId]
    )) as [ResultSetHeader, any];

    if ((res as ResultSetHeader).affectedRows === 0) {
      return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Workspace "${existing[0].name}" and related data deleted`,
        deletedCounts: { sections: sectionsCount, pages: pagesCount },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error deleting workspace/page:", error);
    return NextResponse.json(
      {
        error: "Failed to delete",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}

// Recursively delete page and all its children
async function deletePageAndChildren(db: any, pageId: string): Promise<void> {
  // Get all child pages
  const [children] = (await db.execute(
    'SELECT id FROM pages WHERE parent_id = ?',
    [pageId]
  )) as [RowDataPacket[], any];

  // Recursively delete children first
  for (const child of children) {
    await deletePageAndChildren(db, child.id);
  }

  // Delete the page itself (CASCADE will handle content_blocks and comments)
  await db.execute('DELETE FROM pages WHERE id = ?', [pageId]);
}