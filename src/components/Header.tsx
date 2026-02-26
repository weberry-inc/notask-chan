'use client'

import { Search, Filter, Archive, Trash2 } from 'lucide-react'
import { useState } from 'react'

type HeaderProps = {
  assigneeFilter: string
  setAssigneeFilter: (val: string) => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  showArchived: boolean
  setShowArchived: (val: boolean) => void
  showDeleted: boolean
  setShowDeleted: (val: boolean) => void
  members: { id: string, displayName: string }[]
}

export default function Header(props: HeaderProps) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 700, background: 'linear-gradient(45deg, var(--primary), #85b8ff)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          Weberry Board
        </h1>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search tasks..."
            style={{ width: '100%', paddingLeft: '32px' }}
            value={props.searchQuery}
            onChange={(e) => props.setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Assignee Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-secondary)" />
          <select
            className="input"
            style={{ minWidth: '120px', cursor: 'pointer' }}
            value={props.assigneeFilter}
            onChange={(e) => props.setAssigneeFilter(e.target.value)}
          >
            <option value="all">全員 (All)</option>
            {props.members.map(m => (
              <option key={m.id} value={m.id}>{m.displayName}</option>
            ))}
            <option value="unassigned">未割当</option>
          </select>
        </div>

        {/* Toggles */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={props.showArchived}
            onChange={(e) => props.setShowArchived(e.target.checked)}
          />
          <Archive size={14} /> Archived
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={props.showDeleted}
            onChange={(e) => props.setShowDeleted(e.target.checked)}
          />
          <Trash2 size={14} /> Deleted
        </label>
      </div>
    </header>
  )
}
