export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  PENDING_VERIFICATION: 'Pending verification',
  DELETED: 'Deleted',
};

/** Statuses shown in filters, in the order people think about them. */
export const USER_STATUS_FILTERS: ReadonlyArray<{ value: UserStatus; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'PENDING_VERIFICATION', label: 'Pending verification' },
];

export function userStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return '—';
  }
  return USER_STATUS_LABELS[status] ?? status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Badge tone for a user status: green for active, red for blocked, amber for the rest. */
export function userStatusTone(status: string | null | undefined): 'ok' | 'warn' | 'fail' {
  if (status === 'ACTIVE') {
    return 'ok';
  }
  return status === 'SUSPENDED' || status === 'DELETED' ? 'fail' : 'warn';
}

/** Provider names as people read them. */
export function emailProviderLabel(provider: string | null | undefined): string {
  if (provider === 'smtp') {
    return 'SMTP';
  }
  if (provider === 'console') {
    return 'Not delivering (log only)';
  }
  return provider || '—';
}

export function storageProviderLabel(provider: string | null | undefined): string {
  const labels: Record<string, string> = {
    local: 'Server disk',
    cloudinary: 'Cloudinary',
    s3: 'Amazon S3',
    azure: 'Azure Blob',
    gcs: 'Google Cloud Storage',
  };
  return (provider && labels[provider]) || provider || '—';
}
