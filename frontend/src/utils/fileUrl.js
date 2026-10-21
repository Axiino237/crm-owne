/**
 * Utility functions for file URLs, download endpoints, and format detection
 */

export const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
};

export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const getRequirementDocDownloadUrl = (order, inline = false) => {
  if (!order || !order.id) return '';
  const token = localStorage.getItem('crm_token');
  const base = `/api/designs/${order.id}/requirement-doc`;
  const params = [];
  if (token) params.push(`token=${encodeURIComponent(token)}`);
  if (inline) params.push('view=1');
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
};

export const getCompletedModelDownloadUrl = (order, inline = false, fileIndex = null) => {
  if (!order || !order.id) return '';
  const token = localStorage.getItem('crm_token');
  const base = `/api/designs/${order.id}/completed-model`;
  const params = [];
  if (token) params.push(`token=${encodeURIComponent(token)}`);
  if (inline) params.push('view=1');
  if (fileIndex !== null && fileIndex !== undefined) params.push(`fileIndex=${fileIndex}`);
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
};

export const getCompletedFileInfo = (filename = '', ext = '') => {
  const extension = (ext || filename.split('.').pop() || '').toLowerCase();

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
    return {
      type: 'Image Render',
      label: extension.toUpperCase(),
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      isImage: true
    };
  }
  if (extension === 'mp4') {
    return {
      type: 'Video Walkthrough',
      label: 'MP4 VIDEO',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      isVideo: true
    };
  }
  if (['glb', 'gltf', 'obj', 'fbx', 'stl'].includes(extension)) {
    return {
      type: '3D Design Model',
      label: extension.toUpperCase() + ' 3D',
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      is3D: true
    };
  }
  if (extension === 'cdr') {
    return {
      type: 'CorelDRAW Artwork',
      label: 'CDR VECTOR',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      isCdr: true
    };
  }
  if (extension === 'pdf') {
    return {
      type: 'PDF Document',
      label: 'PDF',
      color: '#f43f5e',
      bg: 'rgba(244, 63, 94, 0.12)',
      isPdf: true
    };
  }
  if (['zip', 'rar', '7z'].includes(extension)) {
    return {
      type: 'Archive Package',
      label: extension.toUpperCase(),
      color: '#eab308',
      bg: 'rgba(234, 179, 8, 0.12)',
      isZip: true
    };
  }
  return {
    type: 'Design File',
    label: extension.toUpperCase() || 'FILE',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)'
  };
};
