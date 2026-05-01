// Zustand store for QR scanner state management

import { create } from 'zustand';
import {
  QRScan,
  getScans,
  addScan,
  deleteScan,
  deleteAllScans,
  searchScans,
} from './qr-utils';

interface QRStoreState {
  scans: QRScan[];
  filteredScans: QRScan[];
  searchQuery: string;
  isScanning: boolean;
  isScannerActive: boolean;
  lastScannedValue: string | null;
  error: string | null;
  lastScanSuccess: boolean;

  // Actions
  loadScans: () => void;
  addNewScan: (value: string) => boolean;
  removeScan: (id: string) => void;
  removeAllScans: () => void;
  setSearchQuery: (query: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsScannerActive: (active: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearLastScanSuccess: () => void;
}

export const useQRStore = create<QRStoreState>((set, get) => ({
  scans: [],
  filteredScans: [],
  searchQuery: '',
  isScanning: false,
  isScannerActive: false,
  lastScannedValue: null,
  error: null,
  lastScanSuccess: false,

  loadScans: () => {
    const scans = getScans();
    set({ scans, filteredScans: scans, searchQuery: '' });
  },

  addNewScan: (value: string) => {
    const newScan = addScan(value);
    if (newScan) {
      const scans = getScans();
      set({
        scans,
        filteredScans: scans,
        lastScannedValue: value,
        error: null,
        lastScanSuccess: true,
      });
      return true;
    }
    return false;
  },

  removeScan: (id: string) => {
    deleteScan(id);
    const scans = getScans();
    const { searchQuery } = get();
    const filteredScans =
      searchQuery.length > 0 ? searchScans(searchQuery) : scans;
    set({ scans, filteredScans });
  },

  removeAllScans: () => {
    deleteAllScans();
    set({
      scans: [],
      filteredScans: [],
      searchQuery: '',
      lastScannedValue: null,
    });
  },

  setSearchQuery: (query: string) => {
    const scans = getScans();
    const filteredScans = query.length > 0 ? searchScans(query) : scans;
    set({ searchQuery: query, filteredScans });
  },

  setIsScanning: (scanning: boolean) => {
    set({ isScanning: scanning });
  },

  setIsScannerActive: (active: boolean) => {
    set({ isScannerActive: active });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  clearLastScanSuccess: () => {
    set({ lastScanSuccess: false });
  },
}));
