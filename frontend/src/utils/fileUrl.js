/**
 * Utility functions for file URLs and download endpoints
 */

export const getFileUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.startsWith('/') ? path : `/${path}`;
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

export const getCompletedModelDownloadUrl = (order, inline = false) => {
  if (!order || !order.id) return '';
  const token = localStorage.getItem('crm_token');
  const base = `/api/designs/${order.id}/completed-model`;
  const params = [];
  if (token) params.push(`token=${encodeURIComponent(token)}`);
  if (inline) params.push('view=1');
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
};
