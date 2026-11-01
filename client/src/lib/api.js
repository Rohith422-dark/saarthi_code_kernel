import axios from 'axios';

export const api = axios.create({ baseURL: '/api', timeout: 10000 });

/** The bearer token for the signed-in user; the server decides who they are and what they may see. */
export function setToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

/** Files are behind sign-in, so fetch with the token and save the blob. */
export async function downloadFile(id, name) {
  const { data } = await api.get(`/files/${id}`, { responseType: 'blob', timeout: 60000 });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errorText = (e) =>
  e.response?.data?.error || (e.code === 'ERR_NETWORK' ? 'Cannot reach the Saarthi server. Is it running?' : e.message);
