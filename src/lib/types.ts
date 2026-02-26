export type Workspace = {
  id: string;
  name: string;
}

export type Member = {
  id: string;
  workspaceId: string;
  displayName: string;
}

export type Board = {
  id: string;
  workspaceId: string;
  title: string;
  orderIndex: number;
}

export type Task = {
  id: string;
  workspaceId: string;
  boardId: string;
  title: string;
  description: string | null;
  assigneeMemberId: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  orderIndex: number;

  assignee?: Member | null;
}
