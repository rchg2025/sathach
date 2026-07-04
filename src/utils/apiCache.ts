import axios from 'axios';
import { API_BASE_URL } from '../config';

let settingsPromise: Promise<any> | null = null;

export const fetchSettingsCached = () => {
  if (!settingsPromise) {
    settingsPromise = axios.get(`${API_BASE_URL}/api/manager/settings`)
      .then(res => res.data)
      .catch(err => {
        settingsPromise = null; // reset on error so it can retry
        throw err;
      });
  }
  return settingsPromise;
};

export const clearSettingsCache = () => {
  settingsPromise = null;
};
